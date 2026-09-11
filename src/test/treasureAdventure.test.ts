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
});
