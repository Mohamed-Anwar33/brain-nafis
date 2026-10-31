export type SimilarQuestionScope = {
  scientific_skill: string | null;
  scientific_concept?: string | null;
  grade_subject_id?: string | null;
  domain_id?: string | null;
};

export type SimilarQuestionCandidate = SimilarQuestionScope & {
  id: string;
  choices?: unknown[] | null;
};

export function selectSimilarQuestionCandidates<T extends SimilarQuestionCandidate>(
  source: SimilarQuestionScope,
  candidates: T[],
): T[] {
  if (!source.scientific_skill?.trim()) return [];

  const sameSkill = candidates.filter(
    (candidate) => candidate.scientific_skill?.trim() === source.scientific_skill?.trim(),
  );
  const withChoices = sameSkill.filter(
    (candidate) => Array.isArray(candidate.choices) && candidate.choices.length >= 2,
  );
  if (!withChoices.length) return [];

  const sameSubject = source.grade_subject_id
    ? withChoices.filter((candidate) => candidate.grade_subject_id === source.grade_subject_id)
    : withChoices;
  const sameDomain = source.domain_id
    ? sameSubject.filter((candidate) => candidate.domain_id === source.domain_id)
    : sameSubject;
  // Skill is the instructional link. Concept metadata may be absent or
  // inconsistent, so it must not prevent a student from getting practice.
  if (sameDomain.length) return sameDomain;
  if (sameSubject.length) return sameSubject;
  return withChoices;
}
