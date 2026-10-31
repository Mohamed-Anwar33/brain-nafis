const ASSESSMENT_ROUTE_PREFIXES = [
  "/exam/",
  "/games/",
  "/central-exam/play/",
  "/central-exam/games/",
];
const ASSESSMENT_ROUTES = new Set([
  "/exam",
  "/games",
  "/central-exam/play",
  "/central-exam/games",
]);

export function shouldShowFooterSections(pathname: string): boolean {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  if (ASSESSMENT_ROUTES.has(normalizedPath)) return false;
  return !ASSESSMENT_ROUTE_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
}
