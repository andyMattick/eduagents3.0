import { useState, useRef } from 'react';
import './FileUploadComponent.css';

interface FileUploadComponentProps {
  title: string;
  description?: string;
  acceptedTypes?: string;
  maxSizeMB?: number;
  onFileSelected: (file: File) => void;
  selectedFileName?: string;
}

/**
 * Reusable file upload component
 */
export function FileUploadComponent({
  title,
  description,
  acceptedTypes = '.pdf,.doc,.docx,.txt',
  maxSizeMB = 25,
  onFileSelected,
  selectedFileName,
}: FileUploadComponentProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndSelectFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      validateAndSelectFile(files[0]);
    }
  };

  const validateAndSelectFile = (file: File) => {
    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(`File size exceeds ${maxSizeMB}MB limit`);
      return;
    }

    // Check file type
    const validTypes = acceptedTypes.split(',').map(t => t.trim().toLowerCase());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(fileExtension)) {
      setError(`Invalid file type. Accepted types: ${acceptedTypes}`);
      return;
    }

    setError(null);
    onFileSelected(file);
  };

  return (
    <div className="file-upload-component">
      <h2>{title}</h2>
      {description && <p className="description">{description}</p>}

      <div
        className={`file-upload-zone ${isDragging ? 'dragging' : ''} ${selectedFileName ? 'has-file' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInput}
          accept={acceptedTypes}
          style={{ display: 'none' }}
        />

        {selectedFileName ? (
          <div className="file-upload-success">
            <div className="success-icon">✓</div>
            <p className="file-name">{selectedFileName}</p>
            <button className="change-file-btn" onClick={e => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}>
              Change file
            </button>
          </div>
        ) : (
          <div className="file-upload-content">
            <div className="upload-icon">📂</div>
            <p className="upload-text">
              {isDragging ? 'Drop your file here' : 'Drag and drop your file here'}
            </p>
            <p className="upload-hint">or click to browse</p>
            <p className="file-size-hint">Max file size: {maxSizeMB}MB</p>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
}
