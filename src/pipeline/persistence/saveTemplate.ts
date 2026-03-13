import { DerivedTemplate } from "@/pipeline/contracts/deriveTemplate";
import { writeJSON } from "./storage";

export async function saveTemplate(teacherId: string, template: DerivedTemplate): Promise<void> {
  const path = `teacherTemplates/${teacherId}/${template.id}.json`;
  await writeJSON(path, template);
}
