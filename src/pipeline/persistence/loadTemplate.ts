import { DerivedTemplate } from "@/pipeline/contracts/deriveTemplate";
import { readAllJSON } from "./storage";

export async function loadTemplatesForTeacher(teacherId: string): Promise<DerivedTemplate[]> {
  const prefix = `teacher/${teacherId}/`;
  return readAllJSON<DerivedTemplate>(teacherId, prefix);
}
