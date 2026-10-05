import { describe, expect, it } from "vitest";
import { selectCentralQuickQuizQuestions } from "@/lib/central-quick-quiz";

describe("central quick quiz selection", () => {
  it("keeps the same ten questions when the database returns tied rows in a different order", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      id: `q-${String(i).padStart(2, "0")}`, stage_number: 1,
      order_index: 0, created_at: "2026-01-01",
    }));
    expect(selectCentralQuickQuizQuestions(rows, 1).map(q => q.id)).toEqual([
      "q-00", "q-01", "q-02", "q-03", "q-04", "q-05", "q-06", "q-07", "q-08", "q-09",
    ]);
    expect(selectCentralQuickQuizQuestions([...rows].reverse(), 1)).toEqual(selectCentralQuickQuizQuestions(rows, 1));
  });
});
