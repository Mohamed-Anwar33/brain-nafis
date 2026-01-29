// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Declare Deno for TypeScript environment
declare const Deno: any;

interface Answer {
  question_id: string;
  wrong_count: number;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { attempt_id } = await req.json();

    if (!attempt_id) {
      return new Response(
        JSON.stringify({ error: "Missing attempt_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get attempt data
    const { data: attempt, error: attemptError } = await supabase
      .from("attempts")
      .select("*")
      .eq("id", attempt_id)
      .single();

    if (attemptError || !attempt) {
      return new Response(
        JSON.stringify({ error: "Invalid attempt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify all questions are answered correctly
    const { data: attemptQuestions } = await supabase
      .from("attempt_questions")
      .select("question_id")
      .eq("attempt_id", attempt_id);

    const { data: studentAnswers } = await supabase
      .from("attempt_answers")
      .select("question_id")
      .eq("attempt_id", attempt_id);

    if (!attemptQuestions || !studentAnswers) {
      throw new Error("Failed to verify answers");
    }

    if (studentAnswers.length < attemptQuestions.length) {
      return new Response(
        JSON.stringify({ error: "لم يتم الإجابة على جميع الأسئلة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update finished_at
    const finishedAt = new Date().toISOString();
    await supabase
      .from("attempts")
      .update({ finished_at: finishedAt })
      .eq("id", attempt_id);

    let emailStatus = "not_attempted";
    let emailDebug = "";

    // Send teacher email if not already sent
    if (!attempt.teacher_email_sent) {
      // Fetch notification email from settings
      const { data: settings } = await supabase
        .from("settings")
        .select("notification_email")
        .eq("id", 1)
        .single();

      const teacherEmail = settings?.notification_email; // Use DB setting
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");

      if (!teacherEmail) {
        emailStatus = "skipped_no_email_setting";
      } else if (!resendApiKey && !sendgridApiKey) {
        emailStatus = "skipped_no_api_keys";
      } else {
        try {
          // Get answer details for breakdown
          const { data: answers } = await supabase
            .from("attempt_answers")
            .select("question_id, wrong_count")
            .eq("attempt_id", attempt_id);

          const penalizedCount = (answers as Answer[] || []).filter((a: Answer) => a.wrong_count > 0).length;

          const subject = `نتيجة اختبار جديد - ${attempt.student_name} - ${attempt.score}/${attempt.question_count}`;

          const htmlBody = `
            <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
              <h1 style="color: #0D9488;">نتيجة اختبار جديد</h1>
              <hr>
              <p><strong>اسم الطالب:</strong> ${attempt.student_name}</p>
              <p><strong>النتيجة:</strong> <span style="font-size: 24px; color: #0D9488; font-weight: bold;">${attempt.score}/${attempt.question_count}</span></p>
              <p><strong>عدد الأسئلة التي تم الخصم عليها:</strong> ${penalizedCount}</p>
              <p><strong>إجمالي الخصومات:</strong> ${attempt.total_penalty}</p>
              <hr>
              <p><strong>وقت البدء:</strong> ${new Date(attempt.started_at).toLocaleString('ar-EG')}</p>
              <p><strong>وقت الانتهاء:</strong> ${new Date(finishedAt).toLocaleString('ar-EG')}</p>
            </div>
          `;

          if (resendApiKey) {
            // Use Resend
            const response = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: "Test Bank <onboarding@resend.dev>",
                to: [teacherEmail],
                subject,
                html: htmlBody,
              }),
            });

            if (response.ok) {
              emailStatus = "sent_resend";
            } else {
              const errorText = await response.text();
              console.error("Resend error:", errorText);
              emailStatus = "failed_resend";
              emailDebug = errorText;
            }
          } else if (sendgridApiKey) {
            // Use SendGrid
            const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${sendgridApiKey}`,
              },
              body: JSON.stringify({
                personalizations: [{ to: [{ email: teacherEmail }] }],
                from: { email: "noreply@example.com", name: "Test Bank" },
                subject,
                content: [{ type: "text/html", value: htmlBody }],
              }),
            });

            if (response.ok) {
              emailStatus = "sent_sendgrid";
            } else {
              const errorText = await response.text();
              console.error("SendGrid error:", errorText);
              emailStatus = "failed_sendgrid";
              emailDebug = errorText;
            }
          }

          if (emailStatus.startsWith("sent")) {
            // Mark email as sent
            await supabase
              .from("attempts")
              .update({ teacher_email_sent: true })
              .eq("id", attempt_id);
          }
        } catch (emailError: any) {
          console.error("Error sending email:", emailError);
          emailStatus = "exception";
          emailDebug = emailError.message || String(emailError);
        }
      }
    } else {
      emailStatus = "already_sent";
    }

    return new Response(
      JSON.stringify({
        student_name: attempt.student_name,
        score: attempt.score,
        question_count: attempt.question_count,
        total_penalty: attempt.total_penalty,
        started_at: attempt.started_at,
        finished_at: finishedAt,
        email_status: emailStatus,
        email_debug: emailDebug
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in exam-finish:", error);
    return new Response(
      JSON.stringify({ error: "حدث خطأ أثناء إنهاء الاختبار" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
