import React, { useState } from 'react';
import { PromptBuilder } from './PromptBuilderSimplified';
import {
  parseUploadedFile,
  validateUploadedFile,
} from '../../agents/shared/parseFiles';

type InputMode = 'text' | 'upload' | 'generate';

interface AssignmentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (text: string) => void;
  isLoading?: boolean;
}

const tabStyles = {
  container: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    borderBottom: '2px solid #e0e0e0',
  },
  tab: (active: boolean) => ({
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: active ? '3px solid #007bff' : 'none',
    color: active ? '#007bff' : '#666',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: active ? 'bold' : 'normal',
    transition: 'all 0.3s ease',
  }),
};

export function AssignmentInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
}: AssignmentInputProps) {
  const [mode, setMode] = useState<InputMode>('upload');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [formattedContent, setFormattedContent] = useState(''); // Store formatted HTML

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError('');

    // Validate file
    const validation = validateUploadedFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      return;
    }

    try {
      const text = await parseUploadedFile(file);
      onChange(text);
      setUploadedFileName(file.name);
      setFormattedContent(text); // Store formatted content for display
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse file';
      setUploadError(errorMessage);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      {!uploadedFileName ? (
        <>
          <div style={tabStyles.container}>
            <button
              style={tabStyles.tab(mode === 'upload')}
              onClick={() => {
                setMode('upload');
                setUploadError('');
              }}
            >
              📄 Upload File
            </button>
            <button
              style={tabStyles.tab(mode === 'generate')}
              onClick={() => {
                setMode('generate');
                setUploadError('');
              }}
            >
              🤖 Generate with AI
            </button>
          </div>

          {uploadError && (
            <div
              style={{
                padding: '12px',
                marginBottom: '16px',
                backgroundColor: '#f8d7da',
                border: '1px solid #f5c6cb',
                borderRadius: '4px',
                color: '#721c24',
                fontSize: '13px',
              }}
            >
              <strong>Upload Error:</strong> {uploadError}
            </div>
          )}

          {mode === 'upload' && (
            <div
              style={{
                padding: '40px',
                marginBottom: '16px',
                border: '2px dashed #007bff',
                borderRadius: '8px',
                textAlign: 'center',
                backgroundColor: '#f0f7ff',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.backgroundColor = '#e0edff';
                e.currentTarget.style.borderColor = '#0056b3';
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f7ff';
                e.currentTarget.style.borderColor = '#007bff';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.backgroundColor = '#f0f7ff';
                e.currentTarget.style.borderColor = '#007bff';
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                  const event = {
                    target: { files },
                  } as unknown as React.ChangeEvent<HTMLInputElement>;
                  handleFileUpload(event);
                }
              }}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".txt,.pdf,.docx,.doc"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📤</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>
                Drop your file here or click to browse
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Supported: .txt, .pdf, .docx
              </div>
            </div>
          )}

          {mode === 'generate' && (
            <PromptBuilder
              onAssignmentGenerated={(content) => {
                onChange(content);
                onSubmit(content);
              }}
              isLoading={isLoading}
            />
          )}
        </>
      ) : (
        <>
          <div
            style={{
              padding: '16px',
              marginBottom: '16px',
              backgroundColor: '#e8f5e9',
              border: '2px solid #28a745',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#2e7d32',
            }}
          >
            <strong>✓ Ready to Analyze</strong>
          </div>

          {formattedContent && (
            <div
              style={{
                padding: '16px',
                marginBottom: '16px',
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                maxHeight: '400px',
                overflowY: 'auto',
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px',
                lineHeight: '1.6',
              }}
            >
              {formattedContent.includes('<') ? (
                <div
                  dangerouslySetInnerHTML={{ __html: formattedContent }}
                  style={{
                    color: '#333',
                  }}
                />
              ) : (
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    color: '#333',
                  }}
                >
                  {formattedContent}
                </pre>
              )}
            </div>
          )}

          <button
            onClick={() => {
              console.log('Continue clicked, value length:', value?.length, 'formattedContent length:', formattedContent?.length);
              onSubmit(formattedContent || value);
            }}
            disabled={!value || !value.trim() || isLoading}
            style={{
              padding: '12px 32px',
              backgroundColor: value && value.trim() && !isLoading ? '#28a745' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: value && value.trim() && !isLoading ? 'pointer' : 'not-allowed',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (value && value.trim() && !isLoading) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#218838';
              }
            }}
            onMouseLeave={(e) => {
              if (value && value.trim() && !isLoading) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#28a745';
              }
            }}
          >
            {isLoading ? 'Processing...' : '✓ Continue'}
          </button>
        </>
      )}
    </div>
  );
}
