import type { Violation } from "./ViolationCatalog";

export interface GatekeeperReport {
  passed: boolean;
  violations: Violation[];

  // governance metadata
  blueprintVersion: number;
  writerVersion: number;
  timestamp: string;

  // derived metadata
  violationCount: number;
  severitySummary: {
    low: number;
    medium: number;
    high: number;
  };
}
