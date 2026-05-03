import { DAILY_PAGE_LIMIT, DAILY_SIMULATION_LIMIT } from "../../../config/limits.js";
import { getSingleHeaderValue, isUuid, supabaseRest, todayIsoDate } from "../admin/shared.js";

export { DAILY_PAGE_LIMIT, DAILY_SIMULATION_LIMIT };

export function resolveUsageUserId(req) {
  const headerUser = getSingleHeaderValue(req.headers["x-user-id"]) || getSingleHeaderValue(req.headers["x-auth-user-id"]);
  return isUuid(headerUser) ? headerUser : null;
}

export async function getDailyUploadUsage(userId, date = todayIsoDate()) {
  if (!userId) {
    return {
      date,
      pagesUploaded: 0,
      remainingPages: DAILY_PAGE_LIMIT,
    };
  }

  try {
    const rows = await supabaseRest("user_daily_uploads", {
      method: "GET",
      select: "pages_uploaded",
      filters: {
        user_id: `eq.${userId}`,
        date: `eq.${date}`,
      },
    });
    const pagesUploaded = Number(rows?.[0]?.pages_uploaded ?? 0);
    return {
      date,
      pagesUploaded: Number.isFinite(pagesUploaded) ? Math.max(0, Math.round(pagesUploaded)) : 0,
      remainingPages: Math.max(0, DAILY_PAGE_LIMIT - (Number.isFinite(pagesUploaded) ? Math.max(0, Math.round(pagesUploaded)) : 0)),
    };
  } catch {
    return {
      date,
      pagesUploaded: 0,
      remainingPages: DAILY_PAGE_LIMIT,
    };
  }
}

export async function incrementDailyUploadUsage({ userId, pagesToAdd, date = todayIsoDate() }) {
  if (!userId) {
    return null;
  }

  const current = await getDailyUploadUsage(userId, date);
  const nextValue = current.pagesUploaded + Math.max(0, Math.round(Number(pagesToAdd) || 0));
  await supabaseRest("user_daily_uploads", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      user_id: userId,
      date,
      pages_uploaded: nextValue,
    },
  });
  return nextValue;
}

export async function getDailySimulationUsage(userId, date = todayIsoDate()) {
  if (!userId) {
    return {
      date,
      simulationsRun: 0,
      remainingSimulations: DAILY_SIMULATION_LIMIT,
    };
  }

  try {
    const rows = await supabaseRest("user_daily_simulations", {
      method: "GET",
      select: "simulations_run",
      filters: {
        user_id: `eq.${userId}`,
        date: `eq.${date}`,
      },
    });
    const simulationsRun = Number(rows?.[0]?.simulations_run ?? 0);
    return {
      date,
      simulationsRun: Number.isFinite(simulationsRun) ? Math.max(0, Math.round(simulationsRun)) : 0,
      remainingSimulations: Math.max(0, DAILY_SIMULATION_LIMIT - (Number.isFinite(simulationsRun) ? Math.max(0, Math.round(simulationsRun)) : 0)),
    };
  } catch {
    return {
      date,
      simulationsRun: 0,
      remainingSimulations: DAILY_SIMULATION_LIMIT,
    };
  }
}

export async function incrementDailySimulationUsage({ userId, date = todayIsoDate() }) {
  if (!userId) {
    return null;
  }

  const current = await getDailySimulationUsage(userId, date);
  const nextValue = current.simulationsRun + 1;
  await supabaseRest("user_daily_simulations", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      user_id: userId,
      date,
      simulations_run: nextValue,
    },
  });
  return nextValue;
}

export async function resetDailyUsageForUser(userId, date = todayIsoDate()) {
  await Promise.all([
    supabaseRest("user_daily_uploads", {
      method: "DELETE",
      filters: {
        user_id: `eq.${userId}`,
        date: `eq.${date}`,
      },
      prefer: "return=minimal",
    }),
    supabaseRest("user_daily_simulations", {
      method: "DELETE",
      filters: {
        user_id: `eq.${userId}`,
        date: `eq.${date}`,
      },
      prefer: "return=minimal",
    }),
  ]);
}