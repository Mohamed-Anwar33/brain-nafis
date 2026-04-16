import { SelectionContext, TrackType } from "@/types/selection";

export const SELECTION_CONTEXT_STORAGE_KEY = "brain-nafis-selection-context";

const TRACK_TYPES: TrackType[] = ["nafis", "central"];

function isTrackType(value: unknown): value is TrackType {
  return typeof value === "string" && TRACK_TYPES.includes(value as TrackType);
}

export function isSelectionContext(value: unknown): value is SelectionContext {
  if (!value || typeof value !== "object") {
    return false;
  }

  const context = value as Partial<SelectionContext>;
  return Boolean(
    isTrackType(context.trackType) &&
      context.experienceType &&
      context.gradeId &&
      context.gradeName &&
      context.subjectId &&
      context.subjectName &&
      context.gradeSubjectId,
  );
}

export function getStoredSelectionContext(): SelectionContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(SELECTION_CONTEXT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return isSelectionContext(parsed) ? parsed : null;
  } catch (error) {
    console.error("Failed to read selection context", error);
    return null;
  }
}

export function saveSelectionContext(context: SelectionContext) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    SELECTION_CONTEXT_STORAGE_KEY,
    JSON.stringify(context),
  );
}

export function clearSelectionContext() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(SELECTION_CONTEXT_STORAGE_KEY);
}

export function buildSelectionSnapshot(context: SelectionContext) {
  return {
    track_type: context.trackType,
    experience_type: context.experienceType,
    grade_id: context.gradeId,
    grade_name: context.gradeName,
    subject_id: context.subjectId,
    subject_name: context.subjectName,
    grade_subject_id: context.gradeSubjectId,
    domain_id: context.domainId || null,
    domain_name: context.domainName || null,
  };
}

export function getSelectionDisplayText(context: SelectionContext) {
  const parts = [
    context.trackType === "central" ? "الاختبار المركزي" : "نافس",
    context.gradeName,
    context.subjectName,
  ];

  if (context.trackType === "central" && context.domainName) {
    parts.push(context.domainName);
  }

  return parts.join(" • ");
}
