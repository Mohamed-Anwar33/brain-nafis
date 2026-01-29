import { Button } from "@/components/ui/button";
import { ExamResult } from "@/types/exam";
import { Trophy, Clock, AlertCircle, Home, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface ResultScreenProps {
  result: ExamResult;
}

export function ResultScreen({ result }: ResultScreenProps) {
  const navigate = useNavigate();
  const percentage = Math.round((result.score / result.question_count) * 100);
  
  const getGradeInfo = () => {
    if (percentage >= 90) return { label: "ممتاز", color: "text-success", emoji: "🏆" };
    if (percentage >= 75) return { label: "جيد جداً", color: "text-primary", emoji: "🌟" };
    if (percentage >= 60) return { label: "جيد", color: "text-accent", emoji: "👍" };
    if (percentage >= 50) return { label: "مقبول", color: "text-warning", emoji: "📝" };
    return { label: "يحتاج تحسين", color: "text-destructive", emoji: "💪" };
  };

  const grade = getGradeInfo();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="card-elevated p-8 md:p-10 text-center animate-bounce-in">
          {/* Trophy Icon */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-6">
            <Trophy className="w-12 h-12 text-primary" />
          </div>

          {/* Grade */}
          <div className="mb-4">
            <span className="text-5xl mb-2">{grade.emoji}</span>
            <h1 className={`text-3xl font-bold ${grade.color} mt-2`}>
              {grade.label}
            </h1>
          </div>

          {/* Score */}
          <div className="score-display my-8">
            {result.score}/{result.question_count}
          </div>

          {/* Student Name */}
          <div className="mb-8 p-4 rounded-xl bg-secondary/50">
            <p className="text-lg font-semibold text-foreground">
              {result.student_name}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-muted">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">الخصومات</span>
              </div>
              <p className="text-2xl font-bold text-destructive">
                {result.total_penalty}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-muted">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">وقت البدء</span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {format(new Date(result.started_at), "hh:mm a", { locale: ar })}
              </p>
            </div>
          </div>

          {/* Time Info */}
          <div className="text-sm text-muted-foreground mb-8">
            <p>
              بدأ في: {format(new Date(result.started_at), "dd MMMM yyyy - hh:mm a", { locale: ar })}
            </p>
            <p>
              انتهى في: {format(new Date(result.finished_at), "dd MMMM yyyy - hh:mm a", { locale: ar })}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="flex-1 h-12 text-base rounded-xl"
            >
              <Home className="w-5 h-5 ml-2" />
              الرئيسية
            </Button>
            <Button
              onClick={() => navigate("/")}
              className="flex-1 h-12 text-base rounded-xl btn-primary-gradient"
            >
              <RotateCcw className="w-5 h-5 ml-2" />
              اختبار جديد
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
