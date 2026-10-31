export interface ScientificActivityScope {
  domainId: string | null;
  gradeSubjectId: string | null;
}

export interface ScopedScientificActivity {
  domain_id?: string | null;
  grade_subject_id?: string | null;
}

/** Keep domain activities isolated; untagged content is only shown in an unscoped view. */
export function isScientificActivityInScope(
  activity: ScopedScientificActivity,
  scope: ScientificActivityScope,
): boolean {
  if (!scope.domainId && !scope.gradeSubjectId) return true;
  if (scope.domainId && activity.domain_id !== scope.domainId) return false;
  if (!scope.domainId && activity.domain_id) return false;
  if (
    scope.gradeSubjectId &&
    activity.grade_subject_id &&
    activity.grade_subject_id !== scope.gradeSubjectId
  ) {
    return false;
  }
  return true;
}
