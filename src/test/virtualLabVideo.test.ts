import { describe, expect, it } from "vitest";
import { getVideoButtonLabel, isInteractiveSimulationUrl } from "@/lib/virtual-lab-video";

describe("virtual lab video action label", () => {
  it("explains that saving answers is required before the video can open", () => {
    expect(getVideoButtonLabel({ hasAttempt: false, isOpening: false, isOpened: false, isSimulation: false }))
      .toBe("احفظ الإجابات أولًا");
  });

  it("shows progress while the app records that the video is opening", () => {
    expect(getVideoButtonLabel({ hasAttempt: true, isOpening: true, isOpened: false, isSimulation: false }))
      .toBe("جارٍ فتح التجربة...");
  });

  it("labels an interactive simulation as a simulation instead of a video", () => {
    expect(getVideoButtonLabel({ hasAttempt: true, isOpening: false, isOpened: false, isSimulation: true }))
      .toBe("ابدأ المحاكاة");
    expect(isInteractiveSimulationUrl("https://phet.colorado.edu/sims/html/forces-and-motion-basics/latest/forces-and-motion-basics_ar_SA.html"))
      .toBe(true);
  });
});
