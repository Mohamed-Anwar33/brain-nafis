export function getVideoButtonLabel(state: {
  hasAttempt: boolean;
  isOpening: boolean;
  isOpened: boolean;
}) {
  if (state.isOpening) return "جارٍ فتح التجربة...";
  if (state.isOpened) return "تم فتح التجربة";
  if (!state.hasAttempt) return "احفظ الإجابات أولًا";
  return "شاهد فيديو التجربة";
}
