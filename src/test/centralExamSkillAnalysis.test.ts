import { describe, expect, it } from "vitest";
import { buildCentralExamSkillAnalysis, mergeSkillPerformances } from "@/lib/central-exam-skill-analysis";

describe("central exam skill analysis", () => {
  it("scores each mapped skill using first-try correctness and ignores untagged questions", () => {
    expect(buildCentralExamSkillAnalysis([
      { id: "q1", scientific_skill: "فهم المفاهيم العلمية" },
      { id: "q2", scientific_skill: "فهم المفاهيم العلمية" },
      { id: "q3", scientific_skill: "التطبيق" },
      { id: "q4", scientific_skill: " " },
    ], new Set(["q2"]))).toEqual([
      { skill: "فهم المفاهيم العلمية", correct: 1, total: 2, percentage: 50 },
      { skill: "التطبيق", correct: 1, total: 1, percentage: 100 },
    ]);
  });

  it("combines saved performances across completed attempts", () => {
    expect(mergeSkillPerformances(
      [{ skill: "التطبيق", correct: 1, total: 2, percentage: 50 }],
      [{ skill: "التطبيق", correct: 2, total: 2, percentage: 100 }, { skill: "الاستدلال", correct: 0, total: 1, percentage: 0 }],
    )).toEqual([
      { skill: "الاستدلال", correct: 0, total: 1, percentage: 0 },
      { skill: "التطبيق", correct: 3, total: 4, percentage: 75 },
    ]);
  });
});
