import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  createCentralDomain,
  createGradeSubjectMapping,
  createStudyGrade,
  createStudySubject,
  toggleCatalogItem,
} from "@/services/academicCatalogService";

interface GradeRow {
  id: string;
  name: string;
  is_active: boolean;
}

interface SubjectRow {
  id: string;
  name: string;
  is_active: boolean;
}

interface GradeSubjectRow {
  id: string;
  grade_id: string;
  subject_id: string;
  label?: string | null;
  is_active: boolean;
}

interface DomainRow {
  id: string;
  grade_subject_id: string;
  name: string;
  is_active: boolean;
}

export default function AdminCatalog() {
  const [isLoading, setIsLoading] = useState(true);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [gradeSubjects, setGradeSubjects] = useState<GradeSubjectRow[]>([]);
  const [domains, setDomains] = useState<DomainRow[]>([]);

  const [newGrade, setNewGrade] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [mappingGradeId, setMappingGradeId] = useState("");
  const [mappingSubjectId, setMappingSubjectId] = useState("");
  const [mappingLabel, setMappingLabel] = useState("");
  const [domainGradeSubjectId, setDomainGradeSubjectId] = useState("");
  const [domainName, setDomainName] = useState("");

  const gradeMap = useMemo(
    () => new Map(grades.map((grade) => [grade.id, grade])),
    [grades],
  );
  const subjectMap = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  );

  const fetchCatalog = async () => {
    setIsLoading(true);
    try {
      const [gradesResult, subjectsResult, gradeSubjectsResult, domainsResult] =
        await Promise.all([
          supabase
            .from("study_grades")
            .select("*")
            .order("sort_order", { ascending: true }),
          supabase
            .from("study_subjects")
            .select("*")
            .order("sort_order", { ascending: true }),
          supabase
            .from("study_grade_subjects")
            .select("*")
            .order("sort_order", { ascending: true }),
          supabase
            .from("central_domains")
            .select("*")
            .order("sort_order", { ascending: true }),
        ]);

      if (gradesResult.error) throw gradesResult.error;
      if (subjectsResult.error) throw subjectsResult.error;
      if (gradeSubjectsResult.error) throw gradeSubjectsResult.error;
      if (domainsResult.error) throw domainsResult.error;

      setGrades((gradesResult.data || []) as GradeRow[]);
      setSubjects((subjectsResult.data || []) as SubjectRow[]);
      setGradeSubjects((gradeSubjectsResult.data || []) as GradeSubjectRow[]);
      setDomains((domainsResult.data || []) as DomainRow[]);
    } catch (error) {
      console.error("Failed to fetch academic catalog", error);
      toast.error("فشل تحميل بيانات الكتالوج");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleCreateGrade = async () => {
    if (!newGrade.trim()) {
      toast.error("يرجى إدخال اسم الصف");
      return;
    }

    const { error } = await createStudyGrade(newGrade.trim());
    if (error) {
      toast.error(error.message);
      return;
    }

    setNewGrade("");
    toast.success("تمت إضافة الصف");
    fetchCatalog();
  };

  const handleCreateSubject = async () => {
    if (!newSubject.trim()) {
      toast.error("يرجى إدخال اسم المادة");
      return;
    }

    const { error } = await createStudySubject(newSubject.trim());
    if (error) {
      toast.error(error.message);
      return;
    }

    setNewSubject("");
    toast.success("تمت إضافة المادة");
    fetchCatalog();
  };

  const handleCreateMapping = async () => {
    if (!mappingGradeId || !mappingSubjectId) {
      toast.error("يرجى اختيار الصف والمادة");
      return;
    }

    const { error } = await createGradeSubjectMapping({
      gradeId: mappingGradeId,
      subjectId: mappingSubjectId,
      label: mappingLabel.trim() || undefined,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    setMappingGradeId("");
    setMappingSubjectId("");
    setMappingLabel("");
    toast.success("تم إنشاء الربط بين الصف والمادة");
    fetchCatalog();
  };

  const handleCreateDomain = async () => {
    if (!domainGradeSubjectId || !domainName.trim()) {
      toast.error("يرجى اختيار الربط واسم المجال");
      return;
    }

    const { error } = await createCentralDomain({
      gradeSubjectId: domainGradeSubjectId,
      name: domainName.trim(),
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    setDomainGradeSubjectId("");
    setDomainName("");
    toast.success("تمت إضافة المجال");
    fetchCatalog();
  };

  const handleToggle = async (
    table:
      | "study_grades"
      | "study_subjects"
      | "study_grade_subjects"
      | "central_domains",
    id: string,
    isActive: boolean,
  ) => {
    const { error } = await toggleCatalogItem(table, id, isActive);
    if (error) {
      toast.error(error.message);
      return;
    }

    fetchCatalog();
  };

  const getGradeSubjectLabel = (item: GradeSubjectRow) => {
    return (
      item.label ||
      `${gradeMap.get(item.grade_id)?.name || "صف"} - ${
        subjectMap.get(item.subject_id)?.name || "مادة"
      }`
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm border">
        <h1 className="text-2xl font-black text-slate-900">الكتالوج الدراسي</h1>
        <p className="mt-2 text-sm text-slate-500">
          من هنا تتم إدارة الصفوف والمواد وروابطها والمجالات المستخدمة في
          المسار المركزي.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6 border shadow-sm">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">الصفوف</h2>
              <p className="text-sm text-slate-500">إضافة وتفعيل الصفوف الدراسية</p>
            </div>
            <div className="flex gap-3">
              <Input
                value={newGrade}
                onChange={(e) => setNewGrade(e.target.value)}
                placeholder="مثال: ثالث متوسط"
              />
              <Button onClick={handleCreateGrade}>إضافة</Button>
            </div>
            <div className="space-y-3">
              {grades.map((grade) => (
                <div
                  key={grade.id}
                  className="flex items-center justify-between rounded-2xl border bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900">{grade.name}</span>
                    <Badge variant={grade.is_active ? "default" : "secondary"}>
                      {grade.is_active ? "نشط" : "موقف"}
                    </Badge>
                  </div>
                  <Switch
                    checked={grade.is_active}
                    onCheckedChange={(checked) =>
                      handleToggle("study_grades", grade.id, checked)
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-6 border shadow-sm">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">المواد</h2>
              <p className="text-sm text-slate-500">إدارة المواد المتاحة للطلاب</p>
            </div>
            <div className="flex gap-3">
              <Input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="مثال: علوم"
              />
              <Button onClick={handleCreateSubject}>إضافة</Button>
            </div>
            <div className="space-y-3">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="flex items-center justify-between rounded-2xl border bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900">{subject.name}</span>
                    <Badge variant={subject.is_active ? "default" : "secondary"}>
                      {subject.is_active ? "نشط" : "موقف"}
                    </Badge>
                  </div>
                  <Switch
                    checked={subject.is_active}
                    onCheckedChange={(checked) =>
                      handleToggle("study_subjects", subject.id, checked)
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-6 border shadow-sm">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                ربط الصفوف بالمواد
              </h2>
              <p className="text-sm text-slate-500">
                هذا الربط ينتج `grade_subject_id` المستخدم في جميع التدفقات
              </p>
            </div>
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label>الصف</Label>
                <Select
                  value={mappingGradeId || undefined}
                  onValueChange={setMappingGradeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الصف" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((grade) => (
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
                  value={mappingSubjectId || undefined}
                  onValueChange={setMappingSubjectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المادة" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                value={mappingLabel}
                onChange={(e) => setMappingLabel(e.target.value)}
                placeholder="عنوان اختياري للربط"
              />
              <Button onClick={handleCreateMapping}>إضافة الربط</Button>
            </div>
            <div className="space-y-3">
              {gradeSubjects.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl border bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900">
                      {getGradeSubjectLabel(item)}
                    </span>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? "نشط" : "موقف"}
                    </Badge>
                  </div>
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={(checked) =>
                      handleToggle("study_grade_subjects", item.id, checked)
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-6 border shadow-sm">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">المجالات المركزية</h2>
              <p className="text-sm text-slate-500">
                المجالات المرتبطة فقط بالمسار المركزي
              </p>
            </div>
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label>الربط الدراسي</Label>
                <Select
                  value={domainGradeSubjectId || undefined}
                  onValueChange={setDomainGradeSubjectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الربط" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeSubjects.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {getGradeSubjectLabel(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                placeholder="مثال: فيزياء"
              />
              <Button onClick={handleCreateDomain}>إضافة المجال</Button>
            </div>
            <div className="space-y-3">
              {domains.map((domain) => (
                <div
                  key={domain.id}
                  className="flex items-center justify-between rounded-2xl border bg-slate-50 px-4 py-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900">{domain.name}</span>
                      <Badge variant={domain.is_active ? "default" : "secondary"}>
                        {domain.is_active ? "نشط" : "موقف"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      {getGradeSubjectLabel(
                        gradeSubjects.find((item) => item.id === domain.grade_subject_id) || {
                          id: "",
                          grade_id: "",
                          subject_id: "",
                          label: "",
                          is_active: false,
                        },
                      )}
                    </p>
                  </div>
                  <Switch
                    checked={domain.is_active}
                    onCheckedChange={(checked) =>
                      handleToggle("central_domains", domain.id, checked)
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {isLoading && (
        <div className="rounded-2xl border bg-white p-4 text-sm text-slate-500">
          جاري تحميل الكتالوج...
        </div>
      )}
    </div>
  );
}
