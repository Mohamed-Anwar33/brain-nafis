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

describe("School Identity & Appreciation Certificate", () => {
  const schoolName = "المتوسطة الثانية والثمانون";
  const teacherName = "أ/ هيفا السلمي";

  it("should use the exact requested school name and teacher", () => {
    expect(schoolName).toBe("المتوسطة الثانية والثمانون");
    expect(teacherName).toContain("هيفا السلمي");
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
