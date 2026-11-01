export function getVideoButtonLabel(state: {
  hasAttempt: boolean;
  isOpening: boolean;
  isOpened: boolean;
  isSimulation: boolean;
}) {
  if (state.isOpening) return "جارٍ فتح التجربة...";
  if (state.isOpened) return state.isSimulation ? "المحاكاة مفتوحة" : "الفيديو مفتوح";
  if (!state.hasAttempt) return "احفظ الإجابات أولًا";
  return state.isSimulation ? "ابدأ المحاكاة" : "شاهد فيديو التجربة";
}

export function isInteractiveSimulationUrl(input: string) {
  try {
    const hostname = new URL(input).hostname.toLowerCase();
    return hostname === "phet.colorado.edu" || hostname.endsWith(".phet.colorado.edu");
  } catch {
    return false;
  }
}
