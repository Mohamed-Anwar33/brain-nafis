import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, ArrowRight, Star, Sparkles, Award, Zap, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { audioManager } from "@/lib/audio";
import { toast } from "sonner";

interface StageTransitionProps {
    stage: number;
    score: number;
    totalQuestions: number;
    onNext: () => void;
    onFinishEarly?: () => void;
    totalStages?: number;
}

// Performance-based motivational messages
const getMotivationalMessage = (percentage: number): string => {
    if (percentage === 100) {
        return "🌟 مذهل! درجة كاملة! أنت نجم متألق!";
    } else if (percentage >= 90) {
        return "🎯 ممتاز جداً! أداء استثنائي يا بطل!";
    } else if (percentage >= 80) {
        return "🔥 رائع! واصل هذا التميز!";
    } else if (percentage >= 70) {
        return "💪 أحسنت! أنت في الطريق الصحيح!";
    } else if (percentage >= 60) {
        return "👍 جيد! لنحاول تحسين الأداء في المرحلة القادمة";
    } else {
        return "📚 لا بأس، التركيز أكثر في المرحلة القادمة!";
    }
};

// Get performance badge color and icon - Saudi Green & Gold Theme
const getPerformanceBadge = (percentage: number) => {
    if (percentage === 100) {
        return {
            color: "from-amber-400 via-yellow-500 to-amber-600", // Saudi Gold
            icon: Trophy,
            label: "إتقان كامل",
            glow: "shadow-amber-400/50",
            bg: "from-amber-50 to-yellow-50"
        };
    } else if (percentage >= 90) {
        return {
            color: "from-emerald-500 via-green-600 to-emerald-700", // Saudi Green
            icon: Award,
            label: "ممتاز جداً",
            glow: "shadow-emerald-500/50",
            bg: "from-emerald-50 to-green-50"
        };
    } else if (percentage >= 75) {
        return {
            color: "from-teal-500 via-emerald-500 to-green-500", // Teal-Green mix
            icon: Sparkles,
            label: "جيد جداً",
            glow: "shadow-teal-400/50",
            bg: "from-teal-50 to-emerald-50"
        };
    } else {
        return {
            color: "from-green-500 via-teal-600 to-emerald-600", // Green variations
            icon: Zap,
            label: "استمر في المحاولة",
            glow: "shadow-green-400/50",
            bg: "from-green-50 to-teal-50"
        };
    }
};

// Render star rating
const renderStars = (percentage: number) => {
    const starCount = percentage === 100 ? 5 :
        percentage >= 90 ? 4 :
            percentage >= 75 ? 3 :
                percentage >= 60 ? 2 : 1;

    return (
        <div className="flex gap-1 justify-center">
            {Array.from({ length: 5 }).map((_, i) => (
                <Star
                    key={i}
                    className={`w-8 h-8 transition-all duration-300 ${i < starCount
                        ? 'text-yellow-400 fill-yellow-400 animate-pulse'
                        : 'text-gray-300'
                        }`}
                    style={{ animationDelay: `${i * 100}ms` }}
                />
            ))}
        </div>
    );
};

export function StageTransition({ stage, score, totalQuestions, onNext, onFinishEarly }: StageTransitionProps) {
    const percentage = Math.round((score / totalQuestions) * 100);
    const badge = getPerformanceBadge(percentage);
    const BadgeIcon = badge.icon;
    const [showConfirmExit, setShowConfirmExit] = useState(false);

    const handleFinishEarly = () => {
        if (showConfirmExit) {
            // User confirmed, finish the exam
            if (onFinishEarly) {
                onFinishEarly();
            }
        } else {
            // First click - show warning toast
            setShowConfirmExit(true);
            toast.warning("⚠️ هل أنت متأكد؟", {
                description: "سيتم إنهاء الاختبار وإرسال نتيجتك الحالية. اضغط مرة أخرى للتأكيد.",
                duration: 5000,
            });

            // Reset confirmation after 5 seconds
            setTimeout(() => setShowConfirmExit(false), 5000);
        }
    };

    useEffect(() => {
        // Play success sound
        audioManager.playSuccess();

        // Enhanced confetti based on performance
        const duration = percentage >= 90 ? 4000 : 3000;
        const end = Date.now() + duration;

        const frame = () => {
            if (percentage === 100) {
                // Special celebration for perfect score - Saudi Gold
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 70,
                    origin: { x: 0, y: 0.6 },
                    colors: ['#F59E0B', '#FBBF24', '#FCD34D', '#FDE047'] // Gold shades
                });
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 70,
                    origin: { x: 1, y: 0.6 },
                    colors: ['#10B981', '#14B8A6', '#F59E0B', '#FBBF24'] // Green & Gold
                });
            } else {
                // Saudi Green themed confetti
                confetti({
                    particleCount: 3,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#059669', '#10B981', '#34D399', '#6EE7B7'] // Green shades
                });
                confetti({
                    particleCount: 3,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#14B8A6', '#2DD4BF', '#5EEAD4', '#34D399'] // Teal-Green shades
                });
            }

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };

        frame();
    }, [percentage]);

    const message = getMotivationalMessage(percentage);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 p-4 animate-in fade-in duration-500">
            <Card className={`max-w-lg w-full p-8 text-center space-y-6 shadow-2xl border-2 ${badge.glow} bg-gradient-to-br from-white via-white to-slate-50/50 backdrop-blur relative overflow-hidden`}>

                {/* Animated background particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className={`absolute top-10 left-10 w-20 h-20 bg-gradient-to-r ${badge.color} rounded-full blur-2xl opacity-20 animate-pulse`}></div>
                    <div className={`absolute bottom-10 right-10 w-32 h-32 bg-gradient-to-r ${badge.color} rounded-full blur-3xl opacity-10 animate-pulse`} style={{ animationDelay: '1s' }}></div>
                </div>

                <div className="relative z-10 space-y-6">
                    {/* Trophy/Badge Icon */}
                    <div className="relative">
                        <div className={`absolute inset-0 animate-ping opacity-30 bg-gradient-to-r ${badge.color} rounded-full scale-150 blur-xl`}></div>
                        <div className={`relative mx-auto w-32 h-32 bg-gradient-to-br ${badge.color} rounded-full flex items-center justify-center shadow-2xl ${badge.glow} transform hover:scale-110 transition-transform duration-300`}>
                            <BadgeIcon className="w-16 h-16 text-white drop-shadow-lg animate-bounce" />
                        </div>
                        {/* Floating stars around trophy */}
                        <div className="absolute -top-4 -right-4 animate-bounce" style={{ animationDelay: '0.5s' }}>
                            <Sparkles className="w-10 h-10 text-yellow-400 fill-yellow-400 drop-shadow-glow" />
                        </div>
                        <div className="absolute -bottom-2 -left-4 animate-bounce" style={{ animationDelay: '1s' }}>
                            <Star className="w-8 h-8 text-pink-400 fill-pink-400 drop-shadow-glow" />
                        </div>
                    </div>

                    {/* Stage Title with gradient */}
                    <div className="space-y-2">
                        <h2 className={`text-4xl font-black bg-gradient-to-r ${badge.color} bg-clip-text text-transparent drop-shadow-sm`}>
                            اكتملت المرحلة {stage}
                        </h2>
                        <div className={`inline-block px-4 py-1 bg-gradient-to-r ${badge.color} text-white text-sm font-bold rounded-full shadow-lg`}>
                            {badge.label}
                        </div>
                    </div>

                    {/* Star Rating */}
                    <div className="py-2">
                        {renderStars(percentage)}
                    </div>

                    {/* Score Display with enhanced styling */}
                    <div className="flex flex-col items-center gap-3 py-4 bg-gradient-to-br from-slate-50 to-white rounded-2xl border-2 border-slate-100 shadow-inner">
                        <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">نتيجتك في هذه المرحلة</span>
                        <div className="flex items-baseline gap-3">
                            <span className={`text-6xl font-black bg-gradient-to-r ${badge.color} bg-clip-text text-transparent drop-shadow-lg`}>
                                {score}
                            </span>
                            <span className="text-3xl text-slate-400 font-bold">/ {totalQuestions}</span>
                        </div>
                        <div className={`px-6 py-2 bg-gradient-to-r ${badge.color} text-white text-xl font-black rounded-full shadow-lg ${badge.glow} transform hover:scale-105 transition-transform`}>
                            {percentage}%
                        </div>
                    </div>

                    {/* Motivational Message with emoji */}
                    <div className={`bg-gradient-to-r ${badge.bg} rounded-xl p-5 border-2 border-emerald-100`}>
                        <p className="text-xl text-slate-700 font-bold leading-relaxed">
                            {message}
                        </p>
                    </div>

                    {/* Next Button with gradient and animations */}
                    <div className="pt-2 space-y-3">
                        <Button
                            onClick={onNext}
                            size="lg"
                            className={`w-full text-xl font-black h-16 rounded-2xl shadow-2xl bg-gradient-to-r ${badge.color} hover:shadow-3xl transition-all hover:scale-105 transform gap-3 border-0`}
                        >
                            <span>الانتقال للمرحلة التالية</span>
                            <ArrowRight className="w-7 h-7 animate-pulse" />
                        </Button>

                        {/* Early Exit Button */}
                        {onFinishEarly && (
                            <Button
                                onClick={handleFinishEarly}
                                variant="outline"
                                size="lg"
                                className={`w-full text-base font-bold h-12 rounded-xl gap-2 transition-all ${showConfirmExit
                                        ? 'border-red-500 bg-red-50 text-red-600 hover:bg-red-100 animate-pulse'
                                        : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                    }`}
                            >
                                <LogOut className="w-5 h-5" />
                                <span>{showConfirmExit ? 'اضغط مرة أخرى للتأكيد' : 'إنهاء الاختبار الآن'}</span>
                            </Button>
                        )}
                    </div>
                </div>

            </Card>
        </div>
    );
}
