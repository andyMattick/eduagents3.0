/**
 * Utilities for parsing text from uploaded files with formatting preserved
 * Supports text files, PDF, and Word documents
 * Returns content with formatting tags preserved (HTML/Markdown)
 */

// Import mammoth if available
let mammothLib: any = null;
try {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  mammothLib = require('mammoth');
} catch {
  // Mammoth not available - will handle gracefully in parseWordFile
}

export async function parseTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text || '');
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsText(file);
  });
}

export async function parsePdfFile(file: File): Promise<string> {
  try {
    // Try using pdf-parse first (Node.js backend, better text extraction)
    // @ts-ignore
    const pdfjsLib = await import('pdfjs-dist');
    
    // Use local worker file
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let textContent = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const pageText = await page.getTextContent();

      // Extract text with proper spacing
      const pageLines: string[] = [];
      let currentLine = '';
      let lastY = 0;
      let lastX = 0;

      for (const item of pageText.items) {
        const itemText = (item as any).str || '';
        const itemY = (item as any).transform ? (item as any).transform[5] : lastY;
        const itemX = (item as any).transform ? (item as any).transform[4] : lastX;

        // Detect line breaks (significant Y change)
        if (Math.abs(itemY - lastY) > 5 && currentLine.trim()) {
          pageLines.push(currentLine.trim());
          currentLine = itemText;
          lastX = itemX;
        } else {
          // Add space between words if needed
          if (currentLine && itemX - lastX > 2 && !currentLine.endsWith(' ')) {
            currentLine += ' ';
          }
          currentLine += itemText;
        }

        lastY = itemY;
        lastX = itemX + (itemText.length * 5); // Approximate width
      }

      // Add final line
      if (currentLine.trim()) {
        pageLines.push(currentLine.trim());
      }

      // Join lines with proper line breaks
      textContent += pageLines.join('\n');

      // Add page separator
      if (pageNum < pdf.numPages) {
        textContent += '\n\n---PAGE BREAK---\n\n';
      }
    }

    return textContent;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to parse PDF';

    if (
      errorMessage.includes('Cannot find module') ||
      errorMessage.includes('pdfjs-dist') ||
      errorMessage.includes('does not match the Worker version')
    ) {
      throw new Error(
        'PDF support requires pdfjs-dist. Install with: npm install pdfjs-dist',
      );
    }

    throw new Error(`PDF Error: ${errorMessage}`);
  }
}

export async function parseWordFile(file: File): Promise<string> {
  try {
    if (!mammothLib) {
      throw new Error(
        'Word document support requires mammoth. Install with: npm install mammoth',
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    // Extract HTML with formatting preserved
    const result = await mammothLib.convertToHtml({ arrayBuffer });

    // Wrap in styled div for consistent display
    const htmlContent = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      ${result.value}
    </div>`;

    return htmlContent;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to parse Word document';
    throw new Error(`Word parsing error: ${errorMessage}`);
  }
}

export async function parseUploadedFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.txt')) {
    return parseTextFile(file);
  } else if (fileName.endsWith('.pdf')) {
    return parsePdfFile(file);
  } else if (
    fileName.endsWith('.docx')
    || fileName.endsWith('.doc')
  ) {
    return parseWordFile(file);
  } else {
    throw new Error(
      'Unsupported file type. Please use .txt, .pdf, or .docx files.',
    );
  }
}

export function validateUploadedFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const validExtensions = ['.txt', '.pdf', '.docx', '.doc'];

  if (file.size > maxSize) {
    return { valid: false, error: 'File is too large. Maximum size is 10MB.' };
  }

  const fileName = file.name.toLowerCase();
  const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

  if (!hasValidExtension) {
    return {
      valid: false,
      error: `Invalid file type. Supported: ${validExtensions.join(', ')}`,
    };
  }

  return { valid: true };
}
