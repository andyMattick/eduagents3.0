import { assertAdmin, getSimulationLimitForTier, normalizeTier, runtime, supabaseRest } from "./shared.js";

export { runtime };

function parseBody(body) {
  if (typeof body === "string") return JSON.parse(body || "{}");
  return body ?? {};
}

function parseLimit(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function defaultUploadLimits() {
  return {
    free: parseLimit(process.env.MAX_PAGES_PER_DAY_FREE, 20),
    teacher: parseLimit(process.env.MAX_PAGES_PER_DAY_TEACHER, 100),
    school: parseLimit(process.env.MAX_PAGES_PER_DAY_SCHOOL, 500),
  };
}

function defaultSimulationLimits() {
  return {
    free: getSimulationLimitForTier("free"),
    teacher: getSimulationLimitForTier("teacher"),
    school: getSimulationLimitForTier("school"),
  };
}

async function loadSetting(key, fallbackValue) {
  try {
    const rows = await supabaseRest("app_settings", {
      method: "GET",
      select: "key,value,updated_at",
      filters: { key: `eq.${key}` },
    });
    if (Array.isArray(rows) && rows.length > 0 && rows[0]?.value) {
      return rows[0].value;
    }
  } catch {
    // ignore and fallback
  }
  return fallbackValue;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      assertAdmin(req);
      const [upload, simulation] = await Promise.all([
        loadSetting("limits.upload", defaultUploadLimits()),
        loadSetting("limits.simulation", defaultSimulationLimits()),
      ]);
      return res.status(200).json({ upload, simulation });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load limits" });
    }
  }

  if (req.method === "POST") {
    try {
      assertAdmin(req);
    } catch (error) {
      return res.status(403).json({ error: error instanceof Error ? error.message : "Forbidden" });
    }

    const payload = parseBody(req.body);
    const upload = payload?.upload ?? null;
    const simulation = payload?.simulation ?? null;

    try {
      if (upload && typeof upload === "object") {
        const normalizedUpload = {
          free: parseLimit(upload.free, defaultUploadLimits().free),
          teacher: parseLimit(upload.teacher, defaultUploadLimits().teacher),
          school: parseLimit(upload.school, defaultUploadLimits().school),
        };
        await supabaseRest("app_settings", {
          method: "POST",
          prefer: "resolution=merge-duplicates,return=minimal",
          body: { key: "limits.upload", value: normalizedUpload },
        });
      }

      if (simulation && typeof simulation === "object") {
        const normalizedSimulation = {
          free: parseLimit(simulation.free, defaultSimulationLimits().free),
          teacher: parseLimit(simulation.teacher, defaultSimulationLimits().teacher),
          school: parseLimit(simulation.school, defaultSimulationLimits().school),
        };
        await supabaseRest("app_settings", {
          method: "POST",
          prefer: "resolution=merge-duplicates,return=minimal",
          body: { key: "limits.simulation", value: normalizedSimulation },
        });
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update limits" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
