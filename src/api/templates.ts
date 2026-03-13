export async function getTemplates(teacherId: string) {
  const res = await fetch(`/api/templates?teacherId=${teacherId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Failed to load templates: ${res.statusText}`);
  }

  return res.json();
}
