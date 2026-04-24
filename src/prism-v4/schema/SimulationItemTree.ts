import type { SimulationItem } from "./SimulationItem";

export interface SimulationItemTree {
  item: SimulationItem;
  subItems?: SimulationItem[];
  distractors?: { label: string; text: string }[];
}