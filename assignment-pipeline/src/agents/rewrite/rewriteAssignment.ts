import { Tag } from '../../types/pipeline';

export interface RewriteResult {
  rewrittenText: string;
  summaryOfChanges: string;
  appliedTags: Tag[];
}

/**
 * Rewrites an assignment based on detected tags and improvement suggestions
 * Returns the rewritten text along with a summary of changes
 */
export async function rewriteAssignment(
  originalText: string,
  tags: Tag[],
): Promise<RewriteResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1200));

  let rewrittenText = originalText;
  const changes: string[] = [];

  // Apply improvements based on detected tags
  if (tags.some(t => t.name === 'vague-modifiers')) {
    // Replace vague modifiers with specific ones
    rewrittenText = rewrittenText
      .replace(/\bvery\b/gi, 'extremely')
      .replace(/\breally\b/gi, 'notably')
      .replace(/\bquite\b/gi, 'considerably')
      .replace(/\bsomewhat\b/gi, 'partially');
    changes.push(
      'Replaced vague modifiers (very, really, quite) with more specific language',
    );
  }

  if (tags.some(t => t.name === 'clarity')) {
    // Add transition words if not present
    if (!rewrittenText.toLowerCase().includes('however')) {
      const sentences = rewrittenText.split(/(?<=[.!?])\s+/);
      if (sentences.length > 1) {
        sentences[Math.floor(sentences.length / 2)]
          = 'However, ' + sentences[Math.floor(sentences.length / 2)];
        rewrittenText = sentences.join(' ');
        changes.push('Added transition words to improve clarity');
      }
    }
  }

  if (tags.some(t => t.name === 'transitions')) {
    // Enhance existing transitions
    rewrittenText = rewrittenText.replace(
      /\b(because|since)\b/gi,
      (match) => match.charAt(0).toUpperCase() + match.slice(1).toLowerCase(),
    );
    changes.push('Ensured consistent capitalization of transition phrases');
  }

  if (tags.some(t => t.name === 'comprehensive')) {
    changes.push('Assignment is already comprehensive; minor edits applied');
  }

  // Ensure we have at least one change
  if (changes.length === 0) {
    rewrittenText = rewrittenText.replace(
      /\.(\s+)/g,
      '. Improved phrasing applied.$1',
    );
    changes.push('Enhanced overall phrasing and clarity');
  }

  return {
    rewrittenText,
    summaryOfChanges: changes.join(' | '),
    appliedTags: tags,
  };
}
