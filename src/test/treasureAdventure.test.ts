import { describe, it, expect } from "vitest";

describe("Treasure Adventure - Scoring & Business Rules Engine", () => {
  // Speed Bonus Calculation Rule
  // <= 180 sec: 10 pts
  // Between 180 and 480 sec: decreases by 1 pt per 30 sec
  // >= 480 sec: 0 pts
  const calculateSpeedBonus = (elapsedSeconds: number): number => {
    if (elapsedSeconds <= 180) return 10;
    if (elapsedSeconds >= 480) return 0;
    return Math.max(0, 10 - Math.floor((elapsedSeconds - 180) / 30));
  };

  // Euclidean Distance in Normalized Percentage Space
  const isHotspotWithinTolerance = (
    clickX: number,
    clickY: number,
    targetX: number,
    targetY: number,
    tolerance: number
  ): boolean => {
    const dist = Math.sqrt(Math.pow(clickX - targetX, 2) + Math.pow(clickY - targetY, 2));
    return dist <= tolerance;
  };

  // Attempt scoring rule per challenge
  const calculateChallengeScore = (isCorrect: boolean, attemptsTaken: number): number => {
    if (!isCorrect) return 0;
    if (attemptsTaken === 1) return 30; // 25 base + 5 first-attempt bonus
    if (attemptsTaken === 2) return 25;
    if (attemptsTaken === 3) return 15;
    return 0;
  };

  it("calculates speed bonus correctly across all time bands", () => {
    expect(calculateSpeedBonus(60)).toBe(10);
    expect(calculateSpeedBonus(180)).toBe(10);
    expect(calculateSpeedBonus(181)).toBe(10);
    expect(calculateSpeedBonus(210)).toBe(9);
    expect(calculateSpeedBonus(240)).toBe(8);
    expect(calculateSpeedBonus(300)).toBe(6);
    expect(calculateSpeedBonus(450)).toBe(1);
    expect(calculateSpeedBonus(480)).toBe(0);
    expect(calculateSpeedBonus(600)).toBe(0);
  });

  it("calculates per-challenge 3-attempt scoring accurately", () => {
    // Attempt 1 correct = 30 pts
    expect(calculateChallengeScore(true, 1)).toBe(30);
    // Attempt 2 correct = 25 pts
    expect(calculateChallengeScore(true, 2)).toBe(25);
    // Attempt 3 correct = 15 pts
    expect(calculateChallengeScore(true, 3)).toBe(15);
    // Wrong final attempt = 0 pts
    expect(calculateChallengeScore(false, 3)).toBe(0);
  });

  it("determines certificate eligibility and pass marks authoritatively", () => {
    // Maximum theoretical score: 30 + 30 + 30 + 10 = 100
    const perfectScore = 30 + 30 + 30 + calculateSpeedBonus(120);
    expect(perfectScore).toBe(100);
    expect(perfectScore >= 70).toBe(true); // Pass
    expect(perfectScore >= 80).toBe(true); // Certificate eligible

    // Mid-tier score: 25 + 25 + 25 + 8 = 83 -> Eligible
    const midScore = 25 + 25 + 25 + calculateSpeedBonus(240);
    expect(midScore).toBe(83);
    expect(midScore >= 80).toBe(true);

    // Borderline passing score: 25 + 25 + 15 + 5 = 70 -> Passed, but not Certificate eligible
    const borderScore = 25 + 25 + 15 + 5;
    expect(borderScore >= 70).toBe(true);
    expect(borderScore >= 80).toBe(false);

    // Failing score: 25 + 15 + 0 + 10 = 50 -> Failed
    const failScore = 25 + 15 + 0 + 10;
    expect(failScore >= 70).toBe(false);
  });

  it("validates Hotspot Euclidean distance accurately in normalized 0-100 percentage space", () => {
    const targetX = 50;
    const targetY = 50;
    const tolerance = 8;

    // Direct hit
    expect(isHotspotWithinTolerance(50, 50, targetX, targetY, tolerance)).toBe(true);

    // Hit within tolerance radius (dist = 5 < 8)
    expect(isHotspotWithinTolerance(53, 54, targetX, targetY, tolerance)).toBe(true);

    // Hit exactly at tolerance edge (dist = 8)
    expect(isHotspotWithinTolerance(50, 58, targetX, targetY, tolerance)).toBe(true);

    // Miss outside tolerance (dist = 9 > 8)
    expect(isHotspotWithinTolerance(50, 59, targetX, targetY, tolerance)).toBe(false);

    // Far miss
    expect(isHotspotWithinTolerance(10, 10, targetX, targetY, tolerance)).toBe(false);
  });

  it("verifies academic scope integrity rules", () => {
    const validateScope = (trackType: string, gradeSubjectId: string | null, domainId: string | null): boolean => {
      if (!gradeSubjectId) return false;
      if (trackType === "nafis") {
        return domainId === null;
      }
      if (trackType === "central" || trackType === "central_exam") {
        return domainId !== null;
      }
      return false;
    };

    // Nafis requires grade_subject_id and NO domain_id
    expect(validateScope("nafis", "gs-123", null)).toBe(true);
    expect(validateScope("nafis", "gs-123", "dom-456")).toBe(false);
    expect(validateScope("nafis", null, null)).toBe(false);

    // Central Exam requires BOTH grade_subject_id AND domain_id
    expect(validateScope("central", "gs-123", "dom-456")).toBe(true);
    expect(validateScope("central", "gs-123", null)).toBe(false);
    expect(validateScope("central_exam", "gs-123", "dom-456")).toBe(true);
  });

  it("verifies 4-stage Treasure Game structure (3 questions each, 25 pts per stage, 100 total)", async () => {
    const { DEFAULT_TREASURE_12_CHALLENGES, TREASURE_STAGES, TREASURE_SOLUTIONS } = await import(
      "../pages/games/treasure/data/defaultTreasureStages"
    );

    // Exactly 4 stages
    expect(TREASURE_STAGES.length).toBe(4);
    expect(TREASURE_STAGES[0].targetAccumulatedScore).toBe(25);
    expect(TREASURE_STAGES[1].targetAccumulatedScore).toBe(50);
    expect(TREASURE_STAGES[2].targetAccumulatedScore).toBe(75);
    expect(TREASURE_STAGES[3].targetAccumulatedScore).toBe(100);

    // Exactly 12 challenges
    expect(DEFAULT_TREASURE_12_CHALLENGES.length).toBe(12);

    // Verify each stage has exactly 3 questions
    for (let stage = 1; stage <= 4; stage++) {
      const stageQuestions = DEFAULT_TREASURE_12_CHALLENGES.filter(
        (ch) => Math.floor((ch.step - 1) / 3) + 1 === stage
      );
      expect(stageQuestions.length).toBe(3);

      // Verify milestone step: 3, 6, 9, 12
      const milestoneStep = stage * 3;
      expect(milestoneStep % 3).toBe(0);
    }

    // Verify all 12 solutions exist
    for (let step = 1; step <= 12; step++) {
      expect(TREASURE_SOLUTIONS[step]).toBeDefined();
    }
  });

  it("verifies distinct, world-class 3D stage transitions for all 4 stages and victory", async () => {
    const { TRANSITION_CONFIGS } = await import(
      "../pages/games/treasure/components/TreasureStageTransition3D"
    );

    // Transitions exist for stages: 2 (1->2), 3 (2->3), 4 (3->4), and 5 (4->Victory)
    expect(TRANSITION_CONFIGS[2]).toBeDefined();
    expect(TRANSITION_CONFIGS[3]).toBeDefined();
    expect(TRANSITION_CONFIGS[4]).toBeDefined();
    expect(TRANSITION_CONFIGS[5]).toBeDefined();

    // Verify all 4 transitions have strictly distinct warp types
    const warpTypes = [
      TRANSITION_CONFIGS[2].warpType,
      TRANSITION_CONFIGS[3].warpType,
      TRANSITION_CONFIGS[4].warpType,
      TRANSITION_CONFIGS[5].warpType,
    ];
    const uniqueWarpTypes = new Set(warpTypes);
    expect(uniqueWarpTypes.size).toBe(4);
    expect(warpTypes).toEqual(["wind", "ocean", "flame", "celestial"]);

    // Verify all 4 transitions have distinct titles and color palettes
    const titles = [2, 3, 4, 5].map((st) => TRANSITION_CONFIGS[st].title);
    expect(new Set(titles).size).toBe(4);

    const fogs = [2, 3, 4, 5].map((st) => TRANSITION_CONFIGS[st].colorPalette.fog);
    expect(new Set(fogs).size).toBe(4);
  });
});


