/**
 * Document Preview: Quick validation before full extraction
 * 
 * ⚠️  MVP PARSER - Will be replaced with Claude API
 * Shows user what the MVP parser detects before committing to analysis
 * Real AI will provide much better accuracy for sections, problem count, structure
 * 
 * Current behavior: Detects simple section headers (Part A, Part B, etc.)
 * and estimates problem count via line breaks and question markers.
 */

export interface DocumentPreview {
  sections: Array<{
    title: string;
    startIndex: number;
    endIndex: number;
    approximateProblems: number;
    approximateMultipart: number;
    preview: string; // First 200 chars
  }>;
  totalSections: number;
  totalEstimatedProblems: number;
  totalEstimatedMultipart: number;
}

/**
 * Quick preview: detect sections and estimate problem count
 * WITHOUT doing full linguistic analysis
 */
export function previewDocument(documentText: string): DocumentPreview {
  const lines = documentText.split('\n');
  
  // Detect section headers: "Part A:", "Part B:", etc. (handles multi-line)
  const sectionPattern = /^(?:Part|Chapter|Section|Unit)\s+([A-Za-z0-9]+)[:\s]/i;
  
  const sections: DocumentPreview['sections'] = [];
  let currentSectionStart = 0;
  let currentSectionTitle = 'Opening';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(sectionPattern);
    
    if (match && i > 0) {  // Don't match first line as section
      // Found a new section header
      if (i > currentSectionStart + 1) {
        // Save previous section
        const sectionText = lines.slice(currentSectionStart, i).join('\n');
        const { problems, multipart } = estimateProblems(sectionText);
        
        if (problems > 0) {  // Only add if has problems
          sections.push({
            title: currentSectionTitle,
            startIndex: currentSectionStart,
            endIndex: i,
            approximateProblems: problems,
            approximateMultipart: multipart,
            preview: sectionText.substring(0, 150).replace(/\n/g, ' ') + '...',
          });
        }
      }
      
      // Start new section
      currentSectionStart = i;
      currentSectionTitle = line;
    }
  }
  
  // Add final section
  if (currentSectionStart < lines.length) {
    const sectionText = lines.slice(currentSectionStart).join('\n');
    const { problems, multipart } = estimateProblems(sectionText);
    
    if (problems > 0) {
      sections.push({
        title: currentSectionTitle,
        startIndex: currentSectionStart,
        endIndex: lines.length,
        approximateProblems: problems,
        approximateMultipart: multipart,
        preview: sectionText.substring(0, 150).replace(/\n/g, ' ') + '...',
      });
    }
  }
  
  // If no sections found but document is long, try to estimate from full text
  if (sections.length === 0) {
    const { problems, multipart } = estimateProblems(documentText);
    sections.push({
      title: 'Full Document',
      startIndex: 0,
      endIndex: lines.length,
      approximateProblems: problems,
      approximateMultipart: multipart,
      preview: documentText.substring(0, 150).replace(/\n/g, ' ') + '...',
    });
  }
  
  // Calculate totals
  const totalProblems = sections.reduce((sum, s) => sum + s.approximateProblems, 0);
  const totalMultipart = sections.reduce((sum, s) => sum + s.approximateMultipart, 0);
  
  return {
    sections,
    totalSections: sections.length,
    totalEstimatedProblems: totalProblems,
    totalEstimatedMultipart: totalMultipart,
  };
}

/**
 * Estimate problem count in a section without full analysis
 * Looks for: numbered items (1., 2., a), lettered subparts (a), b), c))
 */
function estimateProblems(text: string): { problems: number; multipart: number } {
  const lines = text.split('\n');
  
  let mainProblems = 0;
  let multipartCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Main problem: starts with number followed by period/colon
    // e.g., "1.", "2:", "123."
    if (/^\d+[.:\s]/.test(line) && line.length > 2) {
      mainProblems++;
      
      // Check if next lines have subparts (a), b), c), etc.)
      let subpartCount = 0;
      for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
        const nextLine = lines[j].trim();
        
        if (/^[a-z]\)|\ba\)|\ba\.|\b[a-z]\.[ \t]|^[a-z]\.[ ]/.test(nextLine)) {
          subpartCount++;
        } else if (subpartCount > 0 && /^\d+[.:\s]/.test(nextLine)) {
          // Hit next main problem
          break;
        }
      }
      
      if (subpartCount >= 2) {
        multipartCount++;
      }
    }
  }
  
  // If we found zero problems, try to find ANY question mark lines
  if (mainProblems === 0) {
    const questionLines = text.split('\n').filter(l => l.includes('?') && l.trim().length > 5);
    mainProblems = Math.max(1, Math.ceil(questionLines.length / 3)); // Rough estimate
  }
  
  return {
    problems: Math.max(mainProblems, 1),
    multipart: multipartCount,
  };
}
