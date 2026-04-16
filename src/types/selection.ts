export type TrackType = "nafis" | "central";
export type ExperienceType = "quick-quiz" | "interactive-games";

export interface AcademicGrade {
  id: string;
  name: string;
  slug?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface AcademicSubject {
  id: string;
  name: string;
  slug?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface AcademicGradeSubject {
  id: string;
  grade_id: string;
  subject_id: string;
  label?: string | null;
  sort_order: number;
  is_active: boolean;
  grade?: AcademicGrade;
  subject?: AcademicSubject;
}

export interface CentralDomain {
  id: string;
  grade_subject_id: string;
  name: string;
  slug?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface AcademicCatalog {
  grades: AcademicGrade[];
  subjects: AcademicSubject[];
  gradeSubjects: AcademicGradeSubject[];
  domains: CentralDomain[];
}

export interface SelectionContext {
  trackType: TrackType;
  experienceType: ExperienceType;
  gradeId: string;
  gradeName: string;
  subjectId: string;
  subjectName: string;
  gradeSubjectId: string;
  domainId?: string | null;
  domainName?: string | null;
}

export interface SelectionScopeValue {
  trackType: TrackType;
  gradeId: string;
  subjectId: string;
  gradeSubjectId: string;
  domainId: string;
}
