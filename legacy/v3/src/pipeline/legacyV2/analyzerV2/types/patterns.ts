export interface GenericPattern {
  slots: PatternSlot[];
  relationships: Relationship[];
  rules: Rule[];
}

export interface PatternSlot {
  id: string;
  role: string;
  dataType: string;
  constraints?: any;
}

export interface Relationship {
  type: string;
  from: string;
  to: string;
}

export interface Rule {
  type: string;
  target: string;
  params?: any;
}
