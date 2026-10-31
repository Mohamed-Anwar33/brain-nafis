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
  const sameConcept = source.scientific_concept
    ? sameDomain.filter((candidate) => candidate.scientific_concept === source.scientific_concept)
    : sameDomain;

  // Prefer the closest match, but widen to the same skill when a narrower
  // concept/domain/subject has no usable practice question.
  return sameConcept.length ? sameConcept : withChoices;
}
