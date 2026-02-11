import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Zap, Puzzle, Gamepad2, Timer, LogOut, GraduationCap, ChevronLeft, Star, Calendar } from "lucide-react";
import { toast } from "sonner";
import { SaudiLoader } from "@/components/ui/SaudiLoader";

export default function StudentDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [studentName, setStudentName] = useState<string | null>(null);

    // Format Hijri Date
    const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(new Date());

    useEffect(() => {
        checkUser();
    }, []);

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
            icon: <Zap className="w-8 h-8 text-white" />,
            action: startQuiz,
            gradient: "from-blue-500 to-indigo-600",
            shadow: "shadow-blue-500/30",
            description: "اختبر معلوماتك العامة بأسئلة متنوعة وشيقة"
        },
        {
            id: "matching",
            title: "لعبة المطابقة",
            subtitle: "ربط العناصر",
            icon: <Gamepad2 className="w-8 h-8 text-white" />,
            action: () => navigate("/games/matching"),
            gradient: "from-purple-500 to-pink-600",
            shadow: "shadow-purple-500/30",
            description: "صل بين العنصر وما يطابقه في أسرع وقت ممكن"
        },
        {
            id: "ordering",
            title: "لغز الترتيب",
            subtitle: "التسلسل الصحيح",
            icon: <Puzzle className="w-8 h-8 text-white" />,
            action: () => navigate("/games/ordering"),
            gradient: "from-emerald-500 to-teal-600",
            shadow: "shadow-emerald-500/30",
            description: "رتب العناصر وفقاً للتسلسل المنطقي الصحيح"
        },
        {
            id: "speed",
            title: "تحدي السرعة",
            subtitle: "سباق الزمن",
            icon: <Timer className="w-8 h-8 text-white" />,
            action: () => navigate("/games/speed"),
            gradient: "from-orange-500 to-red-600",
            shadow: "shadow-orange-500/30",
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
        <div className="min-h-screen bg-slate-50 relative overflow-hidden" dir="rtl">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none"></div>

            {/* Header */}
            {/* Header */}
            <header className="relative z-10 bg-white/80 backdrop-blur-md border-b sticky top-0">
                <div className="container mx-auto px-6 py-3 flex justify-between items-center relative">
                    {/* Right Side: User Info */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="relative">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white flex items-center justify-center font-bold text-lg md:text-xl shadow-lg shadow-primary/20">
                                {studentName ? studentName[0] : "ط"}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="font-bold text-sm md:text-lg text-slate-800 flex items-center gap-2">
                                أهلاً، {studentName || "يا بطل"} <span className="text-lg md:text-xl">👋</span>
                            </h1>
                            <p className="text-[10px] md:text-xs font-medium text-slate-500">لوحة التحكم</p>
                        </div>
                    </div>

                    {/* Center: Hijri Date (Flex Centered with Glass Effect) */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-6 py-2 rounded-full border border-primary/10 shadow-sm backdrop-blur-sm">
                        <Calendar className="w-4 h-4 md:w-5 md:h-5 text-primary animate-pulse" />
                        <span className="text-xs md:text-sm font-bold text-primary font-mono tracking-wider">{hijriDate}</span>
                    </div>

                    {/* Left Side: Logout Button */}
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                        <LogOut className="w-4 h-4 ml-1 md:ml-2" />
                        <span className="hidden sm:inline">تسجيل خروج</span>
                    </Button>
                </div>
            </header>

            <main className="container mx-auto px-6 py-12 relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-16 space-y-4 animate-fade-in">
                    <div className="inline-flex items-center justify-center p-2 bg-white rounded-full shadow-sm border border-slate-100 mb-4">
                        <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">الأنشطة التعليمية</span>
                        <span className="text-xs text-slate-500 px-3">تحديات جديدة بإنتظارك</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-normal">
                        اختر <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">تحديك</span> التالي
                    </h2>
                    <p className="text-lg text-slate-500">
                        مجموعة متنوعة من الألعاب والاختبارات المصممة لتعزيز مهاراتك بطريقة ممتعة وشيقة.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                    {games.map((game, idx) => (
                        <div
                            key={game.id}
                            onClick={game.action}
                            className={`
                                group relative bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/50 
                                hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden
                                flex flex-col items-center text-center
                            `}
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            {/* Hover Gradient Overlay */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

                            {/* Icon Box */}
                            <div className={`
                                w-20 h-20 rounded-2xl bg-gradient-to-br ${game.gradient} ${game.shadow}
                                flex items-center justify-center mb-6 transform group-hover:rotate-6 transition-transform duration-300
                            `}>
                                {game.icon}
                            </div>

                            {/* Content */}
                            <h3 className="text-xl font-bold text-slate-800 mb-1">{game.title}</h3>
                            <p className="text-xs font-bold text-primary uppercase tracking-normal mb-3">{game.subtitle}</p>

                            <p className="text-sm text-slate-500 leading-relaxed mb-6 line-clamp-2">
                                {game.description}
                            </p>

                            {/* Action Button (Visual Only) */}
                            <div className="mt-auto pt-4 border-t border-slate-50 w-full">
                                <span className={`
                                    inline-flex items-center text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r ${game.gradient}
                                    group-hover:gap-2 transition-all duration-300
                                `}>
                                    ابدأ اللعب <ChevronLeft className="w-4 h-4 mr-1 text-slate-400 group-hover:text-primary transition-colors" />
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Quote or Decor */}
                <div className="mt-20 text-center">
                    <div className="inline-flex items-center gap-2 text-slate-400 text-sm font-medium bg-white px-6 py-3 rounded-full shadow-sm border border-slate-100">
                        <GraduationCap className="w-4 h-4" />
                        <span>تعلم، العب، وارتقِ بمستواك الدراسي</span>
                    </div>
                </div>
            </main>
        </div>
    );
}
