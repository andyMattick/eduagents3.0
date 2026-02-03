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

  // Detect if content contains HTML - if so, preserve it
  const hasHTML = /<[^>]*>/.test(originalText);

  // Apply improvements based on detected tags
  if (tags.some(t => t.name === 'vague-modifiers')) {
    // Replace vague modifiers with specific ones (preserve HTML tags)
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
    // Add transition words if not present (preserve HTML structure)
    if (!rewrittenText.toLowerCase().includes('however')) {
      // Split on paragraph or sentence boundaries, preserving HTML
      const parts = rewrittenText.split(/<\/p>|\n\n/);
      if (parts.length > 1) {
        const midpoint = Math.floor(parts.length / 2);
        parts[midpoint] = 'However, ' + parts[midpoint].trim();
        rewrittenText = parts.join('\n\n');
        changes.push('Added transition words to improve clarity');
      }
    }
  }

  if (tags.some(t => t.name === 'transitions')) {
    // Enhance existing transitions (preserve HTML tags)
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
    // For HTML content, preserve structure
    if (hasHTML) {
      rewrittenText = rewrittenText.replace(
        /([.!?])\s+/g,
        '$1 ',
      );
    } else {
      rewrittenText = rewrittenText.replace(
        /\.(\s+)/g,
        '. Improved phrasing applied.$1',
      );
    }
    changes.push('Enhanced overall phrasing and clarity');
  }

  // Ensure HTML is not double-escaped
  if (rewrittenText.includes('&lt;') || rewrittenText.includes('&gt;')) {
    // Already escaped, decode it
    const textarea = document.createElement('textarea');
    textarea.innerHTML = rewrittenText;
    rewrittenText = textarea.value;
  }

  return {
    rewrittenText,
    summaryOfChanges: changes.join(' | '),
    appliedTags: tags,
  };
}
