/**
 * useTeacherProfile.ts
 *
 * React hook for loading, editing, and saving the teacher's persistent profile.
 */

import { useState, useEffect, useCallback } from "react";
import type { TeacherProfile } from "@/types/teacherProfile";
import { makeDefaultProfile } from "@/types/teacherProfile";
import {
  loadTeacherProfile,
  saveTeacherProfile,
} from "@/services_new/teacherProfileService";

export type ProfileSaveStatus = "idle" | "saving" | "saved" | "error";

export function useTeacherProfile(userId: string | null) {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<ProfileSaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Load ─────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const stored = await loadTeacherProfile(userId);
      setProfile(stored ?? makeDefaultProfile(userId));
    } catch (err: any) {
      setErrorMessage(err?.message ?? "Could not load profile.");
      setProfile(makeDefaultProfile(userId));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Save ─────────────────────────────────────────────────────────────────

  const save = useCallback(
    async (updated: TeacherProfile) => {
      if (!userId) return;
      setSaveStatus("saving");
      setErrorMessage(null);
      try {
        await saveTeacherProfile({ ...updated, updatedAt: new Date().toISOString() });
        setProfile(updated);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err: any) {
        setSaveStatus("error");
        setErrorMessage(err?.message ?? "Could not save profile.");
      }
    },
    [userId]
  );

  // ── Patch helper — update one top-level key ───────────────────────────────

  const patch = useCallback(
    <K extends keyof TeacherProfile>(key: K, value: TeacherProfile[K]) => {
      setProfile((prev) => {
        if (!prev) return prev;
        return { ...prev, [key]: value };
      });
    },
    []
  );

  return { profile, loading, saveStatus, errorMessage, save, patch, reload: load };
}
