import { describe, expect, it } from "vitest";
import { getVideoButtonLabel } from "@/lib/virtual-lab-video";

describe("virtual lab video action label", () => {
  it("explains that saving answers is required before the video can open", () => {
    expect(getVideoButtonLabel({ hasAttempt: false, isOpening: false, isOpened: false }))
      .toBe("احفظ الإجابات أولًا");
  });

  it("shows progress while the app records that the video is opening", () => {
    expect(getVideoButtonLabel({ hasAttempt: true, isOpening: true, isOpened: false }))
      .toBe("جارٍ فتح التجربة...");
  });
});
