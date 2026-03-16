export interface PatternSlot {
  id: string;
  role: "input" | "output" | string;
  dataType: "string" | "number" | "math" | "representation" | "diagram" | string;
}

export interface Relationship {
  type: string;
  from: string;
  to: string;
}

export interface Rule {
  type: string;
  target: string;
}
