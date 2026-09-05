import { useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAcademicCatalog } from "@/hooks/use-academic-catalog";
import { SelectionScopeValue, TrackType } from "@/types/selection";

interface SelectionScopeFieldsProps {
  value: SelectionScopeValue;
  onChange: (next: SelectionScopeValue) => void;
  trackMode?: "editable" | "nafis" | "central";
  requireDomainForCentral?: boolean;
}

export function SelectionScopeFields({
  value,
  onChange,
  trackMode = "editable",
  requireDomainForCentral = true,
}: SelectionScopeFieldsProps) {
  const { data: catalog, isLoading } = useAcademicCatalog();

  const gradeSubjects = useMemo(
    () => catalog?.gradeSubjects ?? [],
    [catalog?.gradeSubjects],
  );
  const domains = useMemo(() => catalog?.domains ?? [], [catalog?.domains]);
  const grades = useMemo(() => catalog?.grades ?? [], [catalog?.grades]);
  const subjects = useMemo(() => catalog?.subjects ?? [], [catalog?.subjects]);

  const resolvedTrackType: TrackType =
    trackMode === "nafis"
      ? "nafis"
      : trackMode === "central"
        ? "central"
        : value.trackType || "central";

  // 1. SYNCHRONOUS RESOLUTION of all effective IDs
  let effectiveGsId = value.gradeSubjectId || "";
  let effectiveDomainId = value.domainId || "";

  // If gradeSubjectId is missing but domainId exists, find gradeSubjectId from domain
  if (!effectiveGsId && effectiveDomainId) {
    const dMatch = domains.find((d) => d.id === effectiveDomainId);
    if (dMatch?.grade_subject_id) {
      effectiveGsId = dMatch.grade_subject_id;
    }
  }

  // Find match from effectiveGsId
  const gsMatch = effectiveGsId
    ? gradeSubjects.find((gs) => gs.id === effectiveGsId)
    : undefined;

  let effectiveGradeId = value.gradeId || gsMatch?.grade_id || "";
  if (!effectiveGradeId && grades.length === 1) {
    effectiveGradeId = grades[0].id;
  }

  // Available subjects for the effective grade
  const availableSubjects = useMemo(() => {
    if (!subjects.length || !effectiveGradeId) return subjects;
    const allowedSubjectIds = new Set(
      gradeSubjects
        .filter((gs) => gs.grade_id === effectiveGradeId)
        .map((gs) => gs.subject_id),
    );
    const filtered = subjects.filter((s) => allowedSubjectIds.has(s.id));
    return filtered.length > 0 ? filtered : subjects;
  }, [subjects, gradeSubjects, effectiveGradeId]);

  let effectiveSubjectId = value.subjectId || gsMatch?.subject_id || "";
  if (!effectiveSubjectId && availableSubjects.length === 1) {
    effectiveSubjectId = availableSubjects[0].id;
  }

  // If effectiveGsId is still not resolved, resolve from gradeId + subjectId
  if (!effectiveGsId && effectiveGradeId && effectiveSubjectId) {
    const match = gradeSubjects.find(
      (gs) => gs.grade_id === effectiveGradeId && gs.subject_id === effectiveSubjectId,
    );
    if (match) {
      effectiveGsId = match.id;
    }
  }

  // Available domains for the effective gradeSubject
  const availableDomains = useMemo(() => {
    if (!effectiveGsId) return domains;
    const filtered = domains.filter((d) => d.grade_subject_id === effectiveGsId);
    return filtered.length > 0 ? filtered : domains;
  }, [domains, effectiveGsId]);

  // Resolve selected item objects for explicit rendering in SelectValue
  const selectedGrade = grades.find((g) => g.id === effectiveGradeId);
  const selectedSubject =
    availableSubjects.find((s) => s.id === effectiveSubjectId) ||
    subjects.find((s) => s.id === effectiveSubjectId);
  const selectedDomain =
    availableDomains.find((d) => d.id === effectiveDomainId) ||
    domains.find((d) => d.id === effectiveDomainId);

  // Synchronize effective values back to parent if needed
  useEffect(() => {
    if (!catalog) return;

    const needsTrack = value.trackType !== resolvedTrackType;
    const needsGrade = value.gradeId !== effectiveGradeId && !!effectiveGradeId;
    const needsSubject = value.subjectId !== effectiveSubjectId && !!effectiveSubjectId;
    const needsGs = value.gradeSubjectId !== effectiveGsId && !!effectiveGsId;
    const needsDomain = value.domainId !== effectiveDomainId && !!effectiveDomainId;

    if (needsTrack || needsGrade || needsSubject || needsGs || needsDomain) {
      onChange({
        trackType: resolvedTrackType,
        gradeId: effectiveGradeId,
        subjectId: effectiveSubjectId,
        gradeSubjectId: effectiveGsId,
        domainId: effectiveDomainId,
      });
    }
  }, [
    catalog,
    resolvedTrackType,
    effectiveGradeId,
    effectiveSubjectId,
    effectiveGsId,
    effectiveDomainId,
    value.trackType,
    value.gradeId,
    value.subjectId,
    value.gradeSubjectId,
    value.domainId,
    onChange,
  ]);

  const handleGradeChange = (gradeId: string) => {
    const subjectsForNewGrade = gradeSubjects.filter((gs) => gs.grade_id === gradeId);
    const newSubjectId = subjectsForNewGrade.length === 1 ? subjectsForNewGrade[0].subject_id : "";
    const newGsId = subjectsForNewGrade.length === 1 ? subjectsForNewGrade[0].id : "";
    onChange({
      trackType: resolvedTrackType,
      gradeId,
      subjectId: newSubjectId,
      gradeSubjectId: newGsId,
      domainId: "",
    });
  };

  const handleSubjectChange = (subjectId: string) => {
    const match = gradeSubjects.find(
      (gs) => gs.grade_id === effectiveGradeId && gs.subject_id === subjectId,
    );
    onChange({
      trackType: resolvedTrackType,
      gradeId: effectiveGradeId,
      subjectId,
      gradeSubjectId: match?.id || "",
      domainId: "",
    });
  };

  const handleDomainChange = (domainId: string) => {
    onChange({
      trackType: resolvedTrackType,
      gradeId: effectiveGradeId,
      subjectId: effectiveSubjectId,
      gradeSubjectId: effectiveGsId,
      domainId,
    });
  };

  const handleTrackChange = (nextTrackType: TrackType) => {
    onChange({
      trackType: nextTrackType,
      gradeId: effectiveGradeId,
      subjectId: effectiveSubjectId,
      gradeSubjectId: effectiveGsId,
      domainId: nextTrackType === "central" ? effectiveDomainId : "",
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {trackMode === "editable" && (
        <div className="space-y-2">
          <Label>المسار</Label>
          <Select
            key={`track-${resolvedTrackType}`}
            value={resolvedTrackType}
            onValueChange={handleTrackChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر المسار" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nafis">منصة SCIRISE (نافس)</SelectItem>
              <SelectItem value="central">الاختبار المركزي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>الصف</Label>
        <Select
          key={`grade-${effectiveGradeId || "none"}`}
          disabled={isLoading}
          value={effectiveGradeId || undefined}
          onValueChange={handleGradeChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="اختر الصف">
              {selectedGrade?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(grades.length > 0 ? grades : catalog?.grades || []).map((grade) => (
              <SelectItem key={grade.id} value={grade.id}>
                {grade.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>المادة</Label>
        <Select
          key={`subject-${effectiveGradeId || "none"}-${effectiveSubjectId || "none"}`}
          disabled={isLoading || !effectiveGradeId}
          value={effectiveSubjectId || undefined}
          onValueChange={handleSubjectChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="اختر المادة">
              {selectedSubject?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableSubjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {resolvedTrackType === "central" && requireDomainForCentral && (
        <div className="space-y-2">
          <Label>المجال</Label>
          <Select
            key={`domain-${effectiveGsId || "none"}-${effectiveDomainId || "none"}`}
            disabled={isLoading || (!effectiveGsId && !effectiveDomainId)}
            value={effectiveDomainId || undefined}
            onValueChange={handleDomainChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر المجال">
                {selectedDomain?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableDomains.map((domain) => (
                <SelectItem key={domain.id} value={domain.id}>
                  {domain.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
