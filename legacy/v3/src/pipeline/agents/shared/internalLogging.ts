/**
 * Internal logging system for pipeline agents.
 * 
 * Used for debugging and telemetry without polluting production console.
 * Logs are accumulated in-memory and can be exported/cleared.
 */

export interface LogEntry {
  timestamp: string;
  agent: "Writer" | "Gatekeeper" | "Builder" | "Scribe";
  level: "info" | "warn" | "error";
  message: string;
  data?: Record<string, any>;
}

class InternalLogger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 5000; // Prevent unbounded memory growth
  private enabled: boolean = typeof window !== "undefined" && (window as any).__INTERNAL_LOGGING_ENABLED === true;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  log(agent: LogEntry["agent"], level: LogEntry["level"], message: string, data?: Record<string, any>) {
    if (!this.enabled) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      agent,
      level,
      message,
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  info(agent: LogEntry["agent"], message: string, data?: Record<string, any>) {
    this.log(agent, "info", message, data);
  }

  warn(agent: LogEntry["agent"], message: string, data?: Record<string, any>) {
    this.log(agent, "warn", message, data);
  }

  error(agent: LogEntry["agent"], message: string, data?: Record<string, any>) {
    this.log(agent, "error", message, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByAgent(agent: LogEntry["agent"]): LogEntry[] {
    return this.logs.filter(l => l.agent === agent);
  }

  getLogsByLevel(level: LogEntry["level"]): LogEntry[] {
    return this.logs.filter(l => l.level === level);
  }

  clear() {
    this.logs = [];
  }

  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const internalLogger = new InternalLogger();
