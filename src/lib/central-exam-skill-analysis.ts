export interface SkillTaggedQuestion {
  id: string;
  scientific_skill?: string | null;
}

export interface SkillPerformance {
  skill: string;
  correct: number;
  total: number;
  percentage: number;
}

export function buildCentralExamSkillAnalysis(
  questions: SkillTaggedQuestion[],
  questionIdsWithErrors: ReadonlySet<string>,
): SkillPerformance[] {
  const groups = new Map<string, { correct: number; total: number }>();
  for (const question of questions) {
    const skill = question.scientific_skill?.trim();
    if (!skill) continue;
    const group = groups.get(skill) || { correct: 0, total: 0 };
    group.total += 1;
    if (!questionIdsWithErrors.has(question.id)) group.correct += 1;
    groups.set(skill, group);
  }
  return Array.from(groups, ([skill, group]) => ({
    skill,
    correct: group.correct,
    total: group.total,
    percentage: Math.round((group.correct / group.total) * 100),
  }));
}

export function mergeSkillPerformances(...collections: SkillPerformance[][]): SkillPerformance[] {
  const groups = new Map<string, { correct: number; total: number }>();
  for (const collection of collections) {
    for (const score of collection) {
      if (!score.skill.trim() || score.total <= 0) continue;
      const group = groups.get(score.skill) || { correct: 0, total: 0 };
      group.correct += score.correct;
      group.total += score.total;
      groups.set(score.skill, group);
    }
  }
  return Array.from(groups, ([skill, group]) => ({
    skill,
    correct: group.correct,
    total: group.total,
    percentage: Math.round((group.correct / group.total) * 100),
  })).sort((a, b) => a.percentage - b.percentage);
}
