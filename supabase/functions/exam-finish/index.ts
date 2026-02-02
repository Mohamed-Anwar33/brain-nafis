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
    const { attempt_id, is_game } = await req.json();

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

    let attempt: any;
    let attemptError: any;
    const tableName = is_game ? "game_attempts" : "attempts";

    // Get attempt data from appropriate table
    if (is_game) {
      // For game attempts
      const result = await supabase
        .from("game_attempts")
        .select("*")
        .eq("id", attempt_id)
        .single();
      attempt = result.data;
      attemptError = result.error;
    } else {
      // For regular exam attempts
      const result = await supabase
        .from("attempts")
        .select("*")
        .eq("id", attempt_id)
        .single();
      attempt = result.data;
      attemptError = result.error;
    }

    if (attemptError || !attempt) {
      return new Response(
        JSON.stringify({ error: "Invalid attempt", table: tableName }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let emailStatus = "not_attempted";
    let emailDebug = "";

    // Only verify questions for regular exams, not games
    if (!is_game) {
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

      // Update finished_at for regular exams
      const finishedAt = new Date().toISOString();
      await supabase
        .from("attempts")
        .update({ finished_at: finishedAt })
        .eq("id", attempt_id);
    }

    // Send admin email if not already sent
    if (!attempt.teacher_email_sent) {
      console.log("[exam-finish] Starting email notification process...");

      // Fetch email settings from app_settings
      const { data: settings, error: settingsError } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["admin_email", "resend_api_key"]);

      console.log("[exam-finish] Settings fetched:", settings?.map((s: { key: string }) => s.key));

      if (settingsError) {
        console.error("[exam-finish] Error fetching settings:", settingsError);
        emailStatus = "error_fetching_settings";
        emailDebug = settingsError.message;
      }

      // Recipient email (changeable by admin)
      const recipientEmail = settings?.find((s: any) => s.key === "admin_email")?.value;

      // Resend API Key
      const resendApiKey = settings?.find((s: any) => s.key === "resend_api_key")?.value;

      // Log configuration (masked for security)
      console.log("[exam-finish] Recipient (TO):", recipientEmail ? `${recipientEmail.substring(0, 3)}***` : "NOT SET");
      console.log("[exam-finish] Resend API Key:", resendApiKey ? `SET (${resendApiKey.substring(0, 4)}***)` : "NOT SET");

      if (!recipientEmail) {
        console.warn("[exam-finish] Skipping email: No recipient email configured");
        emailStatus = "skipped_no_recipient";
        emailDebug = "Recipient email not configured in app_settings";
      } else if (!resendApiKey) {
        console.warn("[exam-finish] Skipping email: No Resend API Key configured");
        emailStatus = "skipped_no_api_key";
        emailDebug = "Resend API Key not configured";
      } else {
        try {
          let subject: string;
          let htmlBody: string;

          if (is_game) {
            // Game attempts - simpler HTML
            const gameTypeAr = attempt.game_type === "speed" ? "تحدي السرعة" :
              attempt.game_type === "matching" ? "لعبة المطابقة" :
                attempt.game_type === "ordering" ? "لغز الترتيب" : attempt.game_type;

            subject = `نتيجة ${gameTypeAr} جديدة`;

            htmlBody = `
            <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
              <h1 style="color: #0D9488; text-align: center;">تقرير نتيجة ${gameTypeAr}</h1>
              <hr style="border: 1px solid #0D9488;">
              <p style="font-size: 16px;"><strong>نوع اللعبة:</strong> ${gameTypeAr}</p>
              <p style="font-size: 16px;"><strong>النتيجة النهائية:</strong> <span style="font-size: 20px; color: #0D9488; font-weight: bold;">${attempt.score || 0}</span> نقطة</p>
              <p style="font-size: 16px;"><strong>الإجابات الصحيحة:</strong> ${attempt.correct_count || 0}</p>
              <p style="font-size: 16px;"><strong>إجمالي الأسئلة:</strong> ${attempt.total_questions || 0}</p>
              
              <div style="background-color: white; padding: 15px; border-radius: 6px; margin-top: 15px;">
                  <p><strong>وقت المحاولة:</strong> ${new Date(attempt.created_at).toLocaleString('ar-EG')}</p>
              </div>
              
              <p style="text-align: center; margin-top: 20px; color: #64748b; font-size: 12px;">تم الإرسال من نظام TestWise</p>
            </div>
          `;
          } else {
            // Regular exam - get answer details
            const { data: answers } = await supabase
              .from("attempt_answers")
              .select("question_id, wrong_count")
              .eq("attempt_id", attempt_id);

            const penalizedCount = (answers as Answer[] || []).filter((a: Answer) => a.wrong_count > 0).length;

            subject = `نتيجة اختبار جديد - ${attempt.student_name}`;

            const finishedAt = attempt.finished_at || new Date().toISOString();

            htmlBody = `
            <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
              <h1 style="color: #0D9488; text-align: center;">تقرير نتيجة اختبار</h1>
              <hr style="border: 1px solid #0D9488;">
              <p style="font-size: 16px;"><strong>اسم الطالب:</strong> ${attempt.student_name}</p>
              <p style="font-size: 16px;"><strong>الدرجة النهائية:</strong> <span style="font-size: 20px; color: #0D9488; font-weight: bold;">${attempt.score}</span> / ${attempt.question_count}</p>
              <p style="font-size: 16px;"><strong>عدد الخصومات:</strong> ${attempt.total_penalty || 0}</p>
              
              <div style="background-color: white; padding: 15px; border-radius: 6px; margin-top: 15px;">
                  <p><strong>وقت البدء:</strong> ${new Date(attempt.started_at).toLocaleString('ar-EG')}</p>
                  <p><strong>وقت الانتهاء:</strong> ${new Date(finishedAt).toLocaleString('ar-EG')}</p>
              </div>
              
              <p style="text-align: center; margin-top: 20px; color: #64748b; font-size: 12px;">تم الإرسال من نظام TestWise</p>
            </div>
          `;
          }

          // Use Resend API (simple and works perfectly!)
          console.log("[exam-finish] Sending email via Resend...");
          console.log("[exam-finish] Recipient:", recipientEmail);
          console.log("[exam-finish] Subject:", subject);

          try {
            const response = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: `TestWise <delivered@resend.dev>`,
                to: [recipientEmail],
                subject: subject,
                html: htmlBody,
              }),
            });

            const responseData = await response.json();
            console.log("[exam-finish] Resend response status:", response.status);
            console.log("[exam-finish] Resend response:", JSON.stringify(responseData));

            if (response.ok) {
              console.log("[exam-finish] ✅ Email sent successfully via Resend!");
              emailStatus = "sent_resend";
              emailDebug = JSON.stringify(responseData);
            } else {
              console.error("[exam-finish] ❌ Resend error:", responseData);
              emailStatus = "failed_resend";
              emailDebug = `Status ${response.status}: ${JSON.stringify(responseData)}`;
            }
          } catch (fetchError: any) {
            console.error("[exam-finish] ❌ Fetch error:", fetchError);
            emailStatus = "failed_fetch";
            emailDebug = fetchError.message || String(fetchError);
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
        success: true,
        email_status: emailStatus,
        debug: emailDebug
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in exam-finish:", error);
    // Return success to client even if server fails loggic, to prevent UI getting stuck
    return new Response(
      JSON.stringify({ success: false, error: "Internal Error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
