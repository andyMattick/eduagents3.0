import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/supabase/client";
import { useAuth } from "@/components_new/Auth/useAuth";
import "./AdminDashboard.css";

type TokenUsageRow = {
  actor_key: string;
  user_id: string | null;
  date: string;
  tokens_used: number;
  updated_at: string;
};

type PipelineErrorRow = {
  id: number;
  actor_key: string;
  user_id: string | null;
  endpoint: string;
  error_message: string;
  created_at: string;
};

type TokenEventDetail = {
  id: number;
  stage: string;
  endpoint: string | null;
  model: string | null;
  tokens: number;
  billed: boolean;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type RewriteEventRow = {
  id: number;
  created_at: string;
  actor_key: string;
  user_id: string | null;
  section_id: string | null;
  suggestions_selected: Array<Record<string, unknown>> | null;
  suggestions_actionable_selected: Array<Record<string, unknown>> | null;
  suggestions_non_actionable_selected: Array<Record<string, unknown>> | null;
  model: string | null;
};

type RewriteEventDetail = {
  rewrite_event_id: number;
  rewrite_created_at: string;
  actor_key: string;
  user_id: string | null;
  section_id: string | null;
  applied_suggestions: string[] | null;
  profile: string | null;
  original: string | null;
  rewritten: string | null;
  prompt: string | null;
  validator_report: Record<string, unknown> | null;
  model: string | null;
  total_tokens: number;
  billed_tokens: number;
  non_billed_tokens: number;
  token_events: TokenEventDetail[] | null;
  suggestions_all: Array<Record<string, unknown>> | null;
  suggestions_selected: Array<Record<string, unknown>> | null;
  suggestions_actionable_selected: Array<Record<string, unknown>> | null;
  suggestions_non_actionable_selected: Array<Record<string, unknown>> | null;
};

type BadRewriteReportRow = {
  id: number;
  actor_key: string;
  user_id: string | null;
  section_id: string | null;
  original: string | null;
  rewritten: string | null;
  reason: string | null;
  teacher_input: string | null;
  expected_output: string | null;
  what_was_wrong: string | null;
  additional_context: string | null;
  created_at: string;
};

type TeacherRow = {
  id: string;
  email: string | null;
};

function clip(value: string | null | undefined, max = 220): string {
  if (!value) return "-";
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
}

function fmtDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const AdminDashboard = () => {
  const { logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tokenRows, setTokenRows] = useState<TokenUsageRow[]>([]);
  const [pipelineErrors, setPipelineErrors] = useState<PipelineErrorRow[]>([]);
  const [rewriteEvents, setRewriteEvents] = useState<RewriteEventRow[]>([]);
  const [badReports, setBadReports] = useState<BadRewriteReportRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);

  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [selectedRewriteEvent, setSelectedRewriteEvent] = useState<RewriteEventDetail | null>(null);
  const [inspectorLoading, setInspectorLoading] = useState(false);

function isoDaysAgo(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() - days);
  return now.toISOString();
}

  const [tokenFilters, setTokenFilters] = useState({
    email: "",
    date: "",
    user_id: "",
  });
  const [pipelineFilters, setPipelineFilters] = useState({
    email: "",
    date: "",
    user_id: "",
    endpoint: "",
  });
  const [rewriteFilters, setRewriteFilters] = useState({
    email: "",
    date: "",
    user_id: "",
    section_id: "",
  });
  const [badReportFilters, setBadReportFilters] = useState({
    email: "",
    date: "",
    user_id: "",
  });

  const emailByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const teacher of teachers) {
      if (teacher.email) map.set(teacher.id, teacher.email);
    }
    return map;
  }, [teachers]);

  const tokenRowsFiltered = useMemo(() => {
    return tokenRows.filter((row) => {
      const email = row.user_id ? (emailByUserId.get(row.user_id) ?? "") : "";
      const emailOk = email.toLowerCase().includes(tokenFilters.email.trim().toLowerCase());
      const userOk = (row.user_id ?? "").toLowerCase().includes(tokenFilters.user_id.trim().toLowerCase());
      const dateOk = !tokenFilters.date || row.date === tokenFilters.date;
      return emailOk && userOk && dateOk;
    });
  }, [tokenRows, emailByUserId, tokenFilters]);

  const pipelineErrorsFiltered = useMemo(() => {
    return pipelineErrors.filter((row) => {
      const email = row.user_id ? (emailByUserId.get(row.user_id) ?? "") : "";
      const emailOk = email.toLowerCase().includes(pipelineFilters.email.trim().toLowerCase());
      const userOk = (row.user_id ?? "").toLowerCase().includes(pipelineFilters.user_id.trim().toLowerCase());
      const endpointOk = row.endpoint.toLowerCase().includes(pipelineFilters.endpoint.trim().toLowerCase());
      const dateOk = !pipelineFilters.date || row.created_at.slice(0, 10) === pipelineFilters.date;
      return emailOk && userOk && endpointOk && dateOk;
    });
  }, [pipelineErrors, emailByUserId, pipelineFilters]);

  const rewriteEventsFiltered = useMemo(() => {
    return rewriteEvents.filter((row) => {
      const email = row.user_id ? (emailByUserId.get(row.user_id) ?? "") : "";
      const emailOk = email.toLowerCase().includes(rewriteFilters.email.trim().toLowerCase());
      const userOk = (row.user_id ?? "").toLowerCase().includes(rewriteFilters.user_id.trim().toLowerCase());
      const sectionOk = (row.section_id ?? "").toLowerCase().includes(rewriteFilters.section_id.trim().toLowerCase());
      const dateOk = !rewriteFilters.date || row.created_at.slice(0, 10) === rewriteFilters.date;
      return emailOk && userOk && sectionOk && dateOk;
    });
  }, [rewriteEvents, emailByUserId, rewriteFilters]);

  const badReportsFiltered = useMemo(() => {
    return badReports.filter((row) => {
      const email = row.user_id ? (emailByUserId.get(row.user_id) ?? "") : "";
      const emailOk = email.toLowerCase().includes(badReportFilters.email.trim().toLowerCase());
      const userOk = (row.user_id ?? "").toLowerCase().includes(badReportFilters.user_id.trim().toLowerCase());
      const dateOk = !badReportFilters.date || row.created_at.slice(0, 10) === badReportFilters.date;
      return emailOk && userOk && dateOk;
    });
  }, [badReports, emailByUserId, badReportFilters]);

  async function loadDashboardData() {
    setLoading(true);
    setError(null);

    const sevenDaysAgo = isoDaysAgo(7);

    const [tokenRes, errorRes, rewriteRes, badRes, teacherRes] = await Promise.all([
      supabase
        .from("admin_token_usage_today")
        .select("actor_key, user_id, date, tokens_used, updated_at")
        .order("tokens_used", { ascending: false })
        .limit(200),
      supabase
        .from("pipeline_errors")
        .select("id, actor_key, user_id, endpoint, error_message, created_at")
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("rewrite_events")
        .select("id, user_id, actor_key, model, section_id, created_at, suggestions_selected, suggestions_actionable_selected, suggestions_non_actionable_selected")
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("admin_bad_rewrite_reports_recent")
        .select("id, actor_key, user_id, section_id, original, rewritten, reason, teacher_input, expected_output, what_was_wrong, additional_context, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("teachers")
        .select("id, email")
        .limit(500),
    ]);

    if (tokenRes.error) setError(tokenRes.error.message);
    if (errorRes.error) setError((prev) => prev ?? errorRes.error.message);
    if (rewriteRes.error) setError((prev) => prev ?? rewriteRes.error.message);
    if (badRes.error) setError((prev) => prev ?? badRes.error.message);
    if (teacherRes.error) setError((prev) => prev ?? teacherRes.error.message);

    setTokenRows((tokenRes.data ?? []) as TokenUsageRow[]);
    setPipelineErrors((errorRes.data ?? []) as PipelineErrorRow[]);
    setRewriteEvents((rewriteRes.data ?? []) as RewriteEventRow[]);
    setBadReports((badRes.data ?? []) as BadRewriteReportRow[]);
    setTeachers((teacherRes.data ?? []) as TeacherRow[]);

    setLoading(false);
  }

  async function handleInspectRewriteEvent(row: RewriteEventRow) {
    setInspectorLoading(true);
    setSelectedRewriteEvent(null);

    const [rewriteRes, tokenRes] = await Promise.all([
      supabase
        .from("rewrite_events")
        .select("id, actor_key, user_id, section_id, applied_suggestions, profile, original, rewritten, prompt, validator_report, model, created_at, suggestions_all, suggestions_selected, suggestions_actionable_selected, suggestions_non_actionable_selected")
        .eq("id", row.id)
        .maybeSingle(),
      supabase
        .from("token_usage_events")
        .select("id, stage, endpoint, model, tokens, billed, created_at, metadata")
        .eq("rewrite_event_id", row.id)
        .order("created_at", { ascending: true }),
    ]);

    if (rewriteRes.error) {
      setError(rewriteRes.error.message);
      setInspectorLoading(false);
      return;
    }
    if (tokenRes.error) {
      setError(tokenRes.error.message);
      setInspectorLoading(false);
      return;
    }
    if (!rewriteRes.data) {
      setError("Rewrite event not found.");
      setInspectorLoading(false);
      return;
    }

    const tokenEvents = (tokenRes.data ?? []) as TokenEventDetail[];
    const totalTokens = tokenEvents.reduce((sum, event) => sum + (event.tokens ?? 0), 0);
    const billedTokens = tokenEvents
      .filter((event) => event.billed)
      .reduce((sum, event) => sum + (event.tokens ?? 0), 0);

    setSelectedRewriteEvent({
      rewrite_event_id: rewriteRes.data.id,
      rewrite_created_at: rewriteRes.data.created_at,
      actor_key: rewriteRes.data.actor_key,
      user_id: rewriteRes.data.user_id,
      section_id: rewriteRes.data.section_id,
      applied_suggestions: rewriteRes.data.applied_suggestions,
      profile: rewriteRes.data.profile,
      original: rewriteRes.data.original,
      rewritten: rewriteRes.data.rewritten,
      prompt: rewriteRes.data.prompt,
      validator_report: rewriteRes.data.validator_report as Record<string, unknown> | null,
      model: rewriteRes.data.model,
      total_tokens: totalTokens,
      billed_tokens: billedTokens,
      non_billed_tokens: Math.max(0, totalTokens - billedTokens),
      token_events: tokenEvents,
      suggestions_all: rewriteRes.data.suggestions_all as Array<Record<string, unknown>> | null,
      suggestions_selected: rewriteRes.data.suggestions_selected as Array<Record<string, unknown>> | null,
      suggestions_actionable_selected: rewriteRes.data.suggestions_actionable_selected as Array<Record<string, unknown>> | null,
      suggestions_non_actionable_selected: rewriteRes.data.suggestions_non_actionable_selected as Array<Record<string, unknown>> | null,
    });
    setInspectorLoading(false);
  }

  async function handleResetTokens(userId: string) {
    setResettingUserId(userId);
    const { error: rpcError } = await supabase.rpc("admin_reset_tokens", {
      target_user: userId,
    });

    if (rpcError) {
      setError(rpcError.message);
      setResettingUserId(null);
      return;
    }

    await loadDashboardData();
    setResettingUserId(null);
  }

  useEffect(() => {
    void loadDashboardData();
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Observability</h1>
        <button className="admin-button" onClick={() => void logout()} type="button">
          Sign out
        </button>
      </div>

      <p className="admin-subtitle">
        Token usage, pipeline errors, rewrite activity, and bad rewrite reports.
      </p>

      {loading && <p className="admin-muted">Loading...</p>}
      {error && <p className="admin-error">Error: {error}</p>}

      <section className="admin-section">
        <h2>Token Usage Today</h2>
        <p className="admin-muted">Daily limit: 25,000 tokens.</p>
        <div className="admin-filters">
          <input
            type="text"
            className="admin-filter-input"
            placeholder="Filter by email..."
            value={tokenFilters.email}
            onChange={(event) => setTokenFilters((prev) => ({ ...prev, email: event.target.value }))}
          />
          <input
            type="date"
            className="admin-filter-input"
            value={tokenFilters.date}
            onChange={(event) => setTokenFilters((prev) => ({ ...prev, date: event.target.value }))}
          />
          <input
            type="text"
            className="admin-filter-input"
            placeholder="Filter by user ID..."
            value={tokenFilters.user_id}
            onChange={(event) => setTokenFilters((prev) => ({ ...prev, user_id: event.target.value }))}
          />
        </div>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>User ID</th>
                <th>Date</th>
                <th>Used</th>
                <th>Remaining</th>
                <th className="action-cell">Action</th>
              </tr>
            </thead>
            <tbody>
              {tokenRowsFiltered.map((row) => {
                const remaining = Math.max(0, 25000 - (row.tokens_used ?? 0));
                return (
                  <tr key={`${row.actor_key}:${row.date}`}>
                    <td>{row.user_id ? (emailByUserId.get(row.user_id) ?? "-") : "-"}</td>
                    <td>{row.user_id ?? "-"}</td>
                    <td>{row.date}</td>
                    <td>{row.tokens_used.toLocaleString()}</td>
                    <td>{remaining.toLocaleString()}</td>
                    <td className="action-cell">
                      {row.user_id ? (
                        <button
                          type="button"
                          className="admin-button admin-button-danger"
                          onClick={() => void handleResetTokens(row.user_id!)}
                          disabled={resettingUserId === row.user_id}
                        >
                          {resettingUserId === row.user_id ? "Resetting..." : "Reset Tokens"}
                        </button>
                      ) : (
                        <span className="admin-muted">N/A</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && tokenRowsFiltered.length === 0 && (
                <tr>
                  <td colSpan={6} className="admin-muted">No token rows yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h2>Pipeline Errors</h2>
        <div className="admin-filters">
          <input
            type="text"
            className="admin-filter-input"
            placeholder="Filter by email..."
            value={pipelineFilters.email}
            onChange={(event) => setPipelineFilters((prev) => ({ ...prev, email: event.target.value }))}
          />
          <input
            type="date"
            className="admin-filter-input"
            value={pipelineFilters.date}
            onChange={(event) => setPipelineFilters((prev) => ({ ...prev, date: event.target.value }))}
          />
          <input
            type="text"
            className="admin-filter-input"
            placeholder="Filter by user ID..."
            value={pipelineFilters.user_id}
            onChange={(event) => setPipelineFilters((prev) => ({ ...prev, user_id: event.target.value }))}
          />
          <input
            type="text"
            className="admin-filter-input"
            placeholder="Filter by endpoint..."
            value={pipelineFilters.endpoint}
            onChange={(event) => setPipelineFilters((prev) => ({ ...prev, endpoint: event.target.value }))}
          />
        </div>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Email</th>
                <th>User ID</th>
                <th>Endpoint</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {pipelineErrorsFiltered.map((row) => (
                <tr key={row.id}>
                  <td>{fmtDate(row.created_at)}</td>
                  <td>{row.user_id ? (emailByUserId.get(row.user_id) ?? "-") : "-"}</td>
                  <td>{row.user_id ?? "-"}</td>
                  <td>{row.endpoint}</td>
                  <td>{clip(row.error_message, 260)}</td>
                </tr>
              ))}
              {!loading && pipelineErrorsFiltered.length === 0 && (
                <tr>
                  <td colSpan={5} className="admin-muted">No pipeline errors yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h2>Rewrite Events</h2>
        <div className="admin-filters">
          <input
            type="text"
            className="admin-filter-input"
            placeholder="Filter by email..."
            value={rewriteFilters.email}
            onChange={(event) => setRewriteFilters((prev) => ({ ...prev, email: event.target.value }))}
          />
          <input
            type="date"
            className="admin-filter-input"
            value={rewriteFilters.date}
            onChange={(event) => setRewriteFilters((prev) => ({ ...prev, date: event.target.value }))}
          />
          <input
            type="text"
            className="admin-filter-input"
            placeholder="Filter by user ID..."
            value={rewriteFilters.user_id}
            onChange={(event) => setRewriteFilters((prev) => ({ ...prev, user_id: event.target.value }))}
          />
          <input
            type="text"
            className="admin-filter-input"
            placeholder="Filter by section..."
            value={rewriteFilters.section_id}
            onChange={(event) => setRewriteFilters((prev) => ({ ...prev, section_id: event.target.value }))}
          />
        </div>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Email</th>
                <th>User ID</th>
                <th>Section</th>
                <th>Selected</th>
                <th>Actionable</th>
                <th>Non-Actionable</th>
                <th>Model</th>
                <th className="action-cell">Inspect</th>
              </tr>
            </thead>
            <tbody>
              {rewriteEventsFiltered.map((row) => (
                <tr key={row.id}>
                  <td>{fmtDate(row.created_at)}</td>
                  <td>{row.user_id ? (emailByUserId.get(row.user_id) ?? "-") : "-"}</td>
                  <td>{row.user_id ?? "-"}</td>
                  <td>{row.section_id ?? "-"}</td>
                  <td>{row.suggestions_selected?.length ?? 0}</td>
                  <td>{row.suggestions_actionable_selected?.length ?? 0}</td>
                  <td>{row.suggestions_non_actionable_selected?.length ?? 0}</td>
                  <td>{row.model ?? "-"}</td>
                  <td className="action-cell">
                    <button type="button" className="admin-button" onClick={() => void handleInspectRewriteEvent(row)}>
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && rewriteEventsFiltered.length === 0 && (
                <tr>
                  <td colSpan={9} className="admin-muted">No rewrite events yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h2>Bad Rewrite Reports</h2>
        <div className="admin-filters">
          <input
            type="text"
            className="admin-filter-input"
            placeholder="Filter by email..."
            value={badReportFilters.email}
            onChange={(event) => setBadReportFilters((prev) => ({ ...prev, email: event.target.value }))}
          />
          <input
            type="date"
            className="admin-filter-input"
            value={badReportFilters.date}
            onChange={(event) => setBadReportFilters((prev) => ({ ...prev, date: event.target.value }))}
          />
          <input
            type="text"
            className="admin-filter-input"
            placeholder="Filter by user ID..."
            value={badReportFilters.user_id}
            onChange={(event) => setBadReportFilters((prev) => ({ ...prev, user_id: event.target.value }))}
          />
        </div>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Email</th>
                <th>User ID</th>
                <th>Section</th>
                <th>Teacher Input</th>
                <th>Expected</th>
                <th>What Was Wrong</th>
                <th>Additional Context</th>
              </tr>
            </thead>
            <tbody>
              {badReportsFiltered.map((row) => (
                <tr key={row.id}>
                  <td>{fmtDate(row.created_at)}</td>
                  <td>{row.user_id ? (emailByUserId.get(row.user_id) ?? "-") : "-"}</td>
                  <td>{row.user_id ?? "-"}</td>
                  <td>{row.section_id ?? "-"}</td>
                  <td>{clip(row.teacher_input, 260)}</td>
                  <td>{clip(row.expected_output, 260)}</td>
                  <td>{clip(row.what_was_wrong ?? row.reason, 260)}</td>
                  <td>{clip(row.additional_context, 260)}</td>
                </tr>
              ))}
              {!loading && badReportsFiltered.length === 0 && (
                <tr>
                  <td colSpan={8} className="admin-muted">No bad rewrite reports yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {inspectorLoading && (
        <div className="admin-modal-overlay">
          <div className="admin-modal rewrite-inspector">
            <p className="admin-muted">Loading rewrite inspector...</p>
          </div>
        </div>
      )}

      {selectedRewriteEvent && (
        <div className="admin-modal-overlay" onClick={() => setSelectedRewriteEvent(null)}>
          <div className="admin-modal rewrite-inspector" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Rewrite Event Inspector</h2>
              <button type="button" className="admin-button" onClick={() => setSelectedRewriteEvent(null)}>
                Close
              </button>
            </div>

            <p className="admin-muted">
              Event #{selectedRewriteEvent.rewrite_event_id} | {fmtDate(selectedRewriteEvent.rewrite_created_at)}
              {selectedRewriteEvent.model && ` | Model: ${selectedRewriteEvent.model}`}
            </p>

            <div className="admin-inspector-grid">
              <div>
                <h3>Teacher Input</h3>
                <pre>{selectedRewriteEvent.original ?? "-"}</pre>
              </div>
              <div>
                <h3>Model Output</h3>
                <pre>{selectedRewriteEvent.rewritten ?? "-"}</pre>
              </div>
            </div>

            {/* Suggestion pipeline breakdown */}
            <h3>Suggestion Pipeline</h3>
            <div className="admin-suggestion-grid">
              <div>
                <p className="admin-muted admin-badge-label">
                  All Suggestions ({selectedRewriteEvent.suggestions_all?.length ?? 0})
                </p>
                <pre>{JSON.stringify(selectedRewriteEvent.suggestions_all ?? [], null, 2)}</pre>
              </div>
              <div>
                <p className="admin-muted admin-badge-label">
                  Selected ({selectedRewriteEvent.suggestions_selected?.length ?? 0})
                </p>
                <pre>{JSON.stringify(selectedRewriteEvent.suggestions_selected ?? [], null, 2)}</pre>
              </div>
              <div>
                <p className="admin-muted admin-badge-label admin-badge-actionable">
                  ✓ Actionable + Selected ({selectedRewriteEvent.suggestions_actionable_selected?.length ?? 0})
                </p>
                <pre>{JSON.stringify(selectedRewriteEvent.suggestions_actionable_selected ?? [], null, 2)}</pre>
              </div>
              <div>
                <p className="admin-muted admin-badge-label admin-badge-filtered">
                  ✗ Non-actionable but Selected ({selectedRewriteEvent.suggestions_non_actionable_selected?.length ?? 0})
                </p>
                <pre>{JSON.stringify(selectedRewriteEvent.suggestions_non_actionable_selected ?? [], null, 2)}</pre>
              </div>
            </div>

            <h3>Applied Suggestions</h3>
            <pre>{JSON.stringify(selectedRewriteEvent.applied_suggestions ?? [], null, 2)}</pre>

            <h3>Prompt Snapshot</h3>
            <pre>{selectedRewriteEvent.prompt ?? "-"}</pre>

            <h3>Validator Report</h3>
            <pre>{JSON.stringify(selectedRewriteEvent.validator_report ?? {}, null, 2)}</pre>

            <h3>Token Totals</h3>
            <pre>{JSON.stringify({
              total_tokens: selectedRewriteEvent.total_tokens,
              billed_tokens: selectedRewriteEvent.billed_tokens,
              non_billed_tokens: selectedRewriteEvent.non_billed_tokens,
              model: selectedRewriteEvent.model,
            }, null, 2)}</pre>

            <h3>Token Events</h3>
            <pre>{JSON.stringify(selectedRewriteEvent.token_events ?? [], null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
