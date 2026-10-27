import { describe, expect, it } from "vitest";
import { hasQuestionExplanationMedia } from "@/lib/question-explanation";

describe("similar question explanation media", () => {
  it("recognizes video links stored in either the explanation field or the legacy explanation text", () => {
    expect(hasQuestionExplanationMedia({ explanation_url: "https://youtu.be/abc123" })).toBe(true);
    expect(hasQuestionExplanationMedia({ wrong_reason: "شاهد الشرح https://youtu.be/abc123" })).toBe(true);
    expect(hasQuestionExplanationMedia({ wrong_reason: "راجع قانون نيوتن" })).toBe(false);
  });
});
