import { describe, expect, it } from "vitest";
import { selectSimilarQuestionCandidates } from "@/lib/similar-question-matching";

const source = {
  scientific_skill: "المهارة العلمية",
  scientific_concept: "الاستدلال",
  grade_subject_id: "subject-a",
  domain_id: "biology",
};

const candidate = (overrides: Record<string, unknown> = {}) => ({
  id: "practice-1",
  scientific_skill: "المهارة العلمية",
  scientific_concept: "الاستدلال",
  grade_subject_id: "subject-a",
  domain_id: "biology",
  choices: [{ id: "a" }, { id: "b" }],
  ...overrides,
});

describe("similar question matching", () => {
  it("prefers a question matching skill, subject, domain, and concept", () => {
    const exact = candidate();
    const otherConcept = candidate({ id: "other-concept", scientific_concept: "القياس" });
    expect(selectSimilarQuestionCandidates(source, [otherConcept, exact]).map((q) => q.id)).toEqual(["practice-1"]);
  });

  it("falls back to another concept in the same skill and scope", () => {
    const otherConcept = candidate({ scientific_concept: "القياس" });
    expect(selectSimilarQuestionCandidates(source, [otherConcept])).toEqual([otherConcept]);
  });

  it("falls back to any subject or domain for the same skill if the current scope has no candidate", () => {
    const otherScope = candidate({ grade_subject_id: "subject-b", domain_id: "physics" });
    expect(selectSimilarQuestionCandidates(source, [otherScope])).toEqual([otherScope]);
  });

  it("requires the same skill and at least two answer choices", () => {
    expect(selectSimilarQuestionCandidates(source, [
      candidate({ scientific_skill: "مهارة أخرى" }),
      candidate({ id: "one-choice", choices: [{ id: "a" }] }),
    ])).toEqual([]);
    expect(selectSimilarQuestionCandidates({ ...source, scientific_skill: null }, [candidate()])).toEqual([]);
  });
});
