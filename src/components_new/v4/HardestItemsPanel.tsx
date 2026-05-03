type HardestItem = {
  itemId: string;
  label: string;
  pCorrect: number;
};

type Props = {
  hardest: HardestItem[];
};

export function HardestItemsPanel({ hardest }: Props) {
  if (hardest.length === 0) {
    return null;
  }

  return (
    <div className="v4-shortcircuit-result-card">
      <h3 className="v4-shortcircuit-tree-title">Hardest Items</h3>
      <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}>
        {hardest.map((item) => (
          <li key={item.itemId} className="phasec-copy" style={{ marginBottom: "0.3rem" }}>
            {item.label}: {Math.round(item.pCorrect * 100)}% correct
          </li>
        ))}
      </ul>
    </div>
  );
}
