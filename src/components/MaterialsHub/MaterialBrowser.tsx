import { useState } from 'react';
import { Material, MaterialType } from '../../types/materials';

interface MaterialBrowserProps {
  materials: Material[];
  selectedMaterial?: Material;
  isLoading?: boolean;
  onSelectMaterial: (material: Material) => void;
  onEditTags: (material: Material) => void;
  onDelete: (materialId: string) => void;
  onSendToAI: (material: Material) => void;
}

const materialTypeEmojis: Record<MaterialType, string> = {
  lesson_plan: '📚',
  notes: '📝',
  reference_material: '📄',
  rubric: '📊',
  assessment_rubric: '✅',
  student_sample: '🎓',
  exemplar: '⭐',
};

export function MaterialBrowser({
  materials,
  selectedMaterial,
  isLoading,
  onSelectMaterial,
  onEditTags,
  onDelete,
  onSendToAI,
}: MaterialBrowserProps) {
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | undefined>(
    selectedMaterial?.id
  );

  if (materials.length === 0) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#f9f9f9',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
        <h3 style={{ color: '#666', marginTop: 0 }}>No materials yet</h3>
        <p style={{ color: '#999', marginBottom: '16px' }}>
          Upload lesson plans, notes, rubrics, or other materials to get started.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      {/* Materials List */}
      <div style={{ flex: 0.4, minWidth: '300px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '12px' }}>
          {materials.length} Material{materials.length !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {materials.map(material => (
            <div
              key={material.id}
              onClick={() => {
                onSelectMaterial(material);
                setExpandedMaterialId(material.id);
              }}
              style={{
                padding: '12px',
                backgroundColor:
                  expandedMaterialId === material.id ? '#e3f2fd' : 'white',
                border: `1px solid ${expandedMaterialId === material.id ? '#007bff' : '#ddd'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (expandedMaterialId !== material.id) {
                  e.currentTarget.style.backgroundColor = '#f9f9f9';
                }
              }}
              onMouseLeave={(e) => {
                if (expandedMaterialId !== material.id) {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                <div style={{ fontSize: '20px', marginTop: '2px' }}>
                  {materialTypeEmojis[material.materialType]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: '600',
                      color: '#333',
                      fontSize: '14px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={material.filename}
                  >
                    {material.filename}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                    {new Date(material.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Tags Preview */}
              {(material.predefinedTags.length > 0 || material.customTags.length > 0) && (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {material.predefinedTags.slice(0, 2).map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        backgroundColor: '#e3f2fd',
                        color: '#0056b3',
                        borderRadius: '3px',
                      }}
                    >
                      {tag.value}
                    </span>
                  ))}
                  {material.customTags.slice(0, 1).map((tag, idx) => (
                    <span
                      key={`custom_${idx}`}
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        backgroundColor: '#f0f0f0',
                        color: '#666',
                        borderRadius: '3px',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                  {material.predefinedTags.length + material.customTags.length > 3 && (
                    <span style={{ fontSize: '11px', color: '#999' }}>
                      +{material.predefinedTags.length + material.customTags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Material Details */}
      {expandedMaterialId && selectedMaterial && (
        <div
          style={{
            flex: 1,
            padding: '20px',
            backgroundColor: '#f9f9f9',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', color: '#333' }}>
            {materialTypeEmojis[selectedMaterial.materialType]} {selectedMaterial.filename}
          </h3>

          {selectedMaterial.description && (
            <div style={{ marginBottom: '12px', fontSize: '13px', color: '#666' }}>
              <strong>Description:</strong>
              <p style={{ margin: '4px 0 0 0' }}>{selectedMaterial.description}</p>
            </div>
          )}

          {/* Tags Section */}
          <div style={{ marginBottom: '12px' }}>
            <strong style={{ fontSize: '13px', color: '#333', display: 'block', marginBottom: '8px' }}>
              Tags:
            </strong>
            {selectedMaterial.predefinedTags.length === 0 &&
            selectedMaterial.customTags.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>No tags yet</p>
            ) : (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {selectedMaterial.predefinedTags.map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '12px',
                      padding: '4px 8px',
                      backgroundColor: '#e3f2fd',
                      color: '#0056b3',
                      borderRadius: '4px',
                    }}
                  >
                    {tag.category}: {tag.value}
                  </span>
                ))}
                {selectedMaterial.customTags.map((tag, idx) => (
                  <span
                    key={`custom_${idx}`}
                    style={{
                      fontSize: '12px',
                      padding: '4px 8px',
                      backgroundColor: '#e8f5e9',
                      color: '#2e7d32',
                      borderRadius: '4px',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          <div style={{ marginBottom: '16px', marginTop: '12px' }}>
            <strong style={{ fontSize: '13px', color: '#333', display: 'block', marginBottom: '8px' }}>
              Preview:
            </strong>
            <div
              style={{
                maxHeight: '200px',
                overflowY: 'auto',
                padding: '12px',
                backgroundColor: 'white',
                borderRadius: '4px',
                border: '1px solid #e0e0e0',
                fontSize: '12px',
                color: '#333',
                fontFamily: 'inherit',
                lineHeight: '1.5',
              }}
            >
              {/* Strip HTML tags for better preview */}
              {selectedMaterial.content
                .replace(/<[^>]*>/g, '')
                .substring(0, 300)}
              {selectedMaterial.content.length > 300 && '...'}
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#999' }}>
                ({selectedMaterial.content.replace(/<[^>]*>/g, '').length} characters)
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
            <button
              onClick={() => onEditTags(selectedMaterial)}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              🏷️ Edit Tags
            </button>
            <button
              onClick={() => onSendToAI(selectedMaterial)}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: isLoading ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              {isLoading ? 'Sending...' : '🤖 Send to AI'}
            </button>
            <button
              onClick={() => {
                onDelete(selectedMaterial.id);
                setExpandedMaterialId(undefined);
              }}
              style={{
                padding: '10px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              🗑️
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
