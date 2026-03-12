export interface PatternSlot {
  id: string;
  role: "input" | "output";
  dataType: string;
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
