import { ClientChallengeItem } from "@/types/treasure";

export interface StageDefinition {
  stageNumber: number;
  stageTitle: string;
  stageSubtitle: string;
  themeColor: string;
  targetAccumulatedScore: number;
}

export const TREASURE_STAGES: StageDefinition[] = [
  {
    stageNumber: 1,
    stageTitle: "المرحلة الأولى: أختام بوابة الرياح",
    stageSubtitle: "فك أختام المادة وخصائصها الأساسية",
    themeColor: "from-amber-500 to-yellow-500",
    targetAccumulatedScore: 25,
  },
  {
    stageNumber: 2,
    stageTitle: "المرحلة الثانية: لؤلؤة الأعماق",
    stageSubtitle: "كشف أسرار الطاقة وتحولاتها في الطبيعة",
    themeColor: "from-sky-500 to-blue-600",
    targetAccumulatedScore: 50,
  },
  {
    stageNumber: 3,
    stageTitle: "المرحلة الثالثة: شعلة المعرفة الفائقة",
    stageSubtitle: "الخلية والعمليات الحيوية للكائنات الحية",
    themeColor: "from-emerald-500 to-teal-600",
    targetAccumulatedScore: 75,
  },
  {
    stageNumber: 4,
    stageTitle: "المرحلة الرابعة: الكنز الأسطوري الأعظم",
    stageSubtitle: "قوى الكون والفضاء والظواهر الطبيعية الكبرى",
    themeColor: "from-amber-400 to-amber-600",
    targetAccumulatedScore: 100,
  },
];

export const DEFAULT_TREASURE_12_CHALLENGES: ClientChallengeItem[] = [
  // ================= STAGE 1 (Questions 1, 2, 3) =================
  {
    step: 1,
    challenge_type: "mcq",
    prompt: "ما هي وحدة قياس القوة في النظام الدولي للوحدات (SI)؟",
    wrong_reason: "تذكر أن النيوتن (N) هو الوحدة الدولية المعتمدة لقياس القوة، وسُمي تكريماً للعالم إسحاق نيوتن.",
    content: {
      choices: [
        { id: "s1_c1_a", text: "النيوتن (Newton)" },
        { id: "s1_c1_b", text: "الجول (Joule)" },
        { id: "s1_c1_c", text: "الكيلوجرام (Kilogram)" },
        { id: "s1_c1_d", text: "المتر لكل ثانية" },
      ],
    },
  },
  {
    step: 2,
    challenge_type: "ordering",
    prompt: "رتّب حالات المادة الثلاث وفقاً لقوة التماسك والترابط بين جزيئاتها من الأقوى إلى الأضعف:",
    wrong_reason: "المواد الصلبة تتميز بأقوى ترابط جزيئي، تليها السوائل بترابط متوسط، ثم الغازات بأضعف ترابط.",
    content: {
      items: [
        { id: "s1_ord_1", text: "1. الحالة الصلبة (جزيئات متراصة ومترابطة بقوة)" },
        { id: "s1_ord_2", text: "2. الحالة السائلة (جزيئات متقاربة وقابلة للانزلاق)" },
        { id: "s1_ord_3", text: "3. الحالة الغازية (جزيئات متباعدة وحرة الحركة)" },
      ],
      drop_labels: ["الأقوى تماسكاً", "متوسطة التماسك", "الأضعف تماسكاً"],
    },
  },
  {
    step: 3,
    challenge_type: "mcq",
    prompt: "ما الذي يحدث لكتلة قطعة من الجليد عند انصهارها وتحولها إلى ماء سائل في وعاء مغلق تماماً؟",
    wrong_reason: "ينص قانون حفظ الكتلة على أن الكتلة لا تفنى ولا تستحدث من العدم، وبالتالي تبقى الكتلة ثابتة أثناء التغيرات الفيزيائية.",
    content: {
      choices: [
        { id: "s1_c3_a", text: "تبقى الكتلة ثابتة لا تتغير (قانون حفظ الكتلة)" },
        { id: "s1_c3_b", text: "تزداد الكتلة بسبب تمدد الماء" },
        { id: "s1_c3_c", text: "تنقص الكتلة بنسبة طفيفة" },
        { id: "s1_c3_d", text: "تتحول نصف الكتلة إلى غاز" },
      ],
    },
  },

  // ================= STAGE 2 (Questions 4, 5, 6) =================
  {
    step: 4,
    challenge_type: "mcq",
    prompt: "ما نوع الطاقة المخزنة في الروابط الكيميائية داخل جزيئات الغذاء والوقود؟",
    wrong_reason: "الروابط بين الذرات تخزن طاقة وضع كيميائية تتحرر عند حدوث التفاعلات الكيميائية.",
    content: {
      choices: [
        { id: "s2_c4_a", text: "طاقة كيميائية كامنة (وضع)" },
        { id: "s2_c4_b", text: "طاقة حركية ميكانيكية" },
        { id: "s2_c4_c", text: "طاقة إشعاعية كهرومغناطيسية" },
        { id: "s2_c4_d", text: "طاقة حرارية مباشرة" },
      ],
    },
  },
  {
    step: 5,
    challenge_type: "ordering",
    prompt: "رتّب مراحل دورة الماء في الطبيعة بالترتيب العلمي الصحيح من البداية:",
    wrong_reason: "تبدأ الدورة بتبخر الماء بفعل حرارة الشمس، ثم تكاثفه في طبقات الجو لتكوين الغيوم، ثم الهطول، وأخيراً الجريان السطحي.",
    content: {
      items: [
        { id: "s2_ord_1", text: "1. تبخر الماء من البحار والمحيطات بفعل حرارة الشمس" },
        { id: "s2_ord_2", text: "2. تكاثف بخار الماء في طبقات الجو وتكوّن السحب" },
        { id: "s2_ord_3", text: "3. هطول الأمطار أو الثلوج على سطح الأرض" },
        { id: "s2_ord_4", text: "4. الجريان السطحي للمياه وعودتها للبحار والمياه الجوفية" },
      ],
      drop_labels: ["المرحلة الأولى", "المرحلة الثانية", "المرحلة الثالثة", "المرحلة الرابعة"],
    },
  },
  {
    step: 6,
    challenge_type: "mcq",
    prompt: "أيّ من الأجهزة التالية يقوم بتحويل الطاقة الحركية مباشرة إلى طاقة كهربائية؟",
    wrong_reason: "المولدات الكهربائية وتوربينات الرياح تستغل الحركة الدورانية لإنتاج تيار كهربائي حثّي.",
    content: {
      choices: [
        { id: "s2_c6_a", text: "توربينات الرياح والمولدات الكهرومائية" },
        { id: "s2_c6_b", text: "المصباح الكهربائي المتوهج" },
        { id: "s2_c6_c", text: "البطاريات الجافة القلوية" },
        { id: "s2_c6_d", text: "السخان الشمسي المنزلي" },
      ],
    },
  },

  // ================= STAGE 3 (Questions 7, 8, 9) =================
  {
    step: 7,
    challenge_type: "mcq",
    prompt: "ما هو العُضَيّ الخلوي المسؤول عن إنتاج الطاقة (ATP) وعملية التنفس الخلوي في الخلية؟",
    wrong_reason: "الميتوكوندريا هي محطة توليد الطاقة في الخلية الحية وتقوم بإنتاج جزيئات ATP.",
    content: {
      choices: [
        { id: "s3_c7_a", text: "الميتوكوندريا (Mitochondria)" },
        { id: "s3_c7_b", text: "جهاز جولجي (Golgi apparatus)" },
        { id: "s3_c7_c", text: "الريبوسومات (Ribosomes)" },
        { id: "s3_c7_d", text: "الجدار الخلوي" },
      ],
    },
  },
  {
    step: 8,
    challenge_type: "ordering",
    prompt: "رتّب مستويات التنظيم الحيوي في الكائنات الحية عديدة الخلايا من الأبسط إلى الأكثر تعقيداً:",
    wrong_reason: "تتجمع الخلايا لتكوين أنسجة، والأنسجة تشكل أعضاء، والأعضاء تعمل معاً في أجهزة حيوية.",
    content: {
      items: [
        { id: "s3_ord_1", text: "1. الخلية (وحدة البناء والوظيفة الأساسية)" },
        { id: "s3_ord_2", text: "2. النسيج (مجموعة خلايا متشابهة تؤدي وظيفة محددة)" },
        { id: "s3_ord_3", text: "3. العضو (مجموعة أنسجة تعمل معاً مثل القلب)" },
        { id: "s3_ord_4", text: "4. الجهاز الحيوي (مجموعة أعضاء مثل الجهاز الدوري)" },
      ],
      drop_labels: ["المستوى الأول (الأبسط)", "المستوى الثاني", "المستوى الثالث", "المستوى الرابع (الأكثر تعقيداً)"],
    },
  },
  {
    step: 9,
    challenge_type: "mcq",
    prompt: "ما العملية الحيوية التي يصنع بها النبات الأخضر غذاءه (الجلوكوز) منتجاً غاز الأكسجين كناتج ثانوي؟",
    wrong_reason: "البناء الضوئي يتم داخل البلاستيدات الخضراء باستخدام الطاقة الضوئية والماء وثاني أكسيد الكربون.",
    content: {
      choices: [
        { id: "s3_c9_a", text: "عملية البناء الضوئي (Photosynthesis)" },
        { id: "s3_c9_b", text: "التنفس الخلوي اللاهوائي" },
        { id: "s3_c9_c", text: "التخمر اللبني" },
        { id: "s3_c9_d", text: "النتح التبخيري" },
      ],
    },
  },

  // ================= STAGE 4 (Questions 10, 11, 12) =================
  {
    step: 10,
    challenge_type: "mcq",
    prompt: "ما هي القوة الكونية المسؤولة عن بقاء الكواكب في مداراتها المنتظمة حول الشمس؟",
    wrong_reason: "قوة الجاذبية المتبادلة بين كتلة الشمس الهائلة والكواكب هي التي تحافظ على دورانها في مدارات بيضاوية ثابتة.",
    content: {
      choices: [
        { id: "s4_c10_a", text: "قوة الجاذبية (Gravitational force)" },
        { id: "s4_c10_b", text: "القوة الكهرومغناطيسية المعاكسة" },
        { id: "s4_c10_c", text: "القوة النووية الكبرى" },
        { id: "s4_c10_d", text: "قوة الضغط الإشعاعي" },
      ],
    },
  },
  {
    step: 11,
    challenge_type: "ordering",
    prompt: "رتّب الكواكب الأربعة التالية حسب قربها من الشمس من الأقرب إلى الأبعد:",
    wrong_reason: "الكواكب الصخرية الداخلية الأربعة بالترتيب من الشمس: عطارد، ثم الزهرة، ثم الأرض، ثم المريخ.",
    content: {
      items: [
        { id: "s4_ord_1", text: "1. عطارد (الكوكب الأقرب للشمس)" },
        { id: "s4_ord_2", text: "2. كوكب الزهرة (أشد الكواكب حرارة)" },
        { id: "s4_ord_3", text: "3. كوكب الأرض (كوكب الحياة)" },
        { id: "s4_ord_4", text: "4. كوكب المريخ (الكوكب الأحمر)" },
      ],
      drop_labels: ["الأقرب للشمس", "الكوكب الثاني", "الكوكب الثالث", "الكوكب الرابع"],
    },
  },
  {
    step: 12,
    challenge_type: "mcq",
    prompt: "ما هي أقصى سرعة كونية تم رصدها في الفيزياء والكون الفسيح؟",
    wrong_reason: "سرعة الضوء في الفراغ وتبلغ حوالي 300,000 كيلومتر في الثانية وهي الحد الأقصى الكوني للسرعة.",
    content: {
      choices: [
        { id: "s4_c12_a", text: "سرعة الضوء في الفراغ (حوالي 300,000 كم/ثانية)" },
        { id: "s4_c12_b", text: "سرعة الصوت في الغلاف الجوي" },
        { id: "s4_c12_c", text: "سرعة دوران الأرض حول الشمس" },
        { id: "s4_c12_d", text: "سرعة الرياح الشمسية" },
      ],
    },
  },
];

// Solutions dictionary for correct validation
export const TREASURE_SOLUTIONS: Record<number, Record<string, any>> = {
  1: { correct_choice_id: "s1_c1_a" },
  2: { correct_order: ["s1_ord_1", "s1_ord_2", "s1_ord_3"] },
  3: { correct_choice_id: "s1_c3_a" },
  4: { correct_choice_id: "s2_c4_a" },
  5: { correct_order: ["s2_ord_1", "s2_ord_2", "s2_ord_3", "s2_ord_4"] },
  6: { correct_choice_id: "s2_c6_a" },
  7: { correct_choice_id: "s3_c7_a" },
  8: { correct_order: ["s3_ord_1", "s3_ord_2", "s3_ord_3", "s3_ord_4"] },
  9: { correct_choice_id: "s3_c9_a" },
  10: { correct_choice_id: "s4_c10_a" },
  11: { correct_order: ["s4_ord_1", "s4_ord_2", "s4_ord_3", "s4_ord_4"] },
  12: { correct_choice_id: "s4_c12_a" },
};
