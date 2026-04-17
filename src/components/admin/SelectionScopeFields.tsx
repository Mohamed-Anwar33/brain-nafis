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

  useEffect(() => {
    if (!value.gradeSubjectId || !catalog) {
      return;
    }

    const match = gradeSubjects.find((item) => item.id === value.gradeSubjectId);
    if (
      match &&
      (match.grade_id !== value.gradeId || match.subject_id !== value.subjectId)
    ) {
      onChange({
        ...value,
        gradeId: match.grade_id,
        subjectId: match.subject_id,
      });
    }
  }, [catalog, gradeSubjects, onChange, value]);

  const availableSubjects = useMemo(() => {
    if (!catalog?.subjects || !value.gradeId) {
      return [];
    }

    const subjectIds = new Set(
      gradeSubjects
        .filter((item) => item.grade_id === value.gradeId)
        .map((item) => item.subject_id),
    );

    return catalog.subjects.filter((subject) => subjectIds.has(subject.id));
  }, [catalog, gradeSubjects, value.gradeId]);

  const availableDomains = useMemo(
    () =>
      domains.filter((domain) => domain.grade_subject_id === value.gradeSubjectId),
    [domains, value.gradeSubjectId],
  );

  const resolvedTrackType: TrackType =
    trackMode === "nafis"
      ? "nafis"
      : trackMode === "central"
        ? "central"
        : value.trackType;

  useEffect(() => {
    if (resolvedTrackType !== value.trackType) {
      onChange({
        ...value,
        trackType: resolvedTrackType,
        domainId: resolvedTrackType === "central" ? value.domainId : "",
      });
    }
  }, [onChange, resolvedTrackType, value]);

  useEffect(() => {
    if (!catalog) {
      return;
    }

    if (!value.gradeId || !value.subjectId) {
      if (value.gradeSubjectId || value.domainId) {
        onChange({
          ...value,
          gradeSubjectId: "",
          domainId: "",
        });
      }
      return;
    }

    const match = gradeSubjects.find(
      (item) =>
        item.grade_id === value.gradeId && item.subject_id === value.subjectId,
    );
    const nextGradeSubjectId = match?.id || "";

    if (nextGradeSubjectId !== value.gradeSubjectId) {
      onChange({
        ...value,
        gradeSubjectId: nextGradeSubjectId,
        domainId: "",
      });
    }
  }, [catalog, gradeSubjects, onChange, value]);

  useEffect(() => {
    if (resolvedTrackType !== "central" && value.domainId) {
      onChange({
        ...value,
        domainId: "",
      });
      return;
    }

    if (
      resolvedTrackType === "central" &&
      value.domainId &&
      !availableDomains.some((domain) => domain.id === value.domainId)
    ) {
      onChange({
        ...value,
        domainId: "",
      });
    }
  }, [availableDomains, onChange, resolvedTrackType, value]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {trackMode === "editable" && (
        <div className="space-y-2">
          <Label>المسار</Label>
          <Select
            value={resolvedTrackType}
            onValueChange={(nextTrackType: TrackType) =>
              onChange({
                ...value,
                trackType: nextTrackType,
                domainId: nextTrackType === "central" ? value.domainId : "",
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر المسار" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nafis">براين ساينس</SelectItem>
              <SelectItem value="central">الاختبار المركزي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>الصف</Label>
        <Select
          disabled={isLoading}
          value={value.gradeId || undefined}
          onValueChange={(gradeId) =>
            onChange({
              ...value,
              gradeId,
              subjectId: "",
              gradeSubjectId: "",
              domainId: "",
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="اختر الصف" />
          </SelectTrigger>
          <SelectContent>
            {(catalog?.grades || []).map((grade) => (
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
          disabled={isLoading || !value.gradeId}
          value={value.subjectId || undefined}
          onValueChange={(subjectId) =>
            onChange({
              ...value,
              subjectId,
              gradeSubjectId: "",
              domainId: "",
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="اختر المادة" />
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
            disabled={isLoading || !value.gradeSubjectId}
            value={value.domainId || undefined}
            onValueChange={(domainId) =>
              onChange({
                ...value,
                domainId,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر المجال" />
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
