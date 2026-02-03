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
    // Dynamically import pdfjs-dist
    // @ts-ignore - pdfjs-dist is optional dependency
    const pdfjsLib = await import('pdfjs-dist');

    // Use local worker file copied to public folder
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let htmlContent = '<div style="font-family: Arial, sans-serif; line-height: 1.6;">';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Group text by line and preserve structure
      let currentLine = '';
      let lastY: number | null = null;

      for (const item of textContent.items) {
        const itemY: number | null = (item as any).transform ? (item as any).transform[5] : lastY;

        // New line detected (Y coordinate changed)
        if (lastY !== null && itemY !== lastY) {
          if (currentLine.trim()) {
            htmlContent += `<p>${currentLine.trim()}</p>`;
          }
          currentLine = '';
        }

        currentLine += (item as any).str || '';
        lastY = itemY;
      }

      // Add remaining line
      if (currentLine.trim()) {
        htmlContent += `<p>${currentLine.trim()}</p>`;
      }

      // Add page break between pages
      if (pageNum < pdf.numPages) {
        htmlContent += '<hr style="margin: 20px 0; border: 1px solid #ddd;" />';
      }
    }

    htmlContent += '</div>';

    return htmlContent;
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
