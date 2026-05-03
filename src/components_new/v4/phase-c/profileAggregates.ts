import type { SyntheticStudent } from "../../../lib/phaseCApi";

type StudentMetrics = {
  studentId: string;
  totalTime: number;
  averageConfusion: number;
  averageTime: number;
  averageBloomGap: number;
  averagePCorrect: number;
  averageTraitDelta: number;
};

export type ProfileAggregate = {
  profile: string;
  count: number;
  averageConfusion: number;
  averageTime: number;
  totalTime: number;
  averageBloomGap: number;
  averagePCorrect: number;
  averageTraitDelta: number;
  overlayCounts: Array<{ label: string; count: number }>;
};

export function primaryProfile(student: SyntheticStudent): string {
  return student.profiles[0] ?? "Unassigned";
}

export function studentOverlays(student: SyntheticStudent): string[] {
  return student.positiveTraits ?? [];
}

export function computeProfileAggregates(
  metrics: StudentMetrics[],
  students: SyntheticStudent[],
): ProfileAggregate[] {
  const studentsById = new Map(students.map((student) => [student.id, student]));
  const groups = new Map<string, {
    count: number;
    totalTime: number;
    averageConfusion: number;
    averageTime: number;
    averageBloomGap: number;
    averagePCorrect: number;
    averageTraitDelta: number;
    overlayCounts: Map<string, number>;
  }>();

  for (const metric of metrics) {
    const student = studentsById.get(metric.studentId);
    const profile = student ? primaryProfile(student) : "Unassigned";
    const group = groups.get(profile) ?? {
      count: 0,
      totalTime: 0,
      averageConfusion: 0,
      averageTime: 0,
      averageBloomGap: 0,
      averagePCorrect: 0,
      averageTraitDelta: 0,
      overlayCounts: new Map<string, number>(),
    };

    group.count += 1;
    group.totalTime += metric.totalTime;
    group.averageConfusion += metric.averageConfusion;
    group.averageTime += metric.averageTime;
    group.averageBloomGap += metric.averageBloomGap;
    group.averagePCorrect += metric.averagePCorrect;
    group.averageTraitDelta += metric.averageTraitDelta;

    for (const overlay of student ? studentOverlays(student) : []) {
      group.overlayCounts.set(overlay, (group.overlayCounts.get(overlay) ?? 0) + 1);
    }

    groups.set(profile, group);
  }

  return [...groups.entries()]
    .map(([profile, group]) => ({
      profile,
      count: group.count,
      totalTime: group.totalTime / Math.max(group.count, 1),
      averageConfusion: group.averageConfusion / Math.max(group.count, 1),
      averageTime: group.averageTime / Math.max(group.count, 1),
      averageBloomGap: group.averageBloomGap / Math.max(group.count, 1),
      averagePCorrect: group.averagePCorrect / Math.max(group.count, 1),
      averageTraitDelta: group.averageTraitDelta / Math.max(group.count, 1),
      overlayCounts: [...group.overlayCounts.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)),
    }))
    .sort((left, right) => left.profile.localeCompare(right.profile));
}