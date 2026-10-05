import { describe, expect, it } from "vitest";
import { canChooseAnswerAfterWrongAnswer, orderNafisQuestions, selectNafisRoundQuestions, getNafisStageProgress } from "@/lib/nafis-quick-quiz";

describe("Nafis quick quiz flow", () => {
  it("keeps student stages at ten questions with a stable next round", () => {
    const questions = Array.from({ length: 85 }, (_, i) => ({
      id: `q-${i}`, stage_number: 1, created_at: new Date(2026, 0, 1, 0, i).toISOString(),
    }));
    const first = selectNafisRoundQuestions(questions, 1);
    expect(first).toHaveLength(40);
    for (const stage of [1, 2, 3, 4]) {
      expect(first.filter(q => q.stage_number === stage)).toHaveLength(10);
    }
    expect(first[0].id).toBe("q-0");
    expect(selectNafisRoundQuestions(questions, 5)[0].id).toBe("q-40");
    expect(selectNafisRoundQuestions([...questions].reverse(), 1)).toEqual(first);
    expect(getNafisStageProgress(first, 9)).toEqual({ stage: 1, index: 9, total: 10, nextStage: 2 });
    expect(getNafisStageProgress(first, 10)).toEqual({ stage: 2, index: 0, total: 10, nextStage: 2 });
  });

  it("shows the available questions when fewer than ten remain", () => {
    const questions = Array.from({ length: 13 }, (_, i) => ({ id: `q-${i}` }));
    const selected = selectNafisRoundQuestions(questions, 1);
    expect(selected).toHaveLength(13);
    expect(getNafisStageProgress(selected, 12)).toEqual({ stage: 2, index: 2, total: 3, nextStage: null });
  });

  it("uses the admin display order to select a stable student question sequence", () => {
    const questions = [{ id: "a", stage_number: 1 }, { id: "b", stage_number: 2 }];
    expect(selectNafisRoundQuestions(questions, 1, { 1: 2, 2: 1 }).map(q => q.id)).toEqual(["b", "a"]);
  });
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
