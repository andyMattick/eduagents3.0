import React from 'react';
import { TagChange } from '../../types/pipeline';

interface Props {
  original: string;
  rewritten: string;
  summary: string;
  tagChanges: TagChange[];
}

export function VersionComparison({ original, rewritten, summary, tagChanges }: Props) {
  return (
    <div>
      <h3>Summary of Changes</h3>
      <p>{summary}</p>

      <h4>Tag Improvements</h4>
      <ul>
        {tagChanges.map((tag) => (
          <li key={tag.tag}>
            {tag.tag}: {tag.delta > 0 ? '+' : ''}
            {tag.delta}
          </li>
        ))}
      </ul>

      <h4>Original</h4>
      <pre>{original}</pre>

      <h4>Rewritten</h4>
      <pre>{rewritten}</pre>
    </div>
  );
}
  );
};
