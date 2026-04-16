import { supabase } from "@/integrations/supabase/client";
import {
  AcademicCatalog,
  AcademicGrade,
  AcademicGradeSubject,
  AcademicSubject,
  CentralDomain,
} from "@/types/selection";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
}

export async function getAcademicCatalog(): Promise<AcademicCatalog> {
  const [gradesResult, subjectsResult, gradeSubjectsResult, domainsResult] =
    await Promise.all([
      supabase
        .from("study_grades")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("study_subjects")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("study_grade_subjects")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("central_domains")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

  if (gradesResult.error) throw gradesResult.error;
  if (subjectsResult.error) throw subjectsResult.error;
  if (gradeSubjectsResult.error) throw gradeSubjectsResult.error;
  if (domainsResult.error) throw domainsResult.error;

  const grades = (gradesResult.data || []) as AcademicGrade[];
  const subjects = (subjectsResult.data || []) as AcademicSubject[];
  const gradeSubjectsBase = (gradeSubjectsResult.data ||
    []) as AcademicGradeSubject[];
  const domains = (domainsResult.data || []) as CentralDomain[];

  const gradeMap = new Map(grades.map((grade) => [grade.id, grade]));
  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));

  const gradeSubjects = gradeSubjectsBase.map((item) => ({
    ...item,
    grade: gradeMap.get(item.grade_id),
    subject: subjectMap.get(item.subject_id),
  }));

  return {
    grades,
    subjects,
    gradeSubjects,
    domains,
  };
}

export async function createStudyGrade(name: string) {
  return supabase
    .from("study_grades")
    .insert({
      name,
      slug: slugify(name),
      is_active: true,
    })
    .select()
    .single();
}

export async function createStudySubject(name: string) {
  return supabase
    .from("study_subjects")
    .insert({
      name,
      slug: slugify(name),
      is_active: true,
    })
    .select()
    .single();
}

export async function createGradeSubjectMapping(input: {
  gradeId: string;
  subjectId: string;
  label?: string;
}) {
  return supabase
    .from("study_grade_subjects")
    .insert({
      grade_id: input.gradeId,
      subject_id: input.subjectId,
      label: input.label || null,
      is_active: true,
    })
    .select()
    .single();
}

export async function createCentralDomain(input: {
  gradeSubjectId: string;
  name: string;
}) {
  return supabase
    .from("central_domains")
    .insert({
      grade_subject_id: input.gradeSubjectId,
      name: input.name,
      slug: slugify(input.name),
      is_active: true,
    })
    .select()
    .single();
}

export async function toggleCatalogItem(
  table:
    | "study_grades"
    | "study_subjects"
    | "study_grade_subjects"
    | "central_domains",
  id: string,
  isActive: boolean,
) {
  return supabase.from(table).update({ is_active: isActive }).eq("id", id);
}
