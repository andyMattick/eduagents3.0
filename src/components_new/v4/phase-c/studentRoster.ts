import type { SyntheticStudent } from "../../../lib/phaseCApi";

function compareProfiles(left: SyntheticStudent, right: SyntheticStudent): number {
  const leftProfile = left.profiles[0] ?? "";
  const rightProfile = right.profiles[0] ?? "";
  if (leftProfile !== rightProfile) {
    return leftProfile.localeCompare(rightProfile);
  }

  return left.id.localeCompare(right.id);
}

export function sortStudentsByProfile(students: SyntheticStudent[]): SyntheticStudent[] {
  return [...students].sort(compareProfiles);
}

export function matchesSelectedProfile(student: SyntheticStudent, selectedProfile: string): boolean {
  return student.profiles.includes(selectedProfile) || student.positiveTraits.includes(selectedProfile);
}