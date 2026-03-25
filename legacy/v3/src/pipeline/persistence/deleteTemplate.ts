import { deleteJSON } from "./storage";

export async function deleteTemplate(teacherId: string, templateId: string): Promise<void> {
  const path = `teacher/${teacherId}/${templateId}`;
  await deleteJSON(teacherId, path);
}
