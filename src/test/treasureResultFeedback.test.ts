import { describe, expect, it } from "vitest";
import { getTreasureResultFeedback } from "@/pages/games/treasure/treasureResultFeedback";

describe("treasure result feedback", () => {
  it("celebrates only a server-confirmed perfect run under five minutes", () => {
    const result = getTreasureResultFeedback({
      finalScore: 100,
      durationSeconds: 299,
      isPassed: true,
      subjectPointEligible: true,
    });

    expect(result.earnedPerfectScore).toBe(true);
    expect(result.hasPerfectRun).toBe(true);
    expect(result.resultTitle).toContain("الكنز الذهبي");
    expect(result.resultMessage).toContain("درجة إضافية");
  });

  it("explains that exactly five minutes does not meet the under-five-minute condition", () => {
    const result = getTreasureResultFeedback({
      finalScore: 100,
      durationSeconds: 300,
      isPassed: true,
      subjectPointEligible: false,
    });

    expect(result.metRewardTime).toBe(false);
    expect(result.earnedPerfectScore).toBe(false);
    expect(result.resultTitle).toContain("تحدي الوقت");
    expect(result.resultMessage).toContain("أقل من ٥ دقائق");
  });

  it("does not promise a grade before the server confirms every challenge", () => {
    const result = getTreasureResultFeedback({
      finalScore: 100,
      durationSeconds: 240,
      isPassed: true,
      subjectPointEligible: false,
    });

    expect(result.hasPerfectRun).toBe(true);
    expect(result.earnedPerfectScore).toBe(false);
    expect(result.resultMessage).toContain("تأكيد");
    expect(result.resultMessage).not.toContain("تستحقين درجة إضافية");
  });

  it("encourages another try without implying a bonus for a partial score", () => {
    const result = getTreasureResultFeedback({
      finalScore: 76,
      durationSeconds: 128,
      isPassed: true,
      subjectPointEligible: false,
    });

    expect(result.earnedPerfectScore).toBe(false);
    expect(result.resultMessage).toContain("حاولي مرة أخرى");
    expect(result.resultMessage).not.toContain("درجة إضافية في المادة");
  });
});
