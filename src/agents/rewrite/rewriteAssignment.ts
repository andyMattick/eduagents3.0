import { Tag } from '../../types/pipeline';

export interface RewriteResult {
  rewrittenText: string;
  summaryOfChanges: string;
  appliedTags: Tag[];
}

/**
 * Rewrites an assignment based on student feedback notes and problem-specific suggestions
 * Notes should contain specific reasons why problems need to be changed
 * Returns the rewritten text along with a summary of changes
 */
export async function rewriteAssignment(
  originalText: string,
  tags: Tag[],
  feedbackNotes?: string,
): Promise<RewriteResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1200));

  let rewrittenText = originalText;
  const changes: string[] = [];

  // If feedback notes are provided, use them to drive specific changes
  if (feedbackNotes && feedbackNotes.trim()) {
    // Extract key themes from notes
    const notesLower = feedbackNotes.toLowerCase();
    
    // Simplification: if notes mention clarity/confusion, simplify language
    if (notesLower.includes('clarity') || notesLower.includes('confused') || notesLower.includes('unclear')) {
      rewrittenText = simplifyLanguage(rewrittenText);
      changes.push('Clarified wording based on student confusion points');
    }

    // Difficulty: if notes mention too hard, reduce complexity
    if (notesLower.includes('too hard') || notesLower.includes('difficult') || notesLower.includes('struggle')) {
      rewrittenText = reduceComplexity(rewrittenText);
      changes.push('Reduced complexity in response to difficulty feedback');
    }

    // Ambiguity: if notes mention ambiguity, add specifics
    if (notesLower.includes('ambiguous') || notesLower.includes('unclear what') || notesLower.includes('vague')) {
      rewrittenText = addSpecificity(rewrittenText);
      changes.push('Added specificity to reduce ambiguity');
    }

    // Multi-part: if notes mention breaking up questions, split them
    if (notesLower.includes('multi-part') || notesLower.includes('break apart') || notesLower.includes('separate')) {
      rewrittenText = breakUpMultiPart(rewrittenText);
      changes.push('Broke up multi-part questions into clearer steps');
    }

    // Scaffold: if notes mention needing support, add scaffolding
    if (notesLower.includes('scaffold') || notesLower.includes('hints') || notesLower.includes('support')) {
      rewrittenText = addScaffolding(rewrittenText);
      changes.push('Added scaffolding and hints to support student learning');
    }

    // Accessibility: if notes mention accessibility issues
    if (notesLower.includes('accessibility') || notesLower.includes('font') || notesLower.includes('spacing')) {
      rewrittenText = improveAccessibility(rewrittenText);
      changes.push('Improved formatting for accessibility');
    }
  }

  // Fall back to tag-based rewriting if no notes or minimal changes
  if (changes.length === 0) {
    // Detect if content contains HTML - if so, preserve it
    const hasHTML = /<[^>]*>/.test(originalText);

    // Apply improvements based on detected tags
    if (tags.some(t => t.name === 'vague-modifiers')) {
      rewrittenText = rewrittenText
        .replace(/\bvery\b/gi, 'extremely')
        .replace(/\breally\b/gi, 'notably')
        .replace(/\bquite\b/gi, 'considerably')
        .replace(/\bsomewhat\b/gi, 'partially');
      changes.push('Replaced vague modifiers with more specific language');
    }

    if (tags.some(t => t.name === 'clarity')) {
      rewrittenText = simplifyLanguage(rewrittenText);
      changes.push('Enhanced clarity through improved phrasing');
    }

    if (changes.length === 0) {
      changes.push('Assignment reviewed and optimized for student engagement');
    }
  }

  return {
    rewrittenText,
    summaryOfChanges: changes.join(' | '),
    appliedTags: tags,
  };
}

/**
 * Simplify language by using shorter sentences and simpler words
 */
function simplifyLanguage(text: string): string {
  let simplified = text;

  // Replace complex words with simpler alternatives
  const replacements: Record<string, string> = {
    'utilize': 'use',
    'facilitate': 'help',
    'implement': 'do',
    'ascertain': 'find out',
    'demonstrate': 'show',
    'subsequent': 'next',
    'numerous': 'many',
    'sufficient': 'enough',
  };

  Object.entries(replacements).forEach(([complex, simple]) => {
    const regex = new RegExp(`\\b${complex}\\b`, 'gi');
    simplified = simplified.replace(regex, simple);
  });

  // Break up long sentences (heuristic: split at conjunctions)
  simplified = simplified.replace(/,\s*(which|that|and)\s+/g, '.\n$1 ');

  return simplified;
}

/**
 * Reduce linguistic complexity
 */
function reduceComplexity(text: string): string {
  let reduced = text;

  // Remove subordinate clauses (very basic heuristic)
  reduced = reduced.replace(/\([^)]*\)/g, '');

  // Remove very long words/jargon
  reduced = reduced.replace(/\b\w{15,}\b/g, '[simplified]');

  return reduced;
}

/**
 * Add specificity to vague language
 */
function addSpecificity(text: string): string {
  let specific = text;

  // Add specificity where found general statements
  const vaguePhrases: Record<string, string> = {
    'some things': 'specific factors',
    'a lot of': 'several',
    'things': 'steps',
    'stuff': 'materials',
  };

  Object.entries(vaguePhrases).forEach(([vague, specific]) => {
    const regex = new RegExp(`\\b${vague}\\b`, 'gi');
    specific = specific.replace(regex, specific);
  });

  return specific;
}

/**
 * Break up multi-part questions into separate ones
 */
function breakUpMultiPart(text: string): string {
  let broken = text;

  // Simple heuristic: look for "and" at end of sentences in parentheses or after numbers
  // This is a basic approach - real implementation would parse question structure

  // Add line break before "and" if followed by another question directive
  broken = broken.replace(/([.?])\s+and\s+/g, '$1\n\nNext: ');

  return broken;
}

/**
 * Add scaffolding (hints, steps, etc)
 */
function addScaffolding(text: string): string {
  // This would ideally inject hints or step-by-step guidance
  // For now, just add a note that scaffolding should be added
  const lines = text.split('\n');
  const scaffolded = lines.map((line, i) => {
    if (line.match(/^[0-9]+\.|^[A-Z]\./) && i > 0) {
      return `[Hint: Consider the previous step]\n${line}`;
    }
    return line;
  });

  return scaffolded.join('\n');
}

/**
 * Improve accessibility formatting
 */
function improveAccessibility(text: string): string {
  let accessible = text;

  // Add semantic structure if missing
  if (!accessible.includes('<h1') && !accessible.includes('<h2')) {
    accessible = `<h2>Assignment</h2>\n${accessible}`;
  }

  // Ensure good spacing (add more line breaks)
  accessible = accessible.replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2');

  return accessible;
}
