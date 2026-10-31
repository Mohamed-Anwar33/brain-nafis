export interface TreasureResultFeedbackInput {
  finalScore: number;
  durationSeconds: number;
  isPassed: boolean;
  subjectPointEligible: boolean;
}

export function getTreasureResultFeedback({
  finalScore,
  durationSeconds,
  isPassed,
  subjectPointEligible,
}: TreasureResultFeedbackInput) {
  const isPerfectScore = finalScore === 100;
  const metRewardTime = durationSeconds < 5 * 60;
  const earnedPerfectScore = subjectPointEligible;
  const hasPerfectRun = isPerfectScore && metRewardTime;

  const resultTitle = earnedPerfectScore
    ? "يا سلام يا بطلة! فتحتِ الكنز الذهبي 🎉"
    : isPerfectScore && !metRewardTime
      ? "١٠٠٪ إنجاز رائع! بقي تحدي الوقت ⏱️"
      : hasPerfectRun
        ? "أداء كامل! نتحقق من الدرجة الإضافية ✨"
        : isPerfectScore
          ? "نتيجة كاملة! أكملي التحديات بإجابات صحيحة 🌟"
          : isPassed
            ? "أحسنتِ! أنهيتِ مغامرة الكنز 🌟"
            : "هذه محاولة، والفرصة القادمة بانتظارك 💪";

  const resultMessage = earnedPerfectScore
    ? "أجبتِ عن جميع التحديات بشكل صحيح، وحققتِ ١٠٠٪ في أقل من ٥ دقائق. تستحقين درجة إضافية في المادة!"
    : isPerfectScore && !metRewardTime
      ? "حققتِ الدرجة الكاملة! أعيدي المغامرة وأنهيها في أقل من ٥ دقائق لتحصلي على الدرجة الإضافية."
      : hasPerfectRun
        ? "نتيجتك ووقتك ممتازان! نحتاج إلى تأكيد أن جميع إجابات التحديات صحيحة قبل تسجيل الدرجة الإضافية."
        : isPerfectScore
          ? "نتيجتك ١٠٠٪! للحصول على الدرجة الإضافية، أجيبي عن جميع التحديات بشكل صحيح وأنهيها في أقل من ٥ دقائق."
          : isPassed
            ? "أتممتِ المغامرة بنتيجة جميلة. راجعي التحديات وحاولي مرة أخرى؛ ما زالت الدرجة الكاملة والكنز الذهبي في انتظارك!"
            : "ما زالت أمامك فرصة جديدة! خذي وقتك في مراجعة التحديات ثم حاولي مرة أخرى، فقد تكون المحاولة القادمة هي الفوز.";

  return {
    isPerfectScore,
    metRewardTime,
    earnedPerfectScore,
    hasPerfectRun,
    resultTitle,
    resultMessage,
  };
}
