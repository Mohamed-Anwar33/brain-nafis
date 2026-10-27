export function hasQuestionExplanationMedia(question: {
  explanation_url?: string | null;
  wrong_reason?: string | null;
}): boolean {
  return Boolean(question.explanation_url?.trim() || /https?:\/\/\S+/i.test(question.wrong_reason || ""));
}
