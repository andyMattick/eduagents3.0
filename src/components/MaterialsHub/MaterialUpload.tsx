import React, { useState } from 'react';
import { Material, MaterialType } from '../../types/materials';
import { parseUploadedFile } from '../../agents/shared/parseFiles';

interface MaterialUploadProps {
  onMaterialUploaded: (material: Material) => void;
  isLoading?: boolean;
}

const materialTypeDescriptions: Record<MaterialType, string> = {
  lesson_plan: '📚 Lesson Plan - Complete lesson structure with objectives and activities',
  notes: '📝 Notes - Class notes, study guides, or reference notes',
  reference_material: '📄 Reference Material - Articles, excerpts, or background information',
  rubric: '📊 Rubric - Grading rubric or assessment criteria',
  assessment_rubric: '✅ Assessment Rubric - Detailed assessment or scoring guide',
  student_sample: '🎓 Student Sample - Example student work or submission',
  exemplar: '⭐ Exemplar - Model or ideal example of work',
};

export function MaterialUpload({ onMaterialUploaded, isLoading }: MaterialUploadProps) {
  const [selectedType, setSelectedType] = useState<MaterialType>('lesson_plan');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      const content = await parseUploadedFile(file);

      const material: Material = {
        id: `mat_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        filename: file.name,
        materialType: selectedType,
        content,
        predefinedTags: [],
        customTags: [],
        description: description || undefined,
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onMaterialUploaded(material);
      setFile(null);
      setDescription('');
      setSelectedType('lesson_plan');
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      <form onSubmit={handleSubmit}>
        {/* Material Type Selection */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#333' }}>
            What type of material are you uploading?
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '12px',
            }}
          >
            {(Object.keys(materialTypeDescriptions) as MaterialType[]).map(type => (
              <label
                key={type}
                style={{
                  padding: '12px',
                  backgroundColor: selectedType === type ? '#e3f2fd' : '#fff',
                  border: `2px solid ${selectedType === type ? '#007bff' : '#ddd'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (selectedType !== type) {
                    e.currentTarget.style.backgroundColor = '#f9f9f9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedType !== type) {
                    e.currentTarget.style.backgroundColor = '#fff';
                  }
                }}
              >
                <input
                  type="radio"
                  value={type}
                  checked={selectedType === type}
                  onChange={(e) => setSelectedType(e.target.value as MaterialType)}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ fontSize: '14px', color: '#333' }}>
                  {materialTypeDescriptions[type]}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any context or notes about this material..."
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontFamily: 'inherit',
              fontSize: '14px',
              resize: 'vertical',
            }}
          />
        </div>

        {/* File Upload */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#333' }}>
            Upload File
          </label>
          <div
            style={{
              padding: '40px',
              border: '2px dashed #007bff',
              borderRadius: '8px',
              textAlign: 'center',
              backgroundColor: '#f0f7ff',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onClick={() => document.getElementById('material-file-input')?.click()}
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
                setFile(files[0]);
              }
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📤</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
              {file ? file.name : 'Drop file here or click to browse'}
            </div>
            <div style={{ fontSize: '13px', color: '#666' }}>
              Supported: .txt, .pdf, .docx
            </div>
            <input
              id="material-file-input"
              type="file"
              accept=".txt,.pdf,.docx,.doc"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!file || uploading || isLoading}
          style={{
            padding: '12px 24px',
            backgroundColor: file && !uploading && !isLoading ? '#28a745' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: file && !uploading && !isLoading ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            fontWeight: '600',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (file && !uploading && !isLoading) {
              e.currentTarget.style.backgroundColor = '#218838';
            }
          }}
          onMouseLeave={(e) => {
            if (file && !uploading && !isLoading) {
              e.currentTarget.style.backgroundColor = '#28a745';
            }
          }}
        >
          {uploading ? 'Uploading...' : '✓ Upload Material'}
        </button>
      </form>
    </div>
  );
}
