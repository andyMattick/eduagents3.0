import type { DocumentSemanticInsights } from "../../prism-v4/schema/semantic";

export function ConceptGraph(props: { graph: DocumentSemanticInsights["conceptGraph"] | undefined }) {
  const { graph } = props;
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];

  return (
    <section className="v4-panel">
      <div className="v4-section-heading">
        <div>
          <p className="v4-kicker">Concept graph</p>
          <h2>Co-occurrence map</h2>
        </div>
        <span className="v4-pill">{nodes.length} nodes / {edges.length} edges</span>
      </div>

      <div className="v4-columns">
        <div>
          <h3>Nodes</h3>
          <ul className="v4-ranked-list">
            {nodes.map((node) => (
              <li key={node.id}>
                <span>{node.label}</span>
                <strong>{(node.weight ?? 0).toFixed(2)}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Edges</h3>
          <ul className="v4-ranked-list">
            {edges.length > 0 ? edges.map((edge) => (
              <li key={`${edge.from}-${edge.to}`}>
                <span>{edge.from} → {edge.to}</span>
                <strong>{(edge.weight ?? 0).toFixed(2)}</strong>
              </li>
            )) : <li><span>No concept links detected</span><strong>-</strong></li>}
          </ul>
        </div>
      </div>
    </section>
  );
}