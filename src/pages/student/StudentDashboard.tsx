import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Puzzle, Gamepad2, Timer, LogOut, GraduationCap, ChevronLeft, Calendar, Target, Brain, Sparkles, Crown, Star, Rocket } from "lucide-react";
import { toast } from "sonner";
import { SaudiLoader } from "@/components/ui/SaudiLoader";
import { getCentralExamConfig, CentralExamConfig } from "@/services/centralExamService";

export default function StudentDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [studentName, setStudentName] = useState<string | null>(null);
    const [centralConfig, setCentralConfig] = useState<CentralExamConfig | null>(null);

    // Format Hijri Date
    const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(new Date());

    useEffect(() => {
        checkUser();
        fetchCentralConfig();
    }, []);

    const fetchCentralConfig = async () => {
        try {
            const data = await getCentralExamConfig();
            setCentralConfig(data);
        } catch (e) {
            console.error("Failed to load central exam config");
        }
    };

    const checkUser = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate("/");
                return;
            }

            const { data: profile, error } = await supabase
                .from("student_profiles")
                .select("full_name")
                .eq("id", session.user.id)
                .single();

            if (!error && profile) {
                setStudentName(profile.full_name);
            }
        } catch (error) {
            console.error("Auth check error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };

    const startQuiz = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Fetch configured question count
            const { data: setting } = await supabase
                .from("settings")
                .select("exam_question_count")
                .eq("id", 1)
                .single();

            const limitCount = setting?.exam_question_count || 10;

            // 1. Fetch all active questions (IDs only for performance)
            const { data: allQuestions, error: questionsError } = await supabase
                .from("questions")
                .select("id")
                .eq("active", true);

            if (questionsError || !allQuestions || allQuestions.length === 0) {
                toast.error("لا توجد أسئلة متاحة حالياً");
                setLoading(false);
                return;
            }

            if (allQuestions.length < limitCount) {
                toast.error(`لا يوجد عدد كافٍ من الأسئلة. المطلوب: ${limitCount}, المتاح: ${allQuestions.length}`);
                setLoading(false);
                return;
            }

            // 2. Fetch seen question IDs for this user (performance: IDs only)
            const { data: seenHistory } = await supabase
                .from("student_question_history")
                .select("question_id")
                .eq("user_id", session.user.id)
                .eq("game_type", "exam");

            const seenIds = new Set(seenHistory?.map(h => h.question_id) || []);

            // 3. Filter unseen questions
            let availableQuestions = allQuestions.filter(q => !seenIds.has(q.id));

            // 4. Reset if needed
            let didReset = false;
            if (availableQuestions.length < limitCount) {
                await supabase
                    .from("student_question_history")
                    .delete()
                    .eq("user_id", session.user.id)
                    .eq("game_type", "exam");

                availableQuestions = allQuestions;
                // Silent reset - no notification to student
            }

            // 5. Shuffle with Fisher-Yates
            const shuffled = [...availableQuestions];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            // 6. Select first N questions
            const selectedQuestionIds = shuffled.slice(0, limitCount).map(q => q.id);

            // 7. Fetch full question data with choices
            const { data: selectedQuestionsData, error: fullDataError } = await supabase
                .from("questions")
                .select("*, choices(*)")
                .in("id", selectedQuestionIds);

            if (fullDataError || !selectedQuestionsData) {
                toast.error("فشل تحميل بيانات الأسئلة");
                setLoading(false);
                return;
            }

            // Preserve shuffle order
            const questionMap = new Map(selectedQuestionsData.map(q => [q.id, q]));
            const orderedQuestions = selectedQuestionIds.map(id => questionMap.get(id)).filter(Boolean);

            // 8. Create attempt
            const { data: attempt, error: attemptError } = await supabase
                .from("attempts")
                .insert({
                    student_name: studentName || "طالب",
                    score: 0,
                    question_count: orderedQuestions.length
                })
                .select()
                .single();

            if (attemptError) throw attemptError;

            // 9. Record seen questions (ON CONFLICT DO NOTHING to handle race conditions)
            const historyRecords = selectedQuestionIds.map(qid => ({
                user_id: session.user.id,
                question_id: qid,
                game_type: "exam"
            }));

            await supabase
                .from("student_question_history")
                .upsert(historyRecords, { onConflict: "user_id,question_id,game_type", ignoreDuplicates: true });

            // 10. Build exam data
            const examQuestions = orderedQuestions.map((q, index) => ({
                id: q.id,
                text: q.text,
                choices: q.choices.map((c: any) => ({
                    id: c.id,
                    text: c.text,
                    is_correct: c.is_correct
                })),
                order_index: index
            }));

            const attemptData = {
                attempt_id: attempt.id,
                student_name: studentName || "طالب",
                question_count: examQuestions.length,
                score: 0,
                questions: examQuestions
            };

            sessionStorage.setItem(`exam_${attempt.id}`, JSON.stringify(attemptData));
            navigate(`/exam/${attempt.id}`);

        } catch (e) {
            console.error(e);
            toast.error("حدث خطأ غير متوقع");
            setLoading(false);
        }
    };

    const games = [
        {
            id: "quick-quiz",
            title: "الاختبار السريع",
            subtitle: "تحدي المعلومات",
            icon: <Zap className="w-6 h-6" />,
            action: startQuiz,
            accent: "violet",
            accentColor: "text-violet-600",
            accentBg: "bg-violet-100",
            accentGradient: "from-violet-500 to-purple-600",
            accentBorder: "border-violet-200",
            accentHover: "hover:bg-violet-50",
            featured: true,
            description: "اختبر معلوماتك العامة بأسئلة متنوعة وشيقة"
        },
        {
            id: "matching",
            title: "لعبة المطابقة",
            subtitle: "ربط العناصر",
            icon: <Gamepad2 className="w-6 h-6" />,
            action: () => navigate("/games/matching"),
            accent: "rose",
            accentColor: "text-rose-600",
            accentBg: "bg-rose-100",
            accentGradient: "from-rose-500 to-pink-600",
            accentBorder: "border-rose-200",
            accentHover: "hover:bg-rose-50",
            description: "صل بين العنصر وما يطابقه في أسرع وقت ممكن"
        },
        {
            id: "ordering",
            title: "لغز الترتيب",
            subtitle: "التسلسل الصحيح",
            icon: <Puzzle className="w-6 h-6" />,
            action: () => navigate("/games/ordering"),
            accent: "cyan",
            accentColor: "text-cyan-600",
            accentBg: "bg-cyan-100",
            accentGradient: "from-cyan-500 to-blue-600",
            accentBorder: "border-cyan-200",
            accentHover: "hover:bg-cyan-50",
            description: "رتب العناصر وفقاً للتسلسل المنطقي الصحيح"
        },
        {
            id: "speed",
            title: "تحدي السرعة",
            subtitle: "سباق الزمن",
            icon: <Timer className="w-6 h-6" />,
            action: () => navigate("/games/speed"),
            accent: "amber",
            accentColor: "text-amber-600",
            accentBg: "bg-amber-100",
            accentGradient: "from-amber-500 to-orange-600",
            accentBorder: "border-amber-200",
            accentHover: "hover:bg-amber-50",
            description: "أجب عن أكبر عدد من الأسئلة قبل انتهاء الوقت المخصص"
        }
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <SaudiLoader text="جاري تجهيز لوحة الطالب..." />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-100 via-fuchsia-50 to-blue-100 relative overflow-hidden" dir="rtl">
            {/* Floating Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-10 left-10 w-64 h-64 bg-purple-300/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-10 right-10 w-80 h-80 bg-pink-300/20 rounded-full blur-3xl animate-pulse delay-500"></div>
                <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-blue-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute bottom-1/3 left-1/4 w-56 h-56 bg-violet-300/20 rounded-full blur-3xl animate-pulse delay-700"></div>
                
                {/* Animated floating shapes */}
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full animate-pulse"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            width: `${20 + Math.random() * 30}px`,
                            height: `${20 + Math.random() * 30}px`,
                            background: ['#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#a78bfa', '#fb923c'][Math.floor(Math.random() * 6)],
                            animationDelay: `${Math.random() * 3}s`,
                            opacity: 0.15,
                            filter: 'blur(2px)'
                        }}
                    />
                ))}
            </div>

            {/* Header */}
            <header className="relative z-20 bg-white/80 backdrop-blur-xl border-b border-white/50 sticky top-0">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    {/* Right Side: User Info */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-purple-500/30">
                                {studentName ? studentName[0] : "ط"}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="font-bold text-slate-800 flex items-center gap-2">
                                أهلاً، {studentName || "يا بطل"} <span className="text-lg">👋</span>
                            </h1>
                            <p className="text-xs font-medium text-slate-500">لوحة التحكم</p>
                        </div>
                    </div>

                    {/* Center: Hijri Date */}
                    <div className="flex items-center gap-2 bg-gradient-to-r from-violet-100 to-fuchsia-100 px-4 py-2 rounded-full border border-violet-200">
                        <Calendar className="w-4 h-4 text-violet-600" />
                        <span className="text-xs font-bold text-violet-700">{hijriDate}</span>
                    </div>

                    {/* Left Side: Logout Button */}
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full">
                        <LogOut className="w-4 h-4 ml-1" />
                        <span className="hidden sm:inline font-bold">خروج</span>
                    </Button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 relative z-10">
                {/* Hero Header - Enhanced Design */}
                <div className="text-center max-w-2xl mx-auto mb-12 space-y-5">
                    {/* Main Icon */}
                    <div className="inline-flex items-center justify-center">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 p-1.5 shadow-2xl shadow-violet-500/30">
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                                    <Brain className="w-12 h-12 text-violet-600" />
                                </div>
                            </div>
                            {/* Decorative elements */}
                            <div className="absolute -top-2 -right-2 text-3xl animate-bounce">✨</div>
                            <div className="absolute -bottom-1 -left-3 text-2xl animate-bounce delay-150">⭐</div>
                            <div className="absolute top-1/2 -left-6 text-xl animate-pulse">🎮</div>
                            <div className="absolute top-1/2 -right-6 text-xl animate-pulse delay-300">🧩</div>
                        </div>
                    </div>
                    
                    {/* Title Section */}
                    <div className="space-y-3">
                        <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/80 backdrop-blur border border-violet-200 text-violet-700 font-bold text-sm shadow-sm">
                            <Sparkles className="w-4 h-4" />
                            الأنشطة التعليمية
                            <Target className="w-4 h-4" />
                        </span>
                        
                        <h2 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 bg-clip-text text-transparent drop-shadow-sm">
                            اختر تحديك التالي
                        </h2>
                        
                        <p className="text-slate-500 text-lg max-w-md mx-auto">
                            مجموعة متنوعة من الألعاب والاختبارات لتعزيز مهاراتك
                        </p>
                    </div>
                </div>

                {/* Central Exam Banner - Enhanced */}
                {centralConfig?.is_active && (
                    <Card 
                        onClick={() => navigate("/central-exam")}
                        className="mb-10 cursor-pointer group bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 border-0 shadow-2xl shadow-violet-500/30 overflow-hidden relative"
                    >
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-2xl"></div>
                        
                        <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="relative z-10 flex-1 text-right text-white text-center md:text-right">
                                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-1.5 rounded-full text-sm font-bold mb-4">
                                    <Sparkles className="w-4 h-4 text-yellow-300" />
                                    <span>حصري وجديد</span>
                                </div>
                                <h3 className="text-2xl md:text-4xl font-black mb-3">
                                    {centralConfig.title}
                                </h3>
                                <p className="text-violet-100 max-w-xl text-sm md:text-base leading-relaxed">
                                    {centralConfig.description}
                                </p>
                                <div className="mt-4 flex gap-2 justify-center md:justify-start">
                                    <Badge className="bg-white/20 text-white border-0 backdrop-blur font-bold">{centralConfig.grade}</Badge>
                                    <Badge className="bg-white/20 text-white border-0 backdrop-blur font-bold">{centralConfig.subject}</Badge>
                                </div>
                            </div>

                            <div className="relative z-10">
                                <button className="bg-white text-violet-600 px-8 py-4 rounded-xl font-black text-lg shadow-xl hover:shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all flex items-center gap-2 group/btn">
                                    بدء الاختبار الآن
                                    <ChevronLeft className="w-5 h-5 group-hover/btn:-translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Games Grid - Premium SaaS Design */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {games.map((game, idx) => (
                        <Card
                            key={game.id}
                            onClick={game.action}
                            className={`cursor-pointer group relative overflow-hidden transition-all duration-300 hover:-translate-y-2 ${
                                game.featured 
                                    ? 'bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 border-2 border-violet-200 shadow-xl hover:shadow-2xl shadow-violet-500/10 scale-[1.02]' 
                                    : 'bg-white border border-slate-200 shadow-lg hover:shadow-xl'
                            }`}
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            {/* Featured badge */}
                            {game.featured && (
                                <div className="absolute top-3 left-3">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[10px] font-bold">
                                        <Sparkles className="w-3 h-3" />
                                        مميز
                                    </span>
                                </div>
                            )}
                            
                            <div className="p-6 flex flex-col h-full">
                                {/* Icon - Accent colored */}
                                <div className={`w-12 h-12 rounded-xl ${game.accentBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                    <div className={game.accentColor}>
                                        {game.icon}
                                    </div>
                                </div>
                                
                                {/* Title */}
                                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-slate-700 transition-colors">
                                    {game.title}
                                </h3>
                                
                                {/* Tag/Subtitle - Accent colored */}
                                <span className={`inline-flex self-start px-2.5 py-1 rounded-md text-xs font-semibold ${game.accentBg} ${game.accentColor} mb-3`}>
                                    {game.subtitle}
                                </span>
                                
                                {/* Description */}
                                <p className="text-sm text-slate-500 leading-relaxed mb-4 flex-grow">
                                    {game.description}
                                </p>
                                
                                {/* CTA Button - Accent colored */}
                                <button className={`w-full mt-auto py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                                    game.featured
                                        ? `bg-gradient-to-r ${game.accentGradient} text-white shadow-md hover:shadow-lg hover:opacity-90`
                                        : `${game.accentBg} ${game.accentColor} ${game.accentHover}`
                                }`}>
                                    ابدأ اللعب
                                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-16 text-center">
                    <div className="inline-flex items-center gap-2 text-slate-500 text-sm font-medium bg-white/80 px-6 py-3 rounded-full shadow-sm border border-white/50">
                        <GraduationCap className="w-4 h-4 text-violet-500" />
                        <span>تعلم، العب، وارتقِ بمستواك الدراسي</span>
                    </div>
                </div>
            </main>
        </div>
    );
}
