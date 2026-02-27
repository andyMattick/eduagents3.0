// src/services/usageService.ts
// Daily assessment usage tracking for the free tier.

import { supabase } from "@/supabase/client";

export const FREE_DAILY_LIMIT = 5;

export interface DailyUsage {
  count: number;
  limit: number;
  remaining: number;
  canGenerate: boolean;
}

/**
 * Returns today's assessment count for a user by counting rows in
 * teacher_assessment_history where created_at >= midnight UTC today.
 * Falls back gracefully if Supabase is unavailable.
 */
export async function getDailyUsage(userId: string): Promise<DailyUsage> {
  const limit = FREE_DAILY_LIMIT;

  // Anonymous / unset user — always allow
  if (!userId || userId === "00000000-0000-0000-0000-000000000000") {
    return { count: 0, limit, remaining: limit, canGenerate: true };
  }

  try {
    const todayMidnightUTC = new Date();
    todayMidnightUTC.setUTCHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from("teacher_assessment_history")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", userId)
      .gte("created_at", todayMidnightUTC.toISOString());

    if (error) {
      console.warn("[usageService] count query failed (non-fatal):", error.message);
      // Fail CLOSED — if we can't verify usage, block the request.
      // This prevents abuse when Supabase is temporarily unreachable.
      return { count: limit, limit, remaining: 0, canGenerate: false };
    }

    const today = count ?? 0;
    return {
      count: today,
      limit,
      remaining: Math.max(0, limit - today),
      canGenerate: today < limit,
    };
  } catch (e) {
    console.warn("[usageService] unexpected error:", e);
    // Fail CLOSED
    return { count: limit, limit, remaining: 0, canGenerate: false };
  }
}
