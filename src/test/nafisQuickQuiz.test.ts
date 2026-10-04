import { describe, expect, it } from "vitest";
import { canChooseAnswerAfterWrongAnswer, orderNafisQuestions } from "@/lib/nafis-quick-quiz";

describe("Nafis quick quiz flow", () => {
  it("keeps questions in their assigned stage order without randomizing them", () => {
    const questions = [
      { id: "stage-2", stage_number: 2, created_at: "2026-01-02" },
      { id: "stage-1-later", stage_number: 1, created_at: "2026-01-02" },
      { id: "stage-1-first", stage_number: 1, created_at: "2026-01-01" },
    ];

    expect(orderNafisQuestions(questions).map((question) => question.id)).toEqual([
      "stage-1-first",
      "stage-1-later",
      "stage-2",
    ]);
  });

  it("disables all answer choices after a wrong answer until the video is opened", () => {
    expect(canChooseAnswerAfterWrongAnswer(true, true, false)).toBe(false);
    expect(canChooseAnswerAfterWrongAnswer(true, true, true)).toBe(true);
    expect(canChooseAnswerAfterWrongAnswer(true, false, false)).toBe(true);
  });
});
