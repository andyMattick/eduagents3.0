import { Tag, TagChange } from '../../types/pipeline';

export interface VersionAnalysis {
  tagChanges: TagChange[];
  engagementScoreDelta: number;
  timeToReadDelta: number;
  originalEngagementScore: number;
  rewrittenEngagementScore: number;
  originalTimeToRead: number;
  rewrittenTimeToRead: number;
}

/**
 * Analyzes the differences between two versions of an assignment
 * Compares tags, engagement scores, and readability metrics
 */
export async function analyzeVersions(
  originalTags: Tag[],
  rewrittenTags: Tag[],
): Promise<VersionAnalysis> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));

  // Calculate tag changes
  const tagChanges: TagChange[] = [];

  // Check for removed tags
  originalTags.forEach(origTag => {
    const rewrittenTag = rewrittenTags.find(t => t.name === origTag.name);
    if (!rewrittenTag) {
      tagChanges.push({
        tag: origTag.name,
        delta: -origTag.confidenceScore,
        fromConfidence: origTag.confidenceScore,
        toConfidence: 0,
      });
    } else if (rewrittenTag.confidenceScore !== origTag.confidenceScore) {
      tagChanges.push({
        tag: origTag.name,
        delta: rewrittenTag.confidenceScore - origTag.confidenceScore,
        fromConfidence: origTag.confidenceScore,
        toConfidence: rewrittenTag.confidenceScore,
      });
    }
  });

  // Check for new tags
  rewrittenTags.forEach(rewriteTag => {
    if (!originalTags.find(t => t.name === rewriteTag.name)) {
      tagChanges.push({
        tag: rewriteTag.name,
        delta: rewriteTag.confidenceScore,
        fromConfidence: 0,
        toConfidence: rewriteTag.confidenceScore,
      });
    }
  });

  // Calculate engagement score improvements
  const originalEngagementScore = originalTags.reduce((sum, tag) => sum + tag.confidenceScore, 0)
    / Math.max(originalTags.length, 1);
  const rewrittenEngagementScore = rewrittenTags.reduce((sum, tag) => sum + tag.confidenceScore, 0)
    / Math.max(rewrittenTags.length, 1);
  const engagementScoreDelta = rewrittenEngagementScore - originalEngagementScore;

  // Estimate reading time based on tag complexity
  const baseTimePerTag = 10; // seconds
  const originalTimeToRead = originalTags.length * baseTimePerTag;
  const rewrittenTimeToRead = rewrittenTags.length * baseTimePerTag;
  const timeToReadDelta = rewrittenTimeToRead - originalTimeToRead;

  return {
    tagChanges,
    engagementScoreDelta,
    timeToReadDelta,
    originalEngagementScore,
    rewrittenEngagementScore,
    originalTimeToRead,
    rewrittenTimeToRead,
  };
}
