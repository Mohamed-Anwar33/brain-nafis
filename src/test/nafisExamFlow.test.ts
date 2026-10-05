import { beforeEach, describe, expect, it, vi } from "vitest";
import { startNafisStagesRound } from "@/services/nafisExamFlow";
import { SelectionContext } from "@/types/selection";

const database = vi.hoisted(() => ({
  seen: new Set<string>(),
  questions: Array.from({ length: 48 }, (_, i) => ({
    id: `question-${i}`, stage_number: Math.floor(i / 12) + 1,
    created_at: "2026-01-01", text: `Question ${i}`, choices: [],
  })),
  attempts: 0,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: "student" } } } }) },
    from: (table: string) => {
      let payload: any;
      const query: any = {
        upsert: (value: any) => { payload = value; return query; },
        select: () => query, eq: () => query, order: () => query,
        insert: (value: any) => { payload = value; return query; },
        single: async () => ({ data: { id: `attempt-${++database.attempts}` }, error: null }),
        then: (resolve: any) => {
          if (table === "student_question_history" && payload) {
            payload.forEach((row: any) => database.seen.add(row.question_id));
          }
          return Promise.resolve({
            data: table === "questions" ? database.questions : table === "student_question_history"
              ? [...database.seen].map(question_id => ({ question_id })) : [],
            error: null,
          }).then(resolve);
        },
      };
      return query;
    },
  },
}));

const context: SelectionContext = {
  trackType: "nafis", experienceType: "quick-quiz",
  gradeId: "grade", gradeName: "Grade", subjectId: "biology", subjectName: "Biology",
  gradeSubjectId: "grade-biology", domainId: null, domainName: null,
};

describe("starting a quick quiz again", () => {
  beforeEach(() => {
    sessionStorage.clear();
    database.seen.clear();
    database.attempts = 0;
  });

  it("keeps the same ten questions per student stage after leaving and returning", async () => {
    const navigate = vi.fn();
    await startNafisStagesRound({ context, nextStageStart: 1, navigate });
    const first = JSON.parse(sessionStorage.getItem("exam_attempt-1")!);
    // A prior visit must not change the next selection.
    database.questions.slice(0, 12).forEach(q => database.seen.add(q.id));
    sessionStorage.clear();
    await startNafisStagesRound({ context, nextStageStart: 1, navigate });
    const second = JSON.parse(sessionStorage.getItem("exam_attempt-2")!);
    expect(second.questions).toEqual(first.questions);
    expect(first.questions).toHaveLength(40);
    expect(second.questions.filter((q: any) => q.stage_number === 1)).toHaveLength(10);
  });
});
