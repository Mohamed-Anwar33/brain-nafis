import { SelectionScopeValue, TrackType } from "@/types/selection";

export type AdventureStatus = "draft" | "published" | "inactive" | "archived";

export type GameplayPhase =
  | "briefing"
  | "exploration"
  | "key_found"
  | "portal"
  | "challenges"
  | "treasure"
  | "completed";

export type ChallengeType = "mcq" | "ordering" | "hotspot";

export interface EnvironmentConfig {
  theme: "ancient_ruins" | "desert_portal" | "crystal_cavern" | "laboratory";
  key_node: "statue" | "altar" | "obelisk" | "ancient_chest";
  time_limit_seconds: number;
}

export interface HotspotCoordinates {
  x_percent: number;
  y_percent: number;
  tolerance_radius_percent: number;
}

export interface TreasureHotspotQuestion {
  id: string;
  title: string;
  prompt: string;
  image_url: string;
  target_x_percent: number;
  target_y_percent: number;
  tolerance_radius_percent: number;
  wrong_reason?: string | null;
  explanation_url?: string | null;
  track_type: TrackType;
  grade_subject_id: string;
  domain_id?: string | null;
  created_at: string;
}

export interface TreasureAdventureVersionChallenge {
  id: string;
  adventure_version_id: string;
  step: number;
  challenge_type: ChallengeType;
  source_question_id: string;
  prompt: string;
  image_url?: string | null;
  wrong_reason?: string | null;
  explanation_url?: string | null;
  content_payload: Record<string, any>;
  solution_payload?: Record<string, any>; // Strictly server-only in live play, visible only in admin preview
}

export interface TreasureAdventureVersion {
  id: string;
  adventure_id: string;
  version_number: number;
  story_clue: string;
  is_draft: boolean;
  environment_config: EnvironmentConfig;
  challenges?: TreasureAdventureVersionChallenge[];
  created_at: string;
  updated_at: string;
}

export interface TreasureAdventure {
  id: string;
  title: string;
  description?: string | null;
  track_type: TrackType;
  grade_subject_id: string;
  domain_id?: string | null;
  status: AdventureStatus;
  published_version_id?: string | null;
  versions?: TreasureAdventureVersion[];
  published_version?: TreasureAdventureVersion;
  draft_version?: TreasureAdventureVersion;
  created_at: string;
  updated_at: string;
}

export interface ClientChallengeItem {
  step: number;
  challenge_type: ChallengeType;
  prompt: string;
  image_url?: string | null;
  wrong_reason?: string | null;
  explanation_url?: string | null;
  content: {
    choices?: { id: string; text: string; image_url?: string }[];
    items?: { id: string; text: string; imageUrl?: string }[];
    drop_labels?: string[];
    diagram_url?: string;
  };
}

export interface StartTreasureSessionResponse {
  resumed: boolean;
  session_id: string;
  adventure_id: string;
  adventure_title: string;
  story_clue: string;
  environment_config: EnvironmentConfig;
  current_phase: GameplayPhase;
  current_challenge_step: number;
  accumulated_score: number;
  started_at: string;
  challenges: ClientChallengeItem[];
}

export interface SubmitStepResponse {
  is_correct: boolean;
  points_earned: number;
  attempts_taken: number;
  current_challenge_step: number;
  current_phase: GameplayPhase;
  exhausted_attempts?: boolean;
  explanation?: {
    wrong_reason?: string | null;
    explanation_url?: string | null;
  } | null;
}

export interface FinalizeAttemptResponse {
  success: boolean;
  attempt_id: string;
  session_id: string;
  final_score: number;
  base_score: number;
  speed_bonus: number;
  duration_seconds: number;
  is_passed: boolean;
  is_certificate_eligible: boolean;
  challenges_snapshot?: any[];
}

export interface AdminPreviewResponse {
  is_preview: boolean;
  adventure_id: string;
  adventure_title: string;
  status: AdventureStatus;
  version_id: string;
  version_number: number;
  is_draft: boolean;
  story_clue: string;
  environment_config: EnvironmentConfig;
  challenges: (ClientChallengeItem & {
    wrong_reason?: string | null;
    explanation_url?: string | null;
    solution_preview: Record<string, any>;
  })[];
}
