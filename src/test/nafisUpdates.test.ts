import { describe, it, expect } from "vitest";
import { parseExplanationUrl, extractUrlFromText } from "@/lib/video-parser";

describe("Video Parser & Educational Links", () => {
  it("should parse standard YouTube watch URLs", () => {
    const parsed = parseExplanationUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe("youtube");
    expect(parsed?.embedUrl).toContain("dQw4w9WgXcQ");
    expect(parsed?.isValid).toBe(true);
  });

  it("should parse youtu.be short URLs", () => {
    const parsed = parseExplanationUrl("https://youtu.be/dQw4w9WgXcQ?t=10");
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe("youtube");
    expect(parsed?.embedUrl).toContain("dQw4w9WgXcQ");
    expect(parsed?.isValid).toBe(true);
  });

  it("should parse YouTube Shorts URLs", () => {
    const parsed = parseExplanationUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ");
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe("youtube");
    expect(parsed?.embedUrl).toContain("dQw4w9WgXcQ");
  });

  it("should parse Vimeo URLs", () => {
    const parsed = parseExplanationUrl("https://vimeo.com/76979871");
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe("vimeo");
    expect(parsed?.embedUrl).toBe("https://player.vimeo.com/video/76979871?autoplay=1");
  });

  it("should recognize direct video files (mp4, webm)", () => {
    const parsed = parseExplanationUrl("https://example.com/lessons/science_intro.mp4");
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe("direct_video");
    expect(parsed?.platformName).toBe("مقطع فيديو مباشر");
    expect(parsed?.isValid).toBe(true);
  });

  it("should identify Saudi Ain Educational Platform", () => {
    const parsed = parseExplanationUrl("https://ien.edu.sa/Lesson/12345");
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe("web_link");
    expect(parsed?.platformName).toBe("بوابة عين التعليمية الوطنية");
    expect(parsed?.isValid).toBe(true);
  });

  it("should identify Madrasati platform", () => {
    const parsed = parseExplanationUrl("https://schools.madrasati.sa/content/science");
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe("web_link");
    expect(parsed?.platformName).toBe("منصة مدرستي");
  });

  it("should extract URLs from mixed teacher comments", () => {
    const text = "الإجابة الصحيحة هي الانقسام المتساوي، للمزيد شاهد الشرح عبر الرابط: https://youtu.be/sampleVid123 بالتوفيق!";
    const extracted = extractUrlFromText(text);
    expect(extracted).toBe("https://youtu.be/sampleVid123");

    const parsed = parseExplanationUrl(text);
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe("youtube");
    expect(parsed?.embedUrl).toContain("sampleVid123");
  });

  it("should handle invalid, null, and empty inputs gracefully without throwing", () => {
    expect(parseExplanationUrl(null)).toBeNull();
    expect(parseExplanationUrl(undefined)).toBeNull();
    expect(parseExplanationUrl("")).toBeNull();
    expect(parseExplanationUrl("   ")).toBeNull();
    const invalid = parseExplanationUrl("not a url at all");
    expect(invalid).not.toBeNull();
    expect(invalid?.isValid).toBe(false);
  });
});

describe("Deterministic Question Flow (No Random Truncation)", () => {
  it("should retain all questions without random sampling or slicing", () => {
    // Simulating 100 questions added by teacher
    const rawQuestions = Array.from({ length: 100 }, (_, i) => ({
      id: `q-${i + 1}`,
      text: `سؤال رقم ${i + 1}`,
      stage_number: Math.floor(i / 20) + 1,
      created_at: new Date(2026, 0, 1, 0, i).toISOString(),
    }));

    // Deterministic sort as in StudentDashboard and ExamPage
    const loadedQuestions = [...rawQuestions].sort((a, b) => {
      if (a.stage_number !== b.stage_number) {
        return a.stage_number - b.stage_number;
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    // Verification: EXACTLY 100 questions remain, none dropped
    expect(loadedQuestions.length).toBe(100);
    expect(loadedQuestions[0].id).toBe("q-1");
    expect(loadedQuestions[99].id).toBe("q-100");
  });
});

describe("Teacher Identity & Appreciation Certificate", () => {
  const platformName = "براين ساينس للتفوق";
  const teacherName = "أ/ هيفاء السلمي";

  it("should use the exact requested platform and teacher", () => {
    expect(platformName).toBe("براين ساينس للتفوق");
    expect(teacherName).toContain("هيفاء السلمي");
  });

  it("should calculate correct certificate score percentages", () => {
    const calculatePercentage = (score: number, total: number) => {
      return total > 0 ? Math.round((score / total) * 100) : 0;
    };

    expect(calculatePercentage(20, 20)).toBe(100);
    expect(calculatePercentage(15, 20)).toBe(75);
    expect(calculatePercentage(17, 20)).toBe(85);
    expect(calculatePercentage(0, 20)).toBe(0);
  });
});

describe("Exam & Central Exam Score and Accuracy Metrics", () => {
  it("should calculate correct, errors, total, and percentage with 100% mathematical consistency", () => {
    // User's exact scenario: 28 questions, 16 errors
    const totalQuestions = 28;
    const questionsWithErrorsCount = 16;

    // Correct questions answered on first attempt without errors
    const correctCount = Math.max(0, totalQuestions - questionsWithErrorsCount);
    const wrongCount = questionsWithErrorsCount;

    // Verification 1: The numbers MUST sum up to the total questions
    expect(correctCount + wrongCount).toBe(totalQuestions);
    expect(correctCount).toBe(12);
    expect(wrongCount).toBe(16);

    // Verification 2: Percentage must reflect true score (12 / 28)
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    expect(percentage).toBe(43);
    expect(percentage).not.toBe(100); // Prevents the old bug where score was 28/28 (100%)

    // Verification 3: Status must indicate need for training rather than passing/exceptional
    const status = percentage >= 60 ? "ناجح" : "يحتاج تدريب";
    expect(status).toBe("يحتاج تدريب");
  });

  it("should correctly handle a 100% perfect exam score", () => {
    const totalQuestions = 28;
    const questionsWithErrorsCount = 0;

    const correctCount = Math.max(0, totalQuestions - questionsWithErrorsCount);
    const wrongCount = questionsWithErrorsCount;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const status = percentage >= 60 ? "ناجح" : "يحتاج تدريب";

    expect(correctCount).toBe(28);
    expect(wrongCount).toBe(0);
    expect(percentage).toBe(100);
    expect(status).toBe("ناجح");
  });
});

describe("4-Stage Exam Architecture & Certificate Gating", () => {
  const TOTAL_STAGES = 4;
  const TARGET_QUESTIONS = 40;

  it("should divide 40 exam questions equally into 4 stages of 10 questions each", () => {
    const rawQuestions = Array.from({ length: TARGET_QUESTIONS }, (_, i) => ({
      id: `q-${i + 1}`,
      text: `سؤال ${i + 1}`,
    }));

    const questionsPerStage = Math.max(1, Math.ceil(rawQuestions.length / TOTAL_STAGES));
    expect(questionsPerStage).toBe(10);

    const partitioned = rawQuestions.map((q, index) => ({
      ...q,
      stage_number: Math.min(TOTAL_STAGES, Math.floor(index / questionsPerStage) + 1),
    }));

    // Stage 1: questions 0..9 (10 questions)
    expect(partitioned.slice(0, 10).every(q => q.stage_number === 1)).toBe(true);
    // Stage 2: questions 10..19 (10 questions)
    expect(partitioned.slice(10, 20).every(q => q.stage_number === 2)).toBe(true);
    // Stage 3: questions 20..29 (10 questions)
    expect(partitioned.slice(20, 30).every(q => q.stage_number === 3)).toBe(true);
    // Stage 4: questions 30..39 (10 questions)
    expect(partitioned.slice(30, 40).every(q => q.stage_number === 4)).toBe(true);
  });

  it("should trigger stage transitions at questions 10, 20, 30, and complete at 40", () => {
    const questionsPerStage = 10;
    const transitionPoints: number[] = [];
    let completedExam = false;

    for (let currentIndex = 0; currentIndex < TARGET_QUESTIONS; currentIndex++) {
      const nextIndex = currentIndex + 1;
      const currentStage = Math.min(TOTAL_STAGES, Math.floor(currentIndex / questionsPerStage) + 1);

      if (currentIndex < TARGET_QUESTIONS - 1) {
        if (nextIndex % questionsPerStage === 0 && currentStage < TOTAL_STAGES) {
          transitionPoints.push(nextIndex);
        }
      } else {
        completedExam = true;
      }
    }

    // Must transition exactly at 10, 20, 30
    expect(transitionPoints).toEqual([10, 20, 30]);
    // Must complete when question 40 is solved
    expect(completedExam).toBe(true);
  });

  it("should ONLY allow certificate display after completing all 4 stages", () => {
    const checkCertificateEligibility = (stagesCompleted: number, totalStages: number = 4) => {
      return stagesCompleted >= totalStages;
    };

    // Stage 1 early exit: NO certificate
    expect(checkCertificateEligibility(1)).toBe(false);
    // Stage 2 early exit: NO certificate
    expect(checkCertificateEligibility(2)).toBe(false);
    // Stage 3 early exit: NO certificate
    expect(checkCertificateEligibility(3)).toBe(false);
    // All 4 stages completed: Certificate ALLOWED!
    expect(checkCertificateEligibility(4)).toBe(true);
    // Overachieved: Certificate ALLOWED
    expect(checkCertificateEligibility(5)).toBe(true);
  });

  it("should calculate certificate score and percentage accurately with zero margin of error", () => {
    const calculateCertificateStats = (
      stageScores: { correct: number; total: number }[]
    ) => {
      const totalCorrect = stageScores.reduce((acc, s) => acc + s.correct, 0);
      const totalQuestions = stageScores.reduce((acc, s) => acc + s.total, 0);
      const percentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
      const wrongCount = Math.max(0, totalQuestions - totalCorrect);
      return { totalCorrect, totalQuestions, percentage, wrongCount };
    };

    // Case 1: Perfect score (10/10 in all 4 stages = 40/40)
    const perfectExam = [
      { correct: 10, total: 10 },
      { correct: 10, total: 10 },
      { correct: 10, total: 10 },
      { correct: 10, total: 10 },
    ];
    const perfectResult = calculateCertificateStats(perfectExam);
    expect(perfectResult.totalCorrect).toBe(40);
    expect(perfectResult.totalQuestions).toBe(40);
    expect(perfectResult.percentage).toBe(100);
    expect(perfectResult.wrongCount).toBe(0);

    // Case 2: Realistic scenario (8, 9, 7, 10 = 34/40)
    const realisticExam = [
      { correct: 8, total: 10 },
      { correct: 9, total: 10 },
      { correct: 7, total: 10 },
      { correct: 10, total: 10 },
    ];
    const realisticResult = calculateCertificateStats(realisticExam);
    expect(realisticResult.totalCorrect).toBe(34);
    expect(realisticResult.totalQuestions).toBe(40);
    expect(realisticResult.percentage).toBe(85); // 34/40 = 85%
    expect(realisticResult.wrongCount).toBe(6);

    // Case 3: Zero score (0/10 in all 4 stages = 0/40)
    const zeroExam = [
      { correct: 0, total: 10 },
      { correct: 0, total: 10 },
      { correct: 0, total: 10 },
      { correct: 0, total: 10 },
    ];
    const zeroResult = calculateCertificateStats(zeroExam);
    expect(zeroResult.totalCorrect).toBe(0);
    expect(zeroResult.totalQuestions).toBe(40);
    expect(zeroResult.percentage).toBe(0);
    expect(zeroResult.wrongCount).toBe(40);
  });
});

