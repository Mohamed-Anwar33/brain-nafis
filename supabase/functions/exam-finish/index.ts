// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

declare const Deno: any;

interface Answer {
  question_id: string;
  wrong_count: number;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const gameTypeLabels: Record<string, string> = {
  speed: "تحدي السرعة",
  matching: "لعبة المطابقة",
  ordering: "لغز الترتيب",
  stages: "لعبة ترتيب المراحل",
  wheel_science: "عجلة العلوم الدوارة",
  central_exam: "الاختبار المركزي الشامل",
};

const getText = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const getNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const getMetadata = (attempt: any) =>
  attempt?.metadata && typeof attempt.metadata === "object" ? attempt.metadata : {};

const getGameLabel = (attempt: any) => {
  const metadata = getMetadata(attempt);
  return (
    getText(metadata.game_name) ||
    gameTypeLabels[getText(attempt?.game_type)] ||
    getText(attempt?.game_type, "اللعبة")
  );
};

const buildGameEmail = (attempt: any) => {
  const metadata = getMetadata(attempt);
  const studentName = getText(attempt.student_name, "طالب");
  const gameLabel = getGameLabel(attempt);
  const isSectionResult = metadata.is_section_result === true;

  if (isSectionResult) {
    const sectionName = getText(metadata.section_name, "قسم غير محدد");
    const sectionScore = getNumber(metadata.section_score, getNumber(attempt.score));
    const sectionCorrect = getNumber(metadata.section_correct, getNumber(attempt.correct_count));
    const sectionWrong = getNumber(metadata.section_wrong);
    const sectionTotal = getNumber(metadata.section_total, getNumber(attempt.total_questions));
    const percentage =
      getNumber(metadata.percentage) ||
      (sectionTotal > 0 ? Math.round((sectionCorrect / sectionTotal) * 100) : 0);

    return {
      subject: `نتيجة قسم ${sectionName} - ${studentName}`,
      htmlBody: `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
          <h1 style="color: #0D9488; text-align: center;">تقرير نتيجة قسم ${sectionName}</h1>
          <hr style="border: 1px solid #0D9488;">
          <p style="font-size: 16px;"><strong>اسم الطالب:</strong> ${studentName}</p>
          <p style="font-size: 16px;"><strong>النشاط:</strong> ${gameLabel}</p>
          <p style="font-size: 16px;"><strong>القسم:</strong> ${sectionName}</p>
          <p style="font-size: 16px;"><strong>درجة القسم:</strong> <span style="font-size: 20px; color: #0D9488; font-weight: bold;">${sectionScore}</span></p>
          <p style="font-size: 16px;"><strong>الإجابات الصحيحة:</strong> ${sectionCorrect}</p>
          <p style="font-size: 16px;"><strong>الإجابات الخاطئة:</strong> ${sectionWrong}</p>
          <p style="font-size: 16px;"><strong>إجمالي الأسئلة:</strong> ${sectionTotal}</p>
          <p style="font-size: 16px;"><strong>النسبة:</strong> ${percentage}%</p>
          <div style="background-color: white; padding: 15px; border-radius: 6px; margin-top: 15px;">
            <p><strong>وقت المحاولة:</strong> ${new Date(attempt.created_at).toLocaleString("ar-EG")}</p>
          </div>
          <p style="text-align: center; margin-top: 20px; color: #64748b; font-size: 12px;">تم الإرسال من نظام TestWise</p>
        </div>
      `,
    };
  }

  const totalQuestions = getNumber(attempt.total_questions);
  const correctCount = getNumber(attempt.correct_count);
  const percentage =
    getNumber(metadata.percentage) ||
    (totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0);

  return {
    subject: `نتيجة ${gameLabel} - ${studentName}`,
    htmlBody: `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
        <h1 style="color: #0D9488; text-align: center;">تقرير نتيجة ${gameLabel}</h1>
        <hr style="border: 1px solid #0D9488;">
        <p style="font-size: 16px;"><strong>اسم الطالب:</strong> ${studentName}</p>
        <p style="font-size: 16px;"><strong>النشاط:</strong> ${gameLabel}</p>
        <p style="font-size: 16px;"><strong>النتيجة النهائية:</strong> <span style="font-size: 20px; color: #0D9488; font-weight: bold;">${getNumber(attempt.score)}</span></p>
        <p style="font-size: 16px;"><strong>الإجابات الصحيحة:</strong> ${correctCount}</p>
        <p style="font-size: 16px;"><strong>إجمالي الأسئلة:</strong> ${totalQuestions}</p>
        <p style="font-size: 16px;"><strong>النسبة:</strong> ${percentage}%</p>
        <div style="background-color: white; padding: 15px; border-radius: 6px; margin-top: 15px;">
          <p><strong>وقت المحاولة:</strong> ${new Date(attempt.created_at).toLocaleString("ar-EG")}</p>
        </div>
        <p style="text-align: center; margin-top: 20px; color: #64748b; font-size: 12px;">تم الإرسال من نظام TestWise</p>
      </div>
    `,
  };
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { attempt_id, is_game } = await req.json();

    if (!attempt_id) {
      return new Response(JSON.stringify({ error: "Missing attempt_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let attempt: any;
    let attemptError: any;
    const tableName = is_game ? "game_attempts" : "attempts";

    if (is_game) {
      const result = await supabase.from("game_attempts").select("*").eq("id", attempt_id).single();
      attempt = result.data;
      attemptError = result.error;

      if (attempt) {
        const metadata = getMetadata(attempt);
        const metadataStudentName = getText(metadata.student_name);

        if (metadataStudentName) {
          attempt.student_name = metadataStudentName;
        } else if (attempt.user_id) {
          const { data: profile } = await supabase
            .from("student_profiles")
            .select("full_name")
            .eq("id", attempt.user_id)
            .maybeSingle();
          attempt.student_name = getText(profile?.full_name, "طالب");
        } else {
          attempt.student_name = "طالب";
        }
      }
    } else {
      const result = await supabase.from("attempts").select("*").eq("id", attempt_id).single();
      attempt = result.data;
      attemptError = result.error;
    }

    if (attemptError || !attempt) {
      return new Response(JSON.stringify({ error: "Invalid attempt", table: tableName }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let emailStatus = "not_attempted";
    let emailDebug = "";

    if (!is_game) {
      const finishedAt = new Date().toISOString();
      await supabase.from("attempts").update({ finished_at: finishedAt }).eq("id", attempt_id);
    }

    if (!attempt.teacher_email_sent) {
      const { data: settings, error: settingsError } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["admin_email", "resend_api_key", "sender_email"]);

      if (settingsError) {
        console.error("[exam-finish] Error fetching settings:", settingsError);
        emailStatus = "error_fetching_settings";
        emailDebug = settingsError.message;
      }

      const recipientEmail = settings?.find((item: any) => item.key === "admin_email")?.value;
      const senderEmail = settings?.find((item: any) => item.key === "sender_email")?.value;
      const resendApiKey = settings?.find((item: any) => item.key === "resend_api_key")?.value;

      if (!recipientEmail) {
        emailStatus = "skipped_no_recipient";
        emailDebug = "Recipient email not configured in app_settings";
      } else if (!resendApiKey) {
        emailStatus = "skipped_no_api_key";
        emailDebug = "Resend API Key not configured";
      } else {
        try {
          let subject = "";
          let htmlBody = "";

          if (is_game) {
            const gameEmail = buildGameEmail(attempt);
            subject = gameEmail.subject;
            htmlBody = gameEmail.htmlBody;
          } else {
            const { data: answers } = await supabase
              .from("attempt_answers")
              .select("question_id, wrong_count")
              .eq("attempt_id", attempt_id);

            const penalizedCount = (answers as Answer[] || []).filter((answer: Answer) => answer.wrong_count > 0).length;
            const finishedAt = attempt.finished_at || new Date().toISOString();

            subject = `نتيجة اختبار جديد - ${attempt.student_name}`;
            htmlBody = `
              <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
                <h1 style="color: #0D9488; text-align: center;">تقرير نتيجة اختبار</h1>
                <hr style="border: 1px solid #0D9488;">
                <p style="font-size: 16px;"><strong>اسم الطالب:</strong> ${attempt.student_name}</p>
                <p style="font-size: 16px;"><strong>الدرجة النهائية:</strong> <span style="font-size: 20px; color: #0D9488; font-weight: bold;">${attempt.score}</span> / ${attempt.question_count}</p>
                <p style="font-size: 16px;"><strong>عدد الخصومات:</strong> ${attempt.total_penalty || 0}</p>
                <p style="font-size: 16px;"><strong>عدد الأسئلة المتأثرة بالخصم:</strong> ${penalizedCount}</p>
                <div style="background-color: white; padding: 15px; border-radius: 6px; margin-top: 15px;">
                  <p><strong>وقت البدء:</strong> ${new Date(attempt.started_at).toLocaleString("ar-EG")}</p>
                  <p><strong>وقت الانتهاء:</strong> ${new Date(finishedAt).toLocaleString("ar-EG")}</p>
                </div>
                <p style="text-align: center; margin-top: 20px; color: #64748b; font-size: 12px;">تم الإرسال من نظام TestWise</p>
              </div>
            `;
          }

          const fromAddress = senderEmail
            ? `TestWise <${senderEmail}>`
            : "TestWise <delivered@resend.dev>";

          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: fromAddress,
              to: [recipientEmail],
              subject,
              html: htmlBody,
            }),
          });

          const responseData = await response.json();

          if (response.ok) {
            emailStatus = "sent_resend";
            emailDebug = JSON.stringify(responseData);
          } else {
            emailStatus = "failed_resend";
            emailDebug = `Status ${response.status}: ${JSON.stringify(responseData)}`;
          }

          if (emailStatus.startsWith("sent")) {
            await supabase.from(tableName).update({ teacher_email_sent: true }).eq("id", attempt_id);
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
        debug: emailDebug,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in exam-finish:", error);
    return new Response(JSON.stringify({ success: false, error: "Internal Error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
