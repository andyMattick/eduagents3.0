import { useEffect, useState } from "react";
import { getTemplates } from "../api/templates";
import TemplateCard from "../components/templates/TemplateCard";

export default function TemplatesPage() {
  const [systemTemplates, setSystemTemplates] = useState([]);
  const [teacherTemplates, setTeacherTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const teacherId = "demo-teacher"; // replace with real auth context
        const data = await getTemplates(teacherId);
        setSystemTemplates(data.system || []);
        setTeacherTemplates(data.teacher || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div>Loading templates…</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Templates</h1>
      <p>System templates and your saved templates.</p>

      <a href="/templates/new" className="btn btn-primary">
        + New Template
      </a>

      <h2 style={{ marginTop: "2rem" }}>System Templates</h2>
      <div className="template-grid">
        {systemTemplates.map((t: any) => (
          <TemplateCard key={t.id} template={t} readOnly />
        ))}
      </div>

      <h2 style={{ marginTop: "2rem" }}>Your Templates</h2>
      <div className="template-grid">
        {teacherTemplates.map((t: any) => (
          <TemplateCard key={t.id} template={t} />
        ))}
      </div>
    </div>
  );
}
