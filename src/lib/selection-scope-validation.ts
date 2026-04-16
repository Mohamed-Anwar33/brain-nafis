import { SelectionScopeValue } from "@/types/selection";

export function validateSelectionScope(
  value: SelectionScopeValue,
  options?: {
    requireDomainForCentral?: boolean;
  },
) {
  if (!value.gradeSubjectId) {
    return "يرجى اختيار الصف والمادة";
  }

  if (
    (options?.requireDomainForCentral ?? true) &&
    value.trackType === "central" &&
    !value.domainId
  ) {
    return "يرجى اختيار المجال للمسار المركزي";
  }

  return null;
}
