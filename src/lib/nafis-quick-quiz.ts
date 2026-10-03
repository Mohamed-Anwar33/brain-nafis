export interface NafisQuestionForOrdering {
  id: string;
  stage_number?: number | null;
  created_at?: string | null;
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

export function canAdvanceAfterWrongAnswer(hasOpenedExplanationVideo: boolean): boolean {
  return hasOpenedExplanationVideo;
}
