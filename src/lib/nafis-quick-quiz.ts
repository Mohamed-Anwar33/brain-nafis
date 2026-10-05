export interface NafisQuestionForOrdering {
  id: string;
  stage_number?: number | null;
  created_at?: string | null;
}

export function selectNafisRoundQuestions<T extends NafisQuestionForOrdering>(questions: T[], stageStart: number, displayOrder: Record<number, number> = {}): T[] {
  const ordered = orderNafisQuestions(questions).sort((a, b) =>
    (displayOrder[a.stage_number ?? 1] ?? a.stage_number ?? 1) -
    (displayOrder[b.stage_number ?? 1] ?? b.stage_number ?? 1),
  );
  if (!ordered.length) return [];
  const offset = ((stageStart - 1) * 10) % ordered.length;
  // A student round has four groups of ten, independent of admin group sizes.
  return [...ordered.slice(offset), ...ordered.slice(0, offset)]
    .slice(0, 40)
    .map((question, index) => ({ ...question, stage_number: stageStart + Math.floor(index / 10) }));
}

export function getNafisStageProgress(questions: NafisQuestionForOrdering[], currentIndex: number) {
  const stage = questions[currentIndex]?.stage_number ?? 1;
  const stageQuestions = questions.filter(question => (question.stage_number ?? 1) === stage);
  const firstIndex = questions.findIndex(question => (question.stage_number ?? 1) === stage);
  return {
    stage,
    index: currentIndex - firstIndex,
    total: stageQuestions.length,
    nextStage: questions[currentIndex + 1] ? (questions[currentIndex + 1].stage_number ?? 1) : null,
  };
}

export function orderNafisQuestions<T extends NafisQuestionForOrdering>(questions: T[]): T[] {
  return [...questions].sort((a, b) => {
    const stageDifference = (a.stage_number ?? 1) - (b.stage_number ?? 1);
    if (stageDifference !== 0) return stageDifference;

    const createdDifference = new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
    if (createdDifference !== 0) return createdDifference;

    return a.id.localeCompare(b.id);
  });
}

export function canAdvanceAfterWrongAnswer(
  hasOpenedExplanationVideo: boolean,
  hasExplanationVideo = true,
): boolean {
  return !hasExplanationVideo || hasOpenedExplanationVideo;
}

export function canChooseAnswerAfterWrongAnswer(
  hasWrongAnswer: boolean,
  hasExplanationVideo = true,
  hasOpenedExplanationVideo = false,
): boolean {
  return !hasWrongAnswer || !hasExplanationVideo || hasOpenedExplanationVideo;
}
