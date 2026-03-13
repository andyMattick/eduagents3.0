import { DerivedTemplate } from "@/pipeline/contracts/deriveTemplate";
import { readAllJSON } from "./storage";

export async function loadTemplatesForTeacher(teacherId: string): Promise<DerivedTemplate[]> {
  const path = `teacherTemplates/${teacherId}/`;
  return readAllJSON<DerivedTemplate>(path);
}
