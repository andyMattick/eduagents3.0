export async function getTemplates(teacherId: string) {
  const res = await fetch(`/api/templates?teacherId=${teacherId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Failed to load templates: ${res.statusText}`);
  }
//console.log("[getTemplates] Response data:", await res.clone().json()); // Log the response data for debugging
  return res.json();
}
