import { supabase } from "@/integrations/supabase/client";

export interface LeaderboardStudent {
  rank: number;
  name: string;
  totalScore: number;
  completedCount: number;
  accuracy: number;
  isCurrentStudent: boolean;
  bestGame?: string;
  badge?: "gold" | "silver" | "bronze" | "top10";
}

export interface StudentProgressStats {
  studentName: string;
  rank: number | null;
  isInTop10: boolean;
  totalScore: number;
  completedExams: number;
  completedGames: number;
  totalCompleted: number;
  accuracy: number;
  pointsToTop10: number;
  achievements: AchievementItem[];
}

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

/**
 * Normalizes Arabic text for consistent name comparison
 */
export function normalizeStudentName(name: string): string {
  if (!name) return "";
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase();
}

/**
 * Fetches real platform data from `attempts` and `game_attempts`,
 * aggregates scores per student name, and ranks the students.
 */
export async function getPlatformLeaderboard(
  currentStudentName?: string | null
): Promise<{
  top10: LeaderboardStudent[];
  currentStudentStats: StudentProgressStats | null;
  totalParticipants: number;
}> {
  const normCurrent = currentStudentName ? normalizeStudentName(currentStudentName) : "";

  try {
    // 1. Fetch regular exam attempts
    const { data: examAttempts, error: examError } = await supabase
      .from("attempts")
      .select("student_name, score, question_count, finished_at, created_at");

    if (examError) {
      console.warn("Could not fetch exam attempts:", examError);
    }

    // 2. Fetch game attempts
    const { data: gameAttempts, error: gameError } = await supabase
      .from("game_attempts")
      .select("user_id, score, total_questions, correct_count, game_type, metadata");

    if (gameError) {
      console.warn("Could not fetch game attempts:", gameError);
    }

    // 3. Resolve current user from session if available
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;

    // 4. Fetch student profiles to resolve game attempt names
    const userIds = [
      ...new Set(
        [
          ...(gameAttempts || []).map((g) => g.user_id),
          currentUserId,
        ].filter(Boolean)
      ),
    ];
    const profileMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("student_profiles")
        .select("id, full_name")
        .in("id", userIds);

      (profiles || []).forEach((p) => {
        if (p.full_name) profileMap[p.id] = p.full_name.trim();
      });
    }

    let resolvedCurrentName = (currentStudentName || "").trim();
    if (
      (!resolvedCurrentName || resolvedCurrentName === "طالب") &&
      currentUserId &&
      profileMap[currentUserId]
    ) {
      resolvedCurrentName = profileMap[currentUserId];
    }
    if (!resolvedCurrentName || resolvedCurrentName === "طالب") {
      const localName =
        localStorage.getItem("student_name") ||
        sessionStorage.getItem("student_name");
      if (localName?.trim()) {
        resolvedCurrentName = localName.trim();
      }
    }

    const normCurrent = resolvedCurrentName
      ? normalizeStudentName(resolvedCurrentName)
      : "";

    // Aggregate map: normalizedName -> Stats
    interface AggregatedData {
      displayName: string;
      totalScore: number;
      totalCorrect: number;
      totalQuestions: number;
      examCount: number;
      gameCount: number;
    }

    const map: Record<string, AggregatedData> = {};

    const addScore = (
      rawName: string | null | undefined,
      score: number,
      correct: number,
      total: number,
      isGame: boolean,
      isForCurrentStudent: boolean = false
    ) => {
      let trimmed = (rawName || "").trim();
      if (
        isForCurrentStudent &&
        (!trimmed || trimmed === "طالب" || trimmed === "زائر")
      ) {
        trimmed = resolvedCurrentName || "طالب متميز";
      } else if (!trimmed || trimmed === "طالب" || trimmed === "زائر") {
        return;
      }

      const norm = normalizeStudentName(trimmed);
      if (!map[norm]) {
        map[norm] = {
          displayName: trimmed,
          totalScore: 0,
          totalCorrect: 0,
          totalQuestions: 0,
          examCount: 0,
          gameCount: 0,
        };
      }

      map[norm].totalScore += Math.max(0, score || 0);
      map[norm].totalCorrect += Math.max(0, correct || 0);
      map[norm].totalQuestions += Math.max(0, total || 0);
      if (isGame) {
        map[norm].gameCount += 1;
      } else {
        map[norm].examCount += 1;
      }
    };

    // Process exams
    (examAttempts || []).forEach((att) => {
      const isCurrent = Boolean(
        resolvedCurrentName &&
          normalizeStudentName(att.student_name || "") ===
            normalizeStudentName(resolvedCurrentName)
      );
      const s = att.score || 0;
      const q = att.question_count || (s > 0 ? s : 10);
      addScore(att.student_name, s, s, q, false, isCurrent);
    });

    // Process games
    (gameAttempts || []).forEach((game) => {
      const isCurrent = Boolean(currentUserId && game.user_id === currentUserId);
      const metaName = (game.metadata as any)?.student_name;
      const resolvedName =
        isCurrent && resolvedCurrentName
          ? resolvedCurrentName
          : metaName || (game.user_id ? profileMap[game.user_id] : null);

      const s = game.score || game.correct_count || 0;
      const total =
        game.total_questions ||
        (game.correct_count ? game.correct_count : s > 0 ? 1 : 0);
      const correct =
        game.correct_count !== undefined && game.correct_count !== null
          ? game.correct_count
          : Math.round((s / (total || 100)) * (total || 1));

      addScore(resolvedName, s, correct, total, true, isCurrent);
    });

    // Ensure current student exists in map even if they haven't finished a test yet
    if (resolvedCurrentName && normCurrent && !map[normCurrent]) {
      map[normCurrent] = {
        displayName: resolvedCurrentName,
        totalScore: 0,
        totalCorrect: 0,
        totalQuestions: 0,
        examCount: 0,
        gameCount: 0,
      };
    }

    // Convert map to sorted list
    const sortedList = Object.entries(map).map(([normKey, data]) => {
      const accuracy =
        data.totalQuestions > 0
          ? Math.min(100, Math.round((data.totalCorrect / data.totalQuestions) * 100))
          : data.totalScore > 0
          ? 100
          : 0;

      return {
        normKey,
        name: data.displayName,
        totalScore: data.totalScore,
        completedCount: data.examCount + data.gameCount,
        examCount: data.examCount,
        gameCount: data.gameCount,
        accuracy,
      };
    });

    // Sort descending by totalScore, then by accuracy, then completedCount
    sortedList.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return b.completedCount - a.completedCount;
    });

    // Build Top 10
    const top10: LeaderboardStudent[] = sortedList.slice(0, 10).map((item, idx) => {
      const rank = idx + 1;
      let badge: "gold" | "silver" | "bronze" | "top10" = "top10";
      if (rank === 1) badge = "gold";
      else if (rank === 2) badge = "silver";
      else if (rank === 3) badge = "bronze";

      return {
        rank,
        name: item.name,
        totalScore: item.totalScore,
        completedCount: item.completedCount,
        accuracy: item.accuracy,
        isCurrentStudent: item.normKey === normCurrent,
        badge,
      };
    });

    // Find current student rank and stats
    let currentStudentStats: StudentProgressStats | null = null;
    if (normCurrent) {
      const studentIndex = sortedList.findIndex((item) => item.normKey === normCurrent);
      const studentData = studentIndex !== -1 ? sortedList[studentIndex] : null;

      const rank = studentIndex !== -1 ? studentIndex + 1 : null;
      const isInTop10 = rank !== null && rank <= 10;
      const score = studentData?.totalScore || 0;
      const completed = studentData?.completedCount || 0;

      // Points needed to reach 10th place
      const tenthScore = sortedList.length >= 10 ? sortedList[9].totalScore : 0;
      const pointsToTop10 = isInTop10 ? 0 : Math.max(0, tenthScore - score + 1);

      // Compute achievements
      const achievements: AchievementItem[] = [
        {
          id: "first_challenge",
          title: "الانطلاقة العلمية",
          description: "إكمال أول اختبار أو لعبة بنجاح في المنصة",
          icon: "🚀",
          unlocked: completed >= 1,
          progress: Math.min(1, completed),
          maxProgress: 1,
        },
        {
          id: "points_50",
          title: "جامع النقاط",
          description: "حصد 50 نقطة في التحديات والمسابقات",
          icon: "⭐",
          unlocked: score >= 50,
          progress: Math.min(50, score),
          maxProgress: 50,
        },
        {
          id: "points_100",
          title: "الخبير العلمي",
          description: "حصد 100 نقطة أو أكثر في مجالات العلوم",
          icon: "🎯",
          unlocked: score >= 100,
          progress: Math.min(100, score),
          maxProgress: 100,
        },
        {
          id: "five_challenges",
          title: "بطل الاستمرار",
          description: "إتمام 5 تحديات أو اختبارات في المنصة",
          icon: "🔥",
          unlocked: completed >= 5,
          progress: Math.min(5, completed),
          maxProgress: 5,
        },
        {
          id: "top_10_hero",
          title: "قائمة المتصدرين",
          description: "الدخول ضمن أفضل 10 طلاب على مستوى المنصة وحصد الشهادة",
          icon: "👑",
          unlocked: isInTop10,
          progress: isInTop10 ? 1 : 0,
          maxProgress: 1,
        },
      ];

      currentStudentStats = {
        studentName: resolvedCurrentName || currentStudentName || "طالب متميز",
        rank,
        isInTop10,
        totalScore: score,
        completedExams: studentData?.examCount || 0,
        completedGames: studentData?.gameCount || 0,
        totalCompleted: completed,
        accuracy: studentData?.accuracy || 0,
        pointsToTop10,
        achievements,
      };
    }

    return {
      top10,
      currentStudentStats,
      totalParticipants: sortedList.length,
    };
  } catch (error) {
    console.error("Error in getPlatformLeaderboard:", error);
    return {
      top10: [],
      currentStudentStats: null,
      totalParticipants: 0,
    };
  }
}
