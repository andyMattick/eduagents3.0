import { DerivedTemplate } from "@/pipeline/contracts/deriveTemplate";
import { writeJSON } from "./storage";

export async function saveTemplate(teacherId: string, template: DerivedTemplate): Promise<void> {
  const path = `teacher/${teacherId}/${template.id}`;
  await writeJSON(teacherId, path, template);
}
