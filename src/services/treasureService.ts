import { supabase } from "@/integrations/supabase/client";
import {
  TreasureAdventure,
  TreasureHotspotQuestion,
  StartTreasureSessionResponse,
  SubmitStepResponse,
  FinalizeAttemptResponse,
  AdminPreviewResponse,
  AdventureStatus,
} from "@/types/treasure";
import { SelectionScopeValue } from "@/types/selection";

export const treasureService = {
  // ==========================================
  // Admin Operations
  // ==========================================

  async getAdventures(filters?: {
    scope?: Partial<SelectionScopeValue>;
    status?: AdventureStatus;
  }): Promise<TreasureAdventure[]> {
    let query = (supabase as any)
      .from("treasure_adventures")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    } else {
      query = query.neq("status", "archived");
    }

    if (filters?.scope?.trackType) {
      query = query.eq("track_type", filters.scope.trackType);
    }
    if (filters?.scope?.gradeSubjectId) {
      query = query.eq("grade_subject_id", filters.scope.gradeSubjectId);
    }
    if (filters?.scope?.domainId) {
      query = query.eq("domain_id", filters.scope.domainId);
    }

    const { data: adventuresData, error } = await query;
    if (error) throw error;
    if (!adventuresData || adventuresData.length === 0) return [];

    const adventureIds = adventuresData.map((a: any) => a.id);
    const { data: versionsData } = await (supabase as any)
      .from("treasure_adventure_versions")
      .select("*, challenges:treasure_adventure_version_challenges(*)")
      .in("adventure_id", adventureIds)
      .order("version_number", { ascending: false });

    const versionsByAdventure: Record<string, any[]> = {};
    for (const v of versionsData || []) {
      if (!versionsByAdventure[v.adventure_id]) {
        versionsByAdventure[v.adventure_id] = [];
      }
      versionsByAdventure[v.adventure_id].push(v);
    }

    return adventuresData.map((adv: any) => {
      const advVersions = versionsByAdventure[adv.id] || [];
      const pubVersion = adv.published_version_id
        ? advVersions.find((v: any) => v.id === adv.published_version_id) || null
        : null;
      return {
        ...adv,
        versions: advVersions,
        published_version: pubVersion,
      } as TreasureAdventure;
    });
  },

  async getActiveAdventure(scope?: Partial<SelectionScopeValue>): Promise<TreasureAdventure | null> {
    let query = (supabase as any)
      .from("treasure_adventures")
      .select("*")
      .eq("status", "published");

    if (scope?.trackType) {
      query = query.eq("track_type", scope.trackType);
    }
    if (scope?.gradeSubjectId) {
      query = query.eq("grade_subject_id", scope.gradeSubjectId);
    }
    if (scope?.domainId) {
      query = query.eq("domain_id", scope.domainId);
    }

    let { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("Error fetching scoped active adventure:", error);
    }

    // Fallback 1: Try without domainId if domain was filtered
    if (!data && scope?.domainId) {
      let retryQuery = (supabase as any)
        .from("treasure_adventures")
        .select("*")
        .eq("status", "published");
      if (scope?.trackType) retryQuery = retryQuery.eq("track_type", scope.trackType);
      if (scope?.gradeSubjectId) retryQuery = retryQuery.eq("grade_subject_id", scope.gradeSubjectId);
      const retryRes = await retryQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (retryRes.data) data = retryRes.data;
    }

    // Fallback 2: Try without gradeSubjectId / trackType if still not found
    if (!data) {
      const fallbackRes = await (supabase as any)
        .from("treasure_adventures")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (fallbackRes.data) data = fallbackRes.data;
    }

    if (!data) return null;

    if (data.published_version_id) {
      const { data: versionData } = await (supabase as any)
        .from("treasure_adventure_versions")
        .select("*, challenges:treasure_adventure_version_challenges(*)")
        .eq("id", data.published_version_id)
        .maybeSingle();
      data.published_version = versionData || null;
    } else {
      // Fallback to latest version
      const { data: latestVersion } = await (supabase as any)
        .from("treasure_adventure_versions")
        .select("*, challenges:treasure_adventure_version_challenges(*)")
        .eq("adventure_id", data.id)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      data.published_version = latestVersion || null;
    }

    return data as unknown as TreasureAdventure;
  },

  async getAdventureById(id: string): Promise<TreasureAdventure | null> {
    const { data, error } = await (supabase as any)
      .from("treasure_adventures")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    if (!data) return null;

    const { data: versionsData } = await (supabase as any)
      .from("treasure_adventure_versions")
      .select("*, challenges:treasure_adventure_version_challenges(*)")
      .eq("adventure_id", id)
      .order("version_number", { ascending: false });

    data.versions = versionsData || [];
    data.published_version =
      (versionsData || []).find((v: any) => v.id === data.published_version_id) || null;

    return data as unknown as TreasureAdventure;
  },

  async createAdventure(payload: {
    title: string;
    description?: string;
    track_type: string;
    grade_subject_id: string;
    domain_id?: string | null;
    story_clue: string;
    environment_config?: any;
    challenges?: {
      step: number;
      challenge_type: "mcq" | "ordering" | "hotspot";
      source_question_id?: string;
      prompt: string;
      image_url?: string | null;
      wrong_reason?: string | null;
      explanation_url?: string | null;
      content_payload: Record<string, any>;
      solution_payload: Record<string, any>;
    }[];
    challenge_1?: {
      question_id: string;
      prompt: string;
      choices: { id: string; text: string; is_correct: boolean; image_url?: string }[];
      wrong_reason?: string;
      explanation_url?: string;
    };
    challenge_2?: {
      question_id: string;
      prompt: string;
      items: { id: string; text: string; imageUrl?: string }[];
      correct_order: string[];
      drop_labels?: string[];
      wrong_reason?: string;
      explanation_url?: string;
    };
    challenge_3?: {
      hotspot_question_id: string;
      prompt: string;
      image_url: string;
      target_x_percent: number;
      target_y_percent: number;
      tolerance_radius_percent: number;
      wrong_reason?: string;
      explanation_url?: string;
    };
  }): Promise<{ adventure_id: string; version_id: string }> {
    // 1. Create Adventure Container
    const { data: advData, error: advError } = await (supabase as any)
      .from("treasure_adventures")
      .insert({
        title: payload.title,
        description: payload.description || "",
        track_type: payload.track_type,
        grade_subject_id: payload.grade_subject_id,
        domain_id: payload.domain_id || null,
        status: "draft",
      })
      .select("id")
      .single();

    if (advError) throw advError;
    const adventureId = (advData as any).id;

    // 2. Create Initial Draft Version
    const { data: verData, error: verError } = await (supabase as any)
      .from("treasure_adventure_versions")
      .insert({
        adventure_id: adventureId,
        version_number: 1,
        story_clue: payload.story_clue,
        is_draft: true,
        environment_config: payload.environment_config || {
          theme: "ancient_ruins",
          key_node: "statue",
          time_limit_seconds: 600,
        },
      })
      .select("id")
      .single();

    if (verError) throw verError;
    const versionId = (verData as any).id;

    // 3. Create Challenge Snapshots (Dynamic or Legacy 3-step)
    let challengesToInsert: any[] = [];

    if (payload.challenges && payload.challenges.length > 0) {
      challengesToInsert = payload.challenges.map((ch, idx) => ({
        adventure_version_id: versionId,
        step: idx + 1,
        challenge_type: ch.challenge_type,
        source_question_id: ch.source_question_id || crypto.randomUUID(),
        prompt: ch.prompt,
        image_url: ch.image_url || null,
        wrong_reason: ch.wrong_reason || null,
        explanation_url: ch.explanation_url || null,
        content_payload: ch.content_payload,
        solution_payload: ch.solution_payload,
      }));
    } else if (payload.challenge_1 && payload.challenge_2 && payload.challenge_3) {
      challengesToInsert = [
        // Challenge 1: MCQ
        {
          adventure_version_id: versionId,
          step: 1,
          challenge_type: "mcq",
          source_question_id: payload.challenge_1.question_id,
          prompt: payload.challenge_1.prompt,
          wrong_reason: payload.challenge_1.wrong_reason || null,
          explanation_url: payload.challenge_1.explanation_url || null,
          content_payload: {
            choices: payload.challenge_1.choices.map((c) => ({
              id: c.id,
              text: c.text,
              image_url: c.image_url,
            })),
          },
          solution_payload: {
            correct_choice_id: payload.challenge_1.choices.find((c) => c.is_correct)?.id,
          },
        },
        // Challenge 2: Ordering
        {
          adventure_version_id: versionId,
          step: 2,
          challenge_type: "ordering",
          source_question_id: payload.challenge_2.question_id,
          prompt: payload.challenge_2.prompt,
          wrong_reason: payload.challenge_2.wrong_reason || null,
          explanation_url: payload.challenge_2.explanation_url || null,
          content_payload: {
            items: payload.challenge_2.items,
            drop_labels: payload.challenge_2.drop_labels || [],
          },
          solution_payload: {
            correct_order: payload.challenge_2.correct_order,
          },
        },
        // Challenge 3: Hotspot
        {
          adventure_version_id: versionId,
          step: 3,
          challenge_type: "hotspot",
          source_question_id: payload.challenge_3.hotspot_question_id,
          prompt: payload.challenge_3.prompt,
          image_url: payload.challenge_3.image_url,
          wrong_reason: payload.challenge_3.wrong_reason || null,
          explanation_url: payload.challenge_3.explanation_url || null,
          content_payload: {
            image_url: payload.challenge_3.image_url,
          },
          solution_payload: {
            target_x_percent: payload.challenge_3.target_x_percent,
            target_y_percent: payload.challenge_3.target_y_percent,
            tolerance_radius_percent: payload.challenge_3.tolerance_radius_percent,
          },
        },
      ];
    }

    if (challengesToInsert.length > 0) {
      const { error: chError } = await (supabase as any)
        .from("treasure_adventure_version_challenges")
        .insert(challengesToInsert);

      if (chError) throw chError;
    }

    return { adventure_id: adventureId, version_id: versionId };
  },

  async updateAdventure(
    adventureId: string,
    payload: {
      title: string;
      description?: string;
      track_type: string;
      grade_subject_id: string;
      domain_id?: string | null;
      challenges: {
        step: number;
        challenge_type: "mcq" | "ordering" | "hotspot";
        source_question_id?: string;
        prompt: string;
        image_url?: string | null;
        wrong_reason?: string | null;
        explanation_url?: string | null;
        content_payload: Record<string, any>;
        solution_payload: Record<string, any>;
      }[];
    }
  ): Promise<void> {
    // 1. Update Adventure record
    const { error: advError } = await (supabase as any)
      .from("treasure_adventures")
      .update({
        title: payload.title,
        description: payload.description || "",
        track_type: payload.track_type,
        grade_subject_id: payload.grade_subject_id,
        domain_id: payload.domain_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", adventureId);

    if (advError) throw advError;

    // 2. Find or create a draft version
    const { data: draftVer } = await (supabase as any)
      .from("treasure_adventure_versions")
      .select("id, version_number")
      .eq("adventure_id", adventureId)
      .eq("is_draft", true)
      .maybeSingle();

    let versionId = draftVer?.id;

    if (!versionId) {
      const { data: verList } = await (supabase as any)
        .from("treasure_adventure_versions")
        .select("version_number")
        .eq("adventure_id", adventureId)
        .order("version_number", { ascending: false })
        .limit(1);

      const nextVerNum = (verList?.[0]?.version_number || 0) + 1;

      const { data: newVer, error: newVerError } = await (supabase as any)
        .from("treasure_adventure_versions")
        .insert({
          adventure_id: adventureId,
          version_number: nextVerNum,
          story_clue: "ابحث عن المفتاح الأثري في أنحاء الجزيرة لحل الألغاز وفتح البوابة الأسطورية",
          is_draft: true,
          environment_config: {
            theme: "ancient_ruins",
            key_node: "statue",
            time_limit_seconds: 600,
          },
        })
        .select("id")
        .single();

      if (newVerError) throw newVerError;
      versionId = newVer.id;
    }

    // 3. Delete existing challenges for this draft version and insert updated ones
    await (supabase as any)
      .from("treasure_adventure_version_challenges")
      .delete()
      .eq("adventure_version_id", versionId);

    const challengesToInsert = payload.challenges.map((ch, idx) => ({
      adventure_version_id: versionId,
      step: idx + 1,
      challenge_type: ch.challenge_type,
      source_question_id: ch.source_question_id || crypto.randomUUID(),
      prompt: ch.prompt,
      image_url: ch.image_url || null,
      wrong_reason: ch.wrong_reason || null,
      explanation_url: ch.explanation_url || null,
      content_payload: ch.content_payload,
      solution_payload: ch.solution_payload,
    }));

    if (challengesToInsert.length > 0) {
      const { error: chError } = await (supabase as any)
        .from("treasure_adventure_version_challenges")
        .insert(challengesToInsert);

      if (chError) throw chError;
    }
  },

  async publishAdventure(adventureId: string, versionId: string): Promise<any> {
    const { data, error } = await (supabase as any).rpc(
      "publish_treasure_adventure_version",
      {
        p_adventure_id: adventureId,
        p_version_id: versionId,
      }
    );
    if (error) throw error;
    return data;
  },

  async updateAdventureStatus(
    adventureId: string,
    status: AdventureStatus
  ): Promise<void> {
    const { error } = await (supabase as any)
      .from("treasure_adventures")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", adventureId);

    if (error) throw error;
  },

  async previewAdventure(
    adventureId: string,
    versionId?: string
  ): Promise<AdminPreviewResponse> {
    const { data, error } = await (supabase as any).rpc("preview_treasure_admin", {
      p_adventure_id: adventureId,
      p_version_id: versionId || null,
    });

    if (error) throw error;
    return data as unknown as AdminPreviewResponse;
  },

  // ==========================================
  // Hotspot Question Management
  // ==========================================

  async getHotspotQuestions(scope?: Partial<SelectionScopeValue>): Promise<TreasureHotspotQuestion[]> {
    let query = (supabase as any)
      .from("treasure_hotspot_questions")
      .select("*")
      .order("created_at", { ascending: false });

    if (scope?.trackType) query = query.eq("track_type", scope.trackType);
    if (scope?.gradeSubjectId) query = query.eq("grade_subject_id", scope.gradeSubjectId);
    if (scope?.domainId) query = query.eq("domain_id", scope.domainId);

    const { data, error } = await query;
    if (error) throw error;
    return (data as unknown as TreasureHotspotQuestion[]) || [];
  },

  async createHotspotQuestion(payload: Omit<TreasureHotspotQuestion, "id" | "created_at">): Promise<TreasureHotspotQuestion> {
    const { data, error } = await (supabase as any)
      .from("treasure_hotspot_questions")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as TreasureHotspotQuestion;
  },

  async uploadHotspotImage(file: File, pathPrefix: string = "treasure_hotspots"): Promise<string> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${pathPrefix}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("game-images")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("game-images").getPublicUrl(fileName);
    return data.publicUrl;
  },

  // ==========================================
  // Student Gameplay Operations
  // ==========================================

  async startSession(adventureId: string): Promise<StartTreasureSessionResponse> {
    const { data, error } = await (supabase as any).rpc("start_treasure_session", {
      p_adventure_id: adventureId,
    });
    if (error) throw error;
    return data as unknown as StartTreasureSessionResponse;
  },

  async advancePhase(sessionId: string, targetPhase: string): Promise<any> {
    const { data, error } = await (supabase as any).rpc("advance_treasure_phase", {
      p_session_id: sessionId,
      p_target_phase: targetPhase,
    });
    if (error) throw error;
    return data;
  },

  async submitStep(
    sessionId: string,
    clientRequestId: string,
    step: number,
    answer: Record<string, any>
  ): Promise<SubmitStepResponse> {
    const { data, error } = await (supabase as any).rpc("submit_treasure_step", {
      p_session_id: sessionId,
      p_client_request_id: clientRequestId,
      p_step: step,
      p_answer: answer,
    });
    if (error) throw error;
    return data as unknown as SubmitStepResponse;
  },

  async finalizeAttempt(sessionId: string): Promise<FinalizeAttemptResponse> {
    const { data, error } = await (supabase as any).rpc("finalize_treasure_attempt", {
      p_session_id: sessionId,
    });
    if (error) throw error;
    return data as unknown as FinalizeAttemptResponse;
  },
};
