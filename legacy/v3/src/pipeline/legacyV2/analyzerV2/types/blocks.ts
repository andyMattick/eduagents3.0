export type NormalizedBlock =
  | { type: "heading"; text: string; level: number; indent: number }
  | { type: "paragraph"; text: string; indent: number; numbering?: string }
  | { type: "listItem"; text: string; index: number; indent: number; numbering?: string }
  | { type: "table"; cells: string[][]; indent: number }
  | { type: "image"; altText?: string; indent: number }
  | { type: "diagram"; altText?: string; indent: number }
  | { type: "graph"; altText?: string; indent: number };
