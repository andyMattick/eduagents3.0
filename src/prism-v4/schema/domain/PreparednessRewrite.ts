/**
 * Preparedness Rewrite — Domain model for the output of applying alignment suggestions.
 *
 * Option B: rewrittenAssessment as full text string, prepAddendum as label array.
 */

/**
 * Result of applying suggestions to assessment and/or prep.
 */
export interface RewriteResult {
  rewrittenAssessment: string;
  prepAddendum: string[]; // short labels, one per add_prep_support suggestion
}
