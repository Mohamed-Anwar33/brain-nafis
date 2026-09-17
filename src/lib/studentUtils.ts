export function isStudentFemale(name?: string | null): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  const femaleNamesRegex = /^(فاطمة|فاطمه|مريم|سارة|ساره|نورة|نوره|هند|ريما|ليان|جود|منى|هدى|هيفاء|روان|رغد|دانة|دانه|لمى|شهد|ريم|أمل|امل|عبير|خلود|عائشة|عائشه|خديجة|خديجه|أسماء|اسماء|نوف|لجين|أروى|اروى|بشاير|وفاء|حنان|أميرة|اميره|تسنيم|زينب|يارا|حنين|جنى|غلا|لمار|كيان|سما|تالا|جوري|لانا|رسيل|ملاك|سحر|سمية|سميه|صفاء|بيان|رهف|غيداء|شروق)/i;
  const maleNamesRegex = /^(محمد|أحمد|احمد|محمود|علي|عمر|خالد|يوسف|عبد|إبراهيم|ابراهيم|سعود|فهد|سلطان|فيصل|سلمان|تركي|بندر|ماجد|وليد|ياسر|حمزة|حمزه|عثمان|حسام|طارق|زياد|كريم|مصطفى|معاذ|أنس|انس|بلال|ريان|بدر|مشاري|نايف|راشد|فارس|سعد)/i;

  if (maleNamesRegex.test(trimmed)) return false;
  if (femaleNamesRegex.test(trimmed)) return true;
  const firstWord = trimmed.split(" ")[0] || "";
  if (firstWord.endsWith("ة") || firstWord.endsWith("ه")) return true;
  return false;
}
