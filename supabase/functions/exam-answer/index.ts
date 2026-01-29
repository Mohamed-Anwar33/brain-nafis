import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pre-initialize client at module level for faster cold starts
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { attempt_id, question_id, selected_choice_id } = await req.json();

    if (!attempt_id || !question_id || !selected_choice_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use RPC for atomic and fast validation
    const { data: result, error: rpcError } = await supabase.rpc("verify_exam_answer", {
      p_attempt_id: attempt_id,
      p_question_id: question_id,
      p_selected_choice_id: selected_choice_id,
    });

    if (rpcError) {
      console.error("RPC Error:", rpcError);
      throw new Error("Failed to verify answer via RPC");
    }

    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        correct: result.correct,
        score: result.score,
        wrong_count: result.wrong_count,
        penalty_applied: result.penalty_applied,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in exam-answer:", error);
    return new Response(
      JSON.stringify({ error: "حدث خطأ أثناء حفظ الإجابة" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
