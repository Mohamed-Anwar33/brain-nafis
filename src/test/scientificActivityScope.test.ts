import { describe, expect, it } from "vitest";
import { isScientificActivityInScope } from "@/lib/scientific-activity-scope";

const biology = "biology-domain";
const chemistry = "chemistry-domain";
const science = "science-grade-subject";

describe("scientific activity domain scope", () => {
  it("shows only activities assigned to the selected domain", () => {
    expect(isScientificActivityInScope({ domain_id: biology, grade_subject_id: science }, {
      domainId: biology,
      gradeSubjectId: science,
    })).toBe(true);
    expect(isScientificActivityInScope({ domain_id: chemistry, grade_subject_id: science }, {
      domainId: biology,
      gradeSubjectId: science,
    })).toBe(false);
    expect(isScientificActivityInScope({ domain_id: null, grade_subject_id: science }, {
      domainId: biology,
      gradeSubjectId: science,
    })).toBe(false);
  });

  it("does not leak activities from another grade subject", () => {
    expect(isScientificActivityInScope({ domain_id: biology, grade_subject_id: "other-subject" }, {
      domainId: biology,
      gradeSubjectId: science,
    })).toBe(false);
  });

  it("shows all activities only when no scope is selected", () => {
    expect(isScientificActivityInScope({ domain_id: chemistry, grade_subject_id: science }, {
      domainId: null,
      gradeSubjectId: null,
    })).toBe(true);
  });
});
