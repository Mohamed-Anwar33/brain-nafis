// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Declare Deno for TypeScript environment
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Question {
  id: string;
  text: string;
  image_url?: string;
}

interface Choice {
  id: string;
  question_id: string;
  text: string;
  is_correct?: boolean;
  image_url?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { student_name } = await req.json();

    // Validate student name (at least 4 words)
    const words = (student_name || "").trim().split(/\s+/).filter((w: string) => w.length > 0);
    if (words.length < 4) {
      return new Response(
        JSON.stringify({ error: "يرجى إدخال الاسم الرباعي كاملاً (4 كلمات على الأقل)" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch Settings
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("exam_question_count")
      .eq("id", 1)
      .single();

    if (settingsError || !settings) throw new Error("Failed to fetch settings");

    const N = settings.exam_question_count;

    // Validate N
    if (N < 5 || N > 100) {
      return new Response(
        JSON.stringify({ error: "عدد الأسئلة غير صالح" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call RPC to get random questions
    const { data: selectedQuestions, error: questionsError } = await supabase
      .rpc('get_random_questions', { limit_count: N });

    if (questionsError || !selectedQuestions) throw new Error("Failed to fetch questions via RPC");

    if (selectedQuestions.length < N) {
      return new Response(
        JSON.stringify({ error: `لا يوجد عدد كافٍ من الأسئلة النشطة. المطلوب: ${N}, المتاح: ${selectedQuestions.length}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parallel Step 2: Create Attempt and Fetch Choices
    const questionIds = selectedQuestions.map((q: Question) => q.id);

    // Create attempt
    const attemptPromise = supabase
      .from("attempts")
      .insert({
        student_name: student_name.trim(),
        question_count: N,
        score: N,
        total_penalty: 0,
      })
      .select()
      .single();

    // Fetch choices with image_url
    const choicesPromise = supabase
      .from("choices")
      .select("id, question_id, text, is_correct, image_url")
      .in("question_id", questionIds);

    const [attemptResult, choicesResult] = await Promise.all([attemptPromise, choicesPromise]);

    const { data: attempt, error: attemptError } = attemptResult;
    const { data: allChoices, error: choicesError } = choicesResult;

    if (attemptError || !attempt) throw new Error("Failed to create attempt");
    if (choicesError) throw new Error("Failed to fetch choices");

    // Insert attempt_questions
    const attemptQuestionsToInsert = selectedQuestions.map((q: Question, index: number) => ({
      attempt_id: attempt.id,
      question_id: q.id,
      order_index: index,
    }));

    const { error: aqError } = await supabase
      .from("attempt_questions")
      .insert(attemptQuestionsToInsert);

    if (aqError) throw new Error("Failed to create attempt questions");

    // Build response
    const questionsWithChoices = selectedQuestions.map((q: Question, index: number) => ({
      id: q.id,
      text: q.text,
      image_url: q.image_url,
      order_index: index,
      choices: (allChoices as Choice[] || [])
        .filter((c: Choice) => c.question_id === q.id)
        .map((c: Choice) => ({
          id: c.id,
          text: c.text,
          is_correct: c.is_correct,
          image_url: c.image_url
        })),
    }));

    return new Response(
      JSON.stringify({
        attempt_id: attempt.id,
        student_name: attempt.student_name,
        question_count: N,
        score: N,
        questions: questionsWithChoices,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in exam-start:", error);
    return new Response(
      JSON.stringify({ error: "حدث خطأ أثناء بدء الاختبار" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
