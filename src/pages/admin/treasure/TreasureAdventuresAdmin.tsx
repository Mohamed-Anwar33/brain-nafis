import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SelectionScopeFields } from "@/components/admin/SelectionScopeFields";
import { TreasureAdventureForm } from "@/components/admin/treasure/TreasureAdventureForm";
import { TreasurePreviewModal } from "@/components/admin/treasure/TreasurePreviewModal";
import { treasureService } from "@/services/treasureService";
import { TreasureAdventure, AdminPreviewResponse } from "@/types/treasure";
import { SelectionScopeValue } from "@/types/selection";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Compass,
  Plus,
  Search,
  Filter,
  Eye,
  Send,
  Power,
  Trash2,
  Copy,
  Clock,
  Key,
  Layers,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Pencil,
  ArrowRight,
  ChevronRight,
  LayoutDashboard,
  BarChart3,
  BookOpen,
  Target,
  Trophy,
  Gamepad2,
  Menu,
  X,
  LogOut,
} from "lucide-react";

function getStatusBadgeVariant(status: string): "default" | "outline" | "secondary" | "destructive" {
  switch (status) {
    case "published":
      return "default";
    case "draft":
      return "outline";
    default:
      return "secondary";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "published":
      return "منشورة للطلاب";
    case "draft":
      return "مسودة غير منشورة";
    case "inactive":
      return "معطلة مؤقتًا";
    case "archived":
      return "مؤرشفة";
    default:
      return status;
  }
}

export default function TreasureAdventuresAdmin() {
  const navigate = useNavigate();
  const [adventures, setAdventures] = useState<TreasureAdventure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editAdventure, setEditAdventure] = useState<TreasureAdventure | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  // Scope filter
  const [filterScope, setFilterScope] = useState<SelectionScopeValue>({
    trackType: "nafis",
    gradeId: "",
    subjectId: "",
    gradeSubjectId: "",
    domainId: "",
  });

  // Preview state
  const [previewData, setPreviewData] = useState<AdminPreviewResponse | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  // Action loaders
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const fetchAdventures = async () => {
    try {
      setLoading(true);
      const data = await treasureService.getAdventures({
        scope: filterScope,
      });
      setAdventures(data);
    } catch (err: any) {
      toast.error(err.message || "فشل تحميل المغامرات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdventures();
  }, [filterScope]);

  // Handle Publish
  const handlePublish = async (adv: TreasureAdventure) => {
    // Find draft version or latest version
    const targetVersion =
      adv.versions?.find((v) => v.is_draft) ||
      adv.versions?.[0];

    if (!targetVersion) {
      toast.error("لا توجد نسخة متاحة للنشر في هذه المغامرة");
      return;
    }

    try {
      setPublishingId(adv.id);
      await treasureService.publishAdventure(adv.id, targetVersion.id);
      toast.success("تم اعتماد ونشر المغامرة للطلاب بنجاح!");
      fetchAdventures();
    } catch (err: any) {
      toast.error(err.message || "فشل نشر المغامرة");
    } finally {
      setPublishingId(null);
    }
  };

  // Handle Status Toggle (Active / Inactive)
  const handleToggleStatus = async (adv: TreasureAdventure) => {
    const nextStatus = adv.status === "published" ? "inactive" : "published";
    try {
      await treasureService.updateAdventureStatus(adv.id, nextStatus);
      toast.success(
        nextStatus === "published"
          ? "تم تفعيل المغامرة للطلاب"
          : "تم تعطيل المغامرة مؤقتًا"
      );
      fetchAdventures();
    } catch (err: any) {
      toast.error(err.message || "فشل تعديل حالة المغامرة");
    }
  };

  // Handle Archive (Soft Delete)
  const handleArchive = async (adv: TreasureAdventure) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في أرشفة المغامرة "${adv.title}"؟`)) {
      return;
    }

    try {
      await treasureService.updateAdventureStatus(adv.id, "archived");
      toast.success("تم أرشفة المغامرة بنجاح");
      fetchAdventures();
    } catch (err: any) {
      toast.error(err.message || "فشل أرشفة المغامرة");
    }
  };

  // Handle Admin Live Preview
  const handlePreview = async (adv: TreasureAdventure) => {
    try {
      setPreviewLoadingId(adv.id);
      const res = await treasureService.previewAdventure(adv.id);
      setPreviewData(res);
      setIsPreviewOpen(true);
    } catch (err: any) {
      toast.error(err.message || "فشل توليد المعاينة");
    } finally {
      setPreviewLoadingId(null);
    }
  };

  // Filtered adventures
  const filteredAdventures = adventures.filter((adv) => {
    if (!searchQuery.trim()) return true;
    return (
      adv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adv.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-card border-b border-border p-4 flex items-center justify-between">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg hover:bg-secondary"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <div className="flex items-center gap-2">
          <Compass className="w-6 h-6 text-amber-600" />
          <span className="font-bold text-lg">مغامرة الكنز</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/admin/system-selector")}
          className="text-xs gap-1 font-bold"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>رجوع</span>
        </Button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed lg:static inset-y-0 right-0 z-40 w-72 bg-card border-l border-border transition-transform duration-300",
            "lg:translate-x-0",
            isSidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Compass className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-lg text-slate-800">مغامرة الكنز</h1>
                  <p className="text-xs text-slate-500">إدارة وتعديل الأسئلة</p>
                </div>
              </div>

              {/* Back to system selector */}
              <Link
                to="/admin/system-selector"
                className="mt-4 flex items-center gap-2 text-sm text-slate-600 hover:text-amber-700 font-medium transition-colors p-2 rounded-lg bg-slate-50 hover:bg-amber-50"
              >
                <ArrowRight className="w-4 h-4 text-amber-600" />
                <span>العودة لاختيار النظام</span>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 mt-2">
              <Link
                to="/admin/treasure"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all bg-amber-500 text-white shadow-md shadow-amber-500/20"
              >
                <Compass className="w-5 h-5" />
                <span className="font-medium">إدارة مغامرات الكنز</span>
              </Link>

              <Link
                to="/games/treasure/active"
                target="_blank"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-slate-100 text-slate-600"
              >
                <Gamepad2 className="w-5 h-5 text-amber-600" />
                <span className="font-medium">تجربة اللعبة للطلاب ↗</span>
              </Link>
            </nav>

            {/* Cross-system navigation */}
            <div className="px-4 py-3 border-t border-border bg-slate-50/50">
              <p className="text-xs font-semibold text-slate-400 px-2 mb-2">
                الأنظمة الأخرى
              </p>
              <div className="space-y-1">
                <Link
                  to="/admin/nafis"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>نظام براين ساينس (نافس)</span>
                </Link>
                <Link
                  to="/admin/central-exam"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition-colors"
                >
                  <Target className="w-4 h-4 text-indigo-600" />
                  <span>الاختبار المركزي</span>
                </Link>
                <Link
                  to="/admin/results"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Trophy className="w-4 h-4 text-emerald-600" />
                  <span>النتائج والتقارير</span>
                </Link>
              </div>
            </div>

            {/* Logout */}
            <div className="p-4 border-t border-border">
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-5 h-5" />
                <span>تسجيل الخروج</span>
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-h-screen min-w-0 w-full overflow-x-hidden">
          <div className="p-4 lg:p-8 w-full max-w-7xl mx-auto space-y-6">
            {/* Top Navigation & Back Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border p-3 sm:p-4 rounded-2xl shadow-xs">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin/system-selector")}
                  className="gap-2 text-stone-800 hover:text-stone-950 font-bold hover:bg-amber-50 border-amber-400 bg-amber-50/40"
                >
                  <ArrowRight className="w-4 h-4 text-amber-600" />
                  <span>العودة لاختيار النظام</span>
                </Button>

                <span className="text-muted-foreground/40 hidden sm:inline">|</span>

                {/* Quick Breadcrumbs */}
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Link to="/admin/system-selector" className="hover:text-primary transition-colors">
                    لوحة الإدارة
                  </Link>
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                  <span className="font-bold text-foreground">مغامرات الكنز</span>
                </div>
              </div>

              {/* Quick System Navigation Switcher */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/admin/nafis")}
                  className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>نظام نافس</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/admin/central-exam")}
                  className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <Target className="w-3.5 h-3.5 text-indigo-600" />
                  <span>الاختبارات المركزية</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/admin/results")}
                  className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                  <span>النتائج والتقارير</span>
                </Button>
              </div>
            </div>

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <Compass className="w-8 h-8 text-amber-300 animate-spin-slow" />
            <h1 className="text-2xl sm:text-3xl font-black">
              إدارة مغامرات الكنز (Treasure Adventures Admin)
            </h1>
          </div>
          <p className="text-amber-100 text-sm max-w-xl">
            إدارة مغامرات الكنز وإعداد وتعديل الأسئلة والتحديات بكل سهولة.
          </p>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <Button
            onClick={() => navigate("/admin/system-selector")}
            variant="secondary"
            className="font-bold px-4 py-6 rounded-2xl shadow-md gap-2 text-stone-800 bg-amber-100/90 hover:bg-amber-100"
          >
            <ArrowRight className="w-4 h-4" /> العودة للرئيسية
          </Button>

          <Button
            onClick={() => {
              setEditAdventure(null);
              setIsCreateOpen(true);
            }}
            className="bg-white text-amber-900 hover:bg-amber-50 font-bold px-5 py-6 rounded-2xl shadow-md gap-2"
          >
            <Plus className="w-5 h-5" /> إنشاء مغامرة جديدة
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="rounded-2xl shadow-sm border">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="البحث عن مغامرة بالاسم أو الوصف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>إجمالي المغامرات: {adventures.length}</span>
            </div>
          </div>

          <div className="border-t pt-3">
            <SelectionScopeFields value={filterScope} onChange={setFilterScope} />
          </div>
        </CardContent>
      </Card>

      {/* Adventures Grid */}
      {loading ? (
        <div className="text-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground font-semibold text-sm">جاري تحميل مغامرات الكنز...</p>
        </div>
      ) : filteredAdventures.length === 0 ? (
        <Card className="p-12 text-center border-dashed rounded-3xl">
          <Compass className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-foreground">لا توجد مغامرات كنز مطابقة</h3>
          <p className="text-muted-foreground text-xs mt-1 mb-4">
            ابدأ بإنشاء أول مغامرة وأضف أسئلتها التعليمية الآن.
          </p>
          <Button
            onClick={() => {
              setEditAdventure(null);
              setIsCreateOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" /> إنشاء مغامرة جديدة
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAdventures.map((adv) => {
            const hasDraft = adv.versions?.some((v) => v.is_draft);

            return (
              <Card
                key={adv.id}
                className="rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                <CardHeader className="p-5 pb-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={getStatusBadgeVariant(adv.status)}>
                      {getStatusLabel(adv.status)}
                    </Badge>

                    <span className="text-[11px] font-semibold text-muted-foreground">
                      المسار: {adv.track_type.toUpperCase()}
                    </span>
                  </div>

                  <CardTitle className="text-lg font-bold leading-snug line-clamp-1">
                    {adv.title}
                  </CardTitle>

                  {adv.description && (
                    <CardDescription className="text-xs line-clamp-2">
                      {adv.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-4">
                  <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl space-y-1">
                    <div className="flex justify-between">
                      <span>إجمالي النسخ:</span>
                      <span className="font-bold text-foreground">{adv.versions?.length || 1}</span>
                    </div>
                    {hasDraft && (
                      <div className="text-amber-700 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> مسودة جديدة جاهزة للنشر
                      </div>
                    )}
                  </div>

                  {/* Actions Toolbar */}
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditAdventure(adv);
                        setIsCreateOpen(true);
                      }}
                      className="gap-1 text-xs border-amber-500/40 text-amber-900 hover:bg-amber-50"
                      title="تعديل أو إضافة وحذف الأسئلة"
                    >
                      <Pencil className="w-3.5 h-3.5 text-amber-600" />
                      تعديل
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(adv)}
                      disabled={previewLoadingId === adv.id}
                      className="gap-1 text-xs"
                    >
                      {previewLoadingId === adv.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-primary" />
                      )}
                      معاينة
                    </Button>

                    {adv.status !== "published" || hasDraft ? (
                      <Button
                        size="sm"
                        onClick={() => handlePublish(adv)}
                        disabled={publishingId === adv.id}
                        className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {publishingId === adv.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        نشر
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleToggleStatus(adv)}
                        className="gap-1 text-xs text-amber-800"
                      >
                        <Power className="w-3.5 h-3.5" /> تعطيل
                      </Button>
                    )}
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleArchive(adv)}
                      className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 text-xs gap-1 h-8"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> أرشفة المغامرة
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Adventure Modal */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setEditAdventure(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Compass className="w-6 h-6 text-primary" />
              {editAdventure
                ? `تعديل أسئلة المغامرة: ${editAdventure.title}`
                : "إنشاء مغامرة كنز جديدة وإضافة الأسئلة"}
            </DialogTitle>
          </DialogHeader>

          <TreasureAdventureForm
            initialAdventure={editAdventure}
            onSuccess={() => {
              setIsCreateOpen(false);
              fetchAdventures();
            }}
            onCancel={() => setIsCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Admin Simulation Preview Modal */}
      <TreasurePreviewModal
        open={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewData(null);
        }}
        previewData={previewData}
      />
          </div>
        </main>
      </div>
    </div>
  );
}
