export interface StudentAvatar {
  id: string;
  name: string;
  role: string;
  emoji: string;
  gradient: string;
  borderGlow: string;
}

export const STUDENT_AVATARS: StudentAvatar[] = [
  {
    id: "astronaut",
    name: "رائد الفضاء",
    role: "مستكشف الكون والمجرات",
    emoji: "🚀",
    gradient: "from-blue-600 via-indigo-600 to-purple-700",
    borderGlow: "shadow-indigo-500/30",
  },
  {
    id: "chemist",
    name: "الكيميائي المبتكر",
    role: "سيد التفاعلات والذرات",
    emoji: "⚗️",
    gradient: "from-purple-600 via-pink-600 to-rose-600",
    borderGlow: "shadow-purple-500/30",
  },
  {
    id: "biologist",
    name: "عالم الأحياء",
    role: "مكتشف أسرار الحياة",
    emoji: "🧬",
    gradient: "from-emerald-500 via-teal-600 to-cyan-600",
    borderGlow: "shadow-emerald-500/30",
  },
  {
    id: "physicist",
    name: "الفيزيائي العبقري",
    role: "قاهر قوى الكون والطاقة",
    emoji: "⚡",
    gradient: "from-amber-500 via-orange-500 to-red-600",
    borderGlow: "shadow-amber-500/30",
  },
  {
    id: "ai_tech",
    name: "مهندس الذكاء",
    role: "مبرمج حلول المستقبل",
    emoji: "🤖",
    gradient: "from-cyan-500 via-blue-600 to-indigo-700",
    borderGlow: "shadow-cyan-500/30",
  },
  {
    id: "eco_hero",
    name: "حامي كوكب الأرض",
    role: "خبير البيئة والفلك",
    emoji: "🌍",
    gradient: "from-teal-500 via-emerald-600 to-green-700",
    borderGlow: "shadow-teal-500/30",
  },
];

export interface PowerUpInventory {
  fiftyFifty: number;
  smartHint: number;
  shield: number;
}
