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

export const DEFAULT_SELECTION_CONTEXT: SelectionContext = {
  trackType: "nafis",
  experienceType: "interactive-games",
  gradeId: "8db3f874-aa52-4893-8d04-4eb6ef74f0af",
  gradeName: "ثالث متوسط",
  subjectId: "a79e5e49-5a5e-4ccd-9ac8-c5e9c37c788b",
  subjectName: "علوم",
  gradeSubjectId: "d5d10da4-4861-456d-a7a4-0b124e9a16d1",
  domainId: null,
  domainName: null,
};

export function getStoredSelectionContext(): SelectionContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw =
      window.sessionStorage.getItem(SELECTION_CONTEXT_STORAGE_KEY) ||
      window.localStorage.getItem(SELECTION_CONTEXT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (isSelectionContext(parsed)) {
      return parsed;
    }

    // Attempt to heal partial context
    if (parsed && typeof parsed === "object" && isTrackType(parsed.trackType)) {
      const healed: SelectionContext = {
        ...DEFAULT_SELECTION_CONTEXT,
        ...parsed,
        trackType: parsed.trackType,
      };
      if (isSelectionContext(healed)) {
        saveSelectionContext(healed);
        return healed;
      }
    }
    return null;
  } catch (error) {
    console.error("Failed to read selection context", error);
    return null;
  }
}

export function ensureStoredSelectionContext(
  trackType: TrackType = "nafis",
  expType: SelectionContext["experienceType"] = "interactive-games"
): SelectionContext {
  const existing = getStoredSelectionContext();
  if (existing) {
    if (existing.trackType !== trackType) {
      const updated: SelectionContext = {
        ...existing,
        trackType,
      };
      saveSelectionContext(updated);
      return updated;
    }
    return existing;
  }

  const fresh: SelectionContext = {
    ...DEFAULT_SELECTION_CONTEXT,
    trackType,
    experienceType: expType,
  };
  saveSelectionContext(fresh);
  return fresh;
}

export function saveSelectionContext(context: SelectionContext) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const serialized = JSON.stringify(context);
    window.sessionStorage.setItem(SELECTION_CONTEXT_STORAGE_KEY, serialized);
    window.localStorage.setItem(SELECTION_CONTEXT_STORAGE_KEY, serialized);
  } catch (e) {
    console.warn("Error saving selection context:", e);
  }
}

export function clearSelectionContext() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(SELECTION_CONTEXT_STORAGE_KEY);
    window.localStorage.removeItem(SELECTION_CONTEXT_STORAGE_KEY);
  } catch (e) {
    console.warn("Error clearing selection context:", e);
  }
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
    context.trackType === "central" ? "الاختبار المركزي" : "براين ساينس",
    context.gradeName,
    context.subjectName,
  ];

  if (context.trackType === "central" && context.domainName) {
    parts.push(context.domainName);
  }

  return parts.join(" • ");
}
