import { useState } from 'react';
import { Material, PredefinedTag } from '../../types/materials';
import { useMaterialsHub } from '../../hooks/useMaterialsHub';
import { MaterialUpload } from './MaterialUpload';
import { MaterialBrowser } from './MaterialBrowser';
import { MaterialTagger } from './MaterialTagger';
import { AIWriterDialog, GenerationOptions } from './AIWriterDialog';

type TabType = 'browse' | 'upload';

const tabStyles = {
  container: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '2px solid #e0e0e0',
  },
  tab: (active: boolean) => ({
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: active ? '3px solid #007bff' : 'none',
    color: active ? '#007bff' : '#666',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: active ? '600' : '400',
    transition: 'all 0.3s ease',
  }),
};

export function MaterialsHub() {
  const {
    materials,
    selectedMaterial,
    isLoading,
    error,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    selectMaterial,
    sendToAIWriter,
  } = useMaterialsHub();

  const [activeTab, setActiveTab] = useState<TabType>('browse');
  const [showTagger, setShowTagger] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [taggerMaterial, setTaggerMaterial] = useState<Material | undefined>(undefined);

  const handleMaterialUploaded = (material: Material) => {
    addMaterial(material);
    setActiveTab('browse');
  };

  const handleEditTags = (material: Material) => {
    setTaggerMaterial(material);
    setShowTagger(true);
  };

  const handleTagsUpdated = (tags: PredefinedTag[], customTags: string[]) => {
    if (taggerMaterial) {
      updateMaterial(taggerMaterial.id, {
        predefinedTags: tags,
        customTags,
        updatedAt: new Date().toISOString(),
      });
      setShowTagger(false);
      setTaggerMaterial(undefined);
    }
  };

  const handleSendToAI = async (material: Material, options: GenerationOptions) => {
    await sendToAIWriter({
      type: options.actionType,
      material,
      additionalInstructions: options.instructions,
    });
    setShowAIDialog(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 8px 0', color: '#333' }}>
          📚 Materials Hub
        </h1>
        <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
          Upload and manage lesson plans, notes, rubrics, and more. Tag them and send to AI writer for enhancement or assignment generation.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            padding: '16px',
            marginBottom: '20px',
            backgroundColor: '#f8d7da',
            border: '2px solid #f5c6cb',
            borderRadius: '4px',
            color: '#721c24',
            fontSize: '14px',
          }}
        >
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {/* Tabs */}
      <div style={tabStyles.container}>
        <button
          style={tabStyles.tab(activeTab === 'browse')}
          onClick={() => setActiveTab('browse')}
        >
          📂 Browse Materials ({materials.length})
        </button>
        <button
          style={tabStyles.tab(activeTab === 'upload')}
          onClick={() => setActiveTab('upload')}
        >
          📤 Upload New
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'browse' && (
        <MaterialBrowser
          materials={materials}
          selectedMaterial={selectedMaterial}
          isLoading={isLoading}
          onSelectMaterial={selectMaterial}
          onEditTags={handleEditTags}
          onDelete={deleteMaterial}
          onSendToAI={(material: Material) => {
            selectMaterial(material);
            setShowAIDialog(true);
          }}
        />
      )}

      {activeTab === 'upload' && (
        <MaterialUpload
          onMaterialUploaded={handleMaterialUploaded}
          isLoading={isLoading}
        />
      )}

      {/* Tagger Modal */}
      {showTagger && taggerMaterial && (
        <MaterialTagger
          material={taggerMaterial}
          onSave={handleTagsUpdated}
          onCancel={() => {
            setShowTagger(false);
            setTaggerMaterial(undefined);
          }}
        />
      )}

      {/* AI Writer Dialog */}
      {showAIDialog && selectedMaterial && (
        <AIWriterDialog
          material={selectedMaterial}
          onSend={(_actionType: 'enhance' | 'generate_assignment', options: GenerationOptions) =>
            handleSendToAI(selectedMaterial, options)
          }
          onCancel={() => setShowAIDialog(false)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
