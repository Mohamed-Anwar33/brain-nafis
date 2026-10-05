interface CentralQuestionForSelection {
  id: string;
  stage_number?: number | null;
  order_index?: number;
  created_at?: string | null;
}

export function selectCentralQuickQuizQuestions<T extends CentralQuestionForSelection>(questions: T[], stage: number): T[] {
  const assigned = questions.filter(q => !q.stage_number || q.stage_number === stage);
  return [...(assigned.length ? assigned : questions)].sort((a, b) => {
    const stageDifference = (a.stage_number ?? 1) - (b.stage_number ?? 1);
    if (stageDifference) return stageDifference;
    if (a.order_index !== undefined && b.order_index !== undefined && a.order_index !== b.order_index) {
      return a.order_index - b.order_index;
    }
    const createdDifference = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    return createdDifference || a.id.localeCompare(b.id);
  }).slice(0, 10);
}
