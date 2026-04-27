import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

function migrationSql() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const migrationPath = path.resolve(currentDir, "../../supabase/phase_c_simulation_migration.sql");
  return readFileSync(migrationPath, "utf8").toLowerCase();
}

describe("phase-c db schema migration", () => {
  it("declares required tables, indexes, and policies", () => {
    const sql = migrationSql();

    expect(sql).toContain("create table if not exists public.classes");
    expect(sql).toContain("create table if not exists public.synthetic_students");
    expect(sql).toContain("create table if not exists public.simulation_runs");
    expect(sql).toContain("create table if not exists public.simulation_results");

    expect(sql).toContain("classes_teacher_id_idx");
    expect(sql).toContain("synthetic_students_class_id_idx");
    expect(sql).toContain("simulation_runs_class_id_idx");
    expect(sql).toContain("simulation_results_simulation_id_idx");

    expect(sql).toContain("alter table public.classes enable row level security");
    expect(sql).toContain("alter table public.synthetic_students enable row level security");
    expect(sql).toContain("alter table public.simulation_runs enable row level security");
    expect(sql).toContain("alter table public.simulation_results enable row level security");

    expect(sql).toContain("create policy \"service_role_all_classes\"");
    expect(sql).toContain("create policy \"service_role_all_synthetic_students\"");
    expect(sql).toContain("create policy \"service_role_all_simulation_runs\"");
    expect(sql).toContain("create policy \"service_role_all_simulation_results\"");
  });

  it("does not reference legacy pipeline tables", () => {
    const sql = migrationSql();
    expect(sql).not.toContain("student_performance");
    expect(sql).not.toContain("preparedness");
    expect(sql).not.toContain("compare");
  });
});
