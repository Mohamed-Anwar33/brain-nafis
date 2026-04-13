import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Trophy, Search, Users, Gamepad2, FileQuestion, Clock,
    ChevronRight, ChevronLeft, Zap, Target, Puzzle, Timer, Trash2,
    CheckCircle2, XCircle, Sparkles, LayoutList,
} from "lucide-react";
import { toast } from "sonner";

interface UnifiedResult {
    id: string;
    type: "exam" | "game";
    student_name: string;
    game_type?: string | null;
    game_label?: string | null;
    section_label?: string | null;
    score: number;
    total: number;
    correct_answers: number;
    answered_count: number;
    penalty: number;
    duration: string;
    date: string;
    raw_date: string;
    email_sent: boolean;
    status: "completed" | "abandoned";
}

export default function AdminResults() {
    const [results, setResults] = useState<UnifiedResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(0);
    const [totalExams, setTotalExams] = useState(0);
    const [totalGames, setTotalGames] = useState(0);
    const [filteredCount, setFilteredCount] = useState(0);
    const pageSize = 25;

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("ar-EG", {
            year: "numeric", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit",
        });
    };

    const formatDuration = (start: string, end: string) => {
        if (!start || !end) return "—";
        const diff = new Date(end).getTime() - new Date(start).getTime();
        if (diff < 0) return "—";
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        return `${mins}د ${secs}ث`;
    };

    const formatGameDuration = (seconds?: number | null) => {
        if (!seconds && seconds !== 0) return "—";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}د ${secs}ث`;
    };

    const fetchAllResults = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch exam attempts
            const { data: exams } = await supabase
                .from("attempts")
                .select("*")
                .order("started_at", { ascending: false });

            // Fetch game attempts
            const { data: games, error: gamesError } = await supabase
                .from("game_attempts")
                .select("*")
                .order("created_at", { ascending: false });

            if (gamesError) console.error("Error fetching games:", gamesError);

            // Fetch correct answer counts for exams from attempt_answers
            const { data: allAnswers } = await supabase
                .from("attempt_answers")
                .select("attempt_id, is_correct");

            // Build maps: attempt_id -> correct count, attempt_id -> total answered
            const correctCountMap: Record<string, number> = {};
            const answeredCountMap: Record<string, number> = {};
            (allAnswers || []).forEach((a: any) => {
                answeredCountMap[a.attempt_id] = (answeredCountMap[a.attempt_id] || 0) + 1;
                if (a.is_correct) {
                    correctCountMap[a.attempt_id] = (correctCountMap[a.attempt_id] || 0) + 1;
                }
            });

            // Fetch student profiles for name mapping
            const userIds = [...new Set((games || []).map(g => g.user_id).filter(Boolean))];
            let profileMap: Record<string, string> = {};
            if (userIds.length > 0) {
                const { data: profiles } = await supabase
                    .from("student_profiles")
                    .select("id, full_name")
                    .in("id", userIds);
                if (profiles) {
                    profiles.forEach(p => { profileMap[p.id] = p.full_name || "طالب"; });
                }
            }

            const unified: UnifiedResult[] = [];

            // Map exams
            if (exams) {
                setTotalExams(exams.length);
                exams.forEach(e => {
                    // Determine completion status
                    let status: "completed" | "abandoned" = "completed";
                    const correctAnswers = correctCountMap[e.id] || 0;
                    const answeredCount = answeredCountMap[e.id] || 0;

                    if (!e.finished_at) {
                        // If student answered all questions, they completed even without finished_at
                        if (answeredCount >= (e.question_count || 0) && (e.question_count || 0) > 0) {
                            status = "completed";
                        } else {
                            status = "abandoned";
                        }
                    }

                    unified.push({
                        id: e.id,
                        type: "exam",
                        student_name: e.student_name || "بدون اسم",
                        score: e.score || 0,
                        total: e.question_count || 0,
                        correct_answers: correctAnswers,
                        answered_count: answeredCount,
                        penalty: e.total_penalty || 0,
                        duration: formatDuration(e.started_at, e.finished_at),
                        date: formatDate(e.started_at),
                        raw_date: e.started_at || "",
                        email_sent: e.teacher_email_sent || false,
                        status,
                    });
                });
            }

            // Map games
            if (games) {
                setTotalGames(games.length);
                games.forEach(g => {
                    // Get name from metadata first, then fallback to profile map, then "طالب"
                    const metadata = g.metadata && typeof g.metadata === "object" ? g.metadata : {};
                    const nameFromMetadata =
                        typeof metadata.student_name === "string" ? metadata.student_name : "";
                    const name = nameFromMetadata || profileMap[g.user_id] || "طالب";
                    const gameName =
                        typeof metadata.game_name === "string" ? metadata.game_name : null;
                    const sectionLabel =
                        typeof metadata.section_name === "string"
                            ? metadata.section_name
                            : typeof metadata.sections_count === "number" && typeof metadata.total_sections === "number"
                                ? `${metadata.sections_count}/${metadata.total_sections} أقسام`
                                : null;
                    
                    unified.push({
                        id: g.id,
                        type: "game",
                        student_name: name,
                        game_type: g.game_type || null,
                        game_label: gameName,
                        section_label: sectionLabel,
                        score: g.score || 0,
                        total: g.total_questions || 0,
                        correct_answers: g.correct_count || 0,
                        answered_count: g.total_questions || 0,
                        penalty: 0,
                        duration: formatGameDuration(g.duration_seconds),
                        date: formatDate(g.created_at),
                        raw_date: g.created_at || "",
                        email_sent: g.teacher_email_sent || false,
                        status: "completed" as const,
                    });
                });
            }

            // Sort by date (newest first)
            unified.sort((a, b) => new Date(b.raw_date).getTime() - new Date(a.raw_date).getTime());

            // Filter by search
            let filtered = unified;
            if (searchQuery.trim()) {
                filtered = unified.filter(r =>
                    r.student_name.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }

            // Paginate
            const start = currentPage * pageSize;
            setFilteredCount(filtered.length);
            setResults(filtered.slice(start, start + pageSize));
        } catch (err) {
            console.error("Error fetching results:", err);
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, searchQuery]);

    useEffect(() => {
        fetchAllResults();
    }, [fetchAllResults]);

    useEffect(() => {
        setCurrentPage(0);
    }, [searchQuery]);

    const totalCount = totalExams + totalGames;
    const totalPages = Math.ceil(filteredCount / pageSize);

    const getScoreBadge = (score: number, total: number) => {
        if (total === 0) return { color: "bg-slate-100 text-slate-600", label: "—" };
        const pct = (score / total) * 100;
        if (pct >= 90) return { color: "bg-emerald-100 text-emerald-700", label: "ممتاز" };
        if (pct >= 75) return { color: "bg-blue-100 text-blue-700", label: "جيد جداً" };
        if (pct >= 60) return { color: "bg-amber-100 text-amber-700", label: "جيد" };
        return { color: "bg-red-100 text-red-700", label: "يحتاج تحسين" };
    };

    const getTypeLabel = (r: UnifiedResult) => {
        if (r.type === "exam") return { label: "الاختبار السريع", icon: <FileQuestion className="w-3.5 h-3.5" />, color: "bg-blue-100 text-blue-700" };
        
        // Handle central exam
        if (r.game_type === "central_exam" || r.game_type?.includes("اختبار")) {
            return { label: "الاختبار التفاعلي", icon: <Target className="w-3.5 h-3.5" />, color: "bg-indigo-100 text-indigo-700" };
        }
        
        // Use game_type directly if it's a full name (like "عجلة العلوم الدوارة")
        if (r.game_type && r.game_type.includes("عجلة")) {
            return { label: r.game_type, icon: <Sparkles className="w-3.5 h-3.5" />, color: "bg-rose-100 text-rose-700" };
        }
        
        // Legacy game types
        switch (r.game_type) {
            case "wheel_science": return { label: "عجلة العلوم", icon: <Sparkles className="w-3.5 h-3.5" />, color: "bg-rose-100 text-rose-700" };
            case "speed": return { label: "تحدي السرعة", icon: <Timer className="w-3.5 h-3.5" />, color: "bg-amber-100 text-amber-700" };
            case "matching": return { label: "لعبة المطابقة", icon: <Gamepad2 className="w-3.5 h-3.5" />, color: "bg-purple-100 text-purple-700" };
            case "ordering": return { label: "لغز الترتيب", icon: <Puzzle className="w-3.5 h-3.5" />, color: "bg-cyan-100 text-cyan-700" };
            default: return { label: r.game_type || "لعبة", icon: <Gamepad2 className="w-3.5 h-3.5" />, color: "bg-slate-100 text-slate-600" };
        }
    };

    const getResultTypeLabel = (r: UnifiedResult) => {
        if (r.type === "exam") {
            return { label: "الاختبار السريع", icon: <FileQuestion className="w-3.5 h-3.5" />, color: "bg-blue-100 text-blue-700" };
        }

        switch (r.game_type) {
            case "central_exam":
                return { label: r.game_label || "الاختبار المركزي الشامل", icon: <Target className="w-3.5 h-3.5" />, color: "bg-indigo-100 text-indigo-700" };
            case "wheel_science":
                return { label: r.game_label || "عجلة العلوم الدوارة", icon: <Sparkles className="w-3.5 h-3.5" />, color: "bg-rose-100 text-rose-700" };
            case "stages":
                return { label: r.game_label || "لعبة ترتيب المراحل", icon: <LayoutList className="w-3.5 h-3.5" />, color: "bg-sky-100 text-sky-700" };
            case "speed":
                return { label: r.game_label || "تحدي السرعة", icon: <Timer className="w-3.5 h-3.5" />, color: "bg-amber-100 text-amber-700" };
            case "matching":
                return { label: r.game_label || "لعبة المطابقة", icon: <Gamepad2 className="w-3.5 h-3.5" />, color: "bg-purple-100 text-purple-700" };
            case "ordering":
                return { label: r.game_label || "لغز الترتيب", icon: <Puzzle className="w-3.5 h-3.5" />, color: "bg-cyan-100 text-cyan-700" };
            default:
                return { label: r.game_label || r.game_type || "لعبة", icon: <Gamepad2 className="w-3.5 h-3.5" />, color: "bg-slate-100 text-slate-600" };
        }
    };

    const handleDelete = (r: UnifiedResult) => {
        toast.error(
            `هل تريد حذف نتيجة ${r.student_name}؟`,
            {
                duration: 10000,
                action: {
                    label: "حذف",
                    onClick: async () => {
                        try {
                            if (r.type === "exam") {
                                await supabase.from("attempt_answers").delete().eq("attempt_id", r.id);
                                await supabase.from("attempt_questions").delete().eq("attempt_id", r.id);
                                await supabase.from("attempts").delete().eq("id", r.id);
                            } else {
                                await supabase.from("game_attempts").delete().eq("id", r.id);
                            }
                            toast.success("✅ تم حذف النتيجة");
                            fetchAllResults();
                        } catch (err) {
                            console.error(err);
                            toast.error("حدث خطأ أثناء الحذف");
                        }
                    },
                },
                cancel: {
                    label: "إلغاء",
                    onClick: () => { },
                },
            }
        );
    };

    const handleClearAll = () => {
        toast.error(
            `⚠️ هل تريد حذف جميع النتائج (${totalCount})؟ هذا الإجراء لا يمكن التراجع عنه!`,
            {
                duration: 15000,
                style: { background: '#FEF2F2', border: '2px solid #F87171', color: '#991B1B', fontWeight: 'bold' },
                action: {
                    label: "حذف الكل",
                    onClick: async () => {
                        try {
                            await supabase.from("attempt_answers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                            await supabase.from("attempt_questions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                            await supabase.from("attempts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                            await supabase.from("game_attempts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                            toast.success("✅ تم حذف جميع النتائج");
                            fetchAllResults();
                        } catch (err) {
                            console.error(err);
                            toast.error("حدث خطأ أثناء الحذف");
                        }
                    },
                },
                cancel: {
                    label: "إلغاء",
                    onClick: () => { },
                },
            }
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-primary" />
                        </div>
                        نتائج الطلاب
                    </h1>
                    <p className="text-muted-foreground mt-1">متابعة أداء الطلاب في الاختبارات والألعاب</p>
                </div>
                {totalCount > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearAll}
                        className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        حذف الكل
                    </Button>
                )}
            </div>


            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="card-elevated">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <Target className="w-7 h-7 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-medium">إجمالي النتائج</p>
                            <p className="text-3xl font-black text-slate-800">{totalCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="card-elevated">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center">
                            <FileQuestion className="w-7 h-7 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-medium">الاختبارات</p>
                            <p className="text-3xl font-black text-slate-800">{totalExams}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="card-elevated">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center">
                            <Gamepad2 className="w-7 h-7 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-medium">التحديات</p>
                            <p className="text-3xl font-black text-slate-800">{totalGames}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <Card className="card-elevated">
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="البحث باسم الطالب..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pr-10"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Unified Results Table */}
            <Card className="card-elevated overflow-hidden">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80">
                                        <TableHead className="text-right font-bold">#</TableHead>
                                        <TableHead className="text-right font-bold">اسم الطالب</TableHead>
                                        <TableHead className="text-right font-bold">النوع</TableHead>
                                        <TableHead className="text-right font-bold">الأقسام</TableHead>
                                        <TableHead className="text-right font-bold">الحالة</TableHead>
                                        <TableHead className="text-right font-bold">النتيجة</TableHead>
                                        <TableHead className="text-right font-bold">الإجابات الصحيحة</TableHead>
                                        <TableHead className="text-right font-bold">التقييم</TableHead>
                                        <TableHead className="text-right font-bold">الخصومات</TableHead>
                                        <TableHead className="text-right font-bold">المدة</TableHead>
                                        <TableHead className="text-right font-bold">التاريخ</TableHead>
                                        <TableHead className="text-right font-bold">الإيميل</TableHead>
                                        <TableHead className="text-right font-bold w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                                                لا توجد نتائج بعد
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        results.map((r, idx) => {
                                            const badge = getScoreBadge(r.score, r.total);
                                            const typeInfo = getResultTypeLabel(r);
                                            const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                                            return (
                                                <TableRow key={`${r.type}-${r.id}`} className="hover:bg-slate-50/50 transition-colors">
                                                    <TableCell className="font-medium text-slate-400">
                                                        {currentPage * pageSize + idx + 1}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                                <Users className="w-4 h-4 text-primary" />
                                                            </div>
                                                            <span className="font-bold">{r.student_name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${typeInfo.color}`}>
                                                            {typeInfo.icon}
                                                            {typeInfo.label}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {r.section_label ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-700">
                                                                <Target className="w-3 h-3" />
                                                                {r.section_label}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {r.status === "completed" ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                مكتمل
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600">
                                                                <XCircle className="w-3.5 h-3.5" />
                                                                لم يكمل
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {r.status === "abandoned" && r.answered_count === 0 ? (
                                                            <span className="text-sm text-red-400 font-medium">لم يبدأ</span>
                                                        ) : (
                                                            <span className="whitespace-nowrap">
                                                                <span className="font-bold text-lg">{r.score}</span>
                                                                <span className="text-muted-foreground text-sm mx-0.5">/{r.total}</span>
                                                                <span className="text-xs text-muted-foreground">({pct}%)</span>
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="whitespace-nowrap">
                                                            <span className="font-bold text-emerald-600">{r.correct_answers}</span>
                                                            <span className="text-muted-foreground text-sm">/{r.total}</span>
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${badge.color}`}>
                                                            {badge.label}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {r.penalty > 0 ? (
                                                            <span className="text-red-500 font-bold flex items-center gap-1">
                                                                <Zap className="w-3.5 h-3.5" />
                                                                -{r.penalty}
                                                            </span>
                                                        ) : (
                                                            <span className="text-emerald-500 text-sm">✓ بدون</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-600">
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {r.duration}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {r.date}
                                                    </TableCell>
                                                    <TableCell>
                                                        {r.email_sent ? (
                                                            <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">✓ تم</Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="text-xs">لم يرسل</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <button
                                                            onClick={() => handleDelete(r)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                            title="حذف النتيجة"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        صفحة {currentPage + 1} من {totalPages} — إجمالي {totalCount} نتيجة
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline" size="sm"
                            disabled={currentPage === 0}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="gap-1"
                        >
                            <ChevronRight className="w-4 h-4" />
                            السابق
                        </Button>
                        <span className="text-sm font-medium px-3">
                            {currentPage + 1} / {totalPages}
                        </span>
                        <Button
                            variant="outline" size="sm"
                            disabled={currentPage >= totalPages - 1}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="gap-1"
                        >
                            التالي
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
