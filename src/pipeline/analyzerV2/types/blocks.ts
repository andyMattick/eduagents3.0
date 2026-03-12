export type BlockType = "paragraph" | "listItem" | "table" | "diagram" | "graph" | "image";

export interface NormalizedBlock {
  type: BlockType;
  text: string;
  indent: number;
  numbering?: string | null;
  index?: number;
}
