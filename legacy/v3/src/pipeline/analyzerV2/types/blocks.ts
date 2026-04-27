export interface NormalizedBlock {
  type: "listItem" | "paragraph" | string;
  text: string;
  indent: number;
  numbering?: string;
  index?: number;
}
