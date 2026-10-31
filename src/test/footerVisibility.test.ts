import { describe, expect, it } from "vitest";
import { shouldShowFooterSections } from "@/lib/footer-visibility";

describe("editable footer sections visibility", () => {
  it.each([
    "/exam/attempt-123",
    "/exam/attempt-123/",
    "/games/matching",
    "/games/treasure/active",
    "/central-exam/play",
    "/central-exam/games",
  ])("hides the sections while a student is taking an assessment at %s", (pathname) => {
    expect(shouldShowFooterSections(pathname)).toBe(false);
  });

  it.each([
    "/",
    "/student/dashboard",
    "/student/games",
    "/student/science-activities",
    "/result/attempt-123",
    "/admin/nafis/questions",
  ])("shows the sections on a non-assessment page at %s", (pathname) => {
    expect(shouldShowFooterSections(pathname)).toBe(true);
  });
});
