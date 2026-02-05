import { useState, useCallback } from 'react';
import { Material, MaterialsHubState, AIWriterAction } from '../types/materials';

const initialState: MaterialsHubState = {
  materials: [],
  selectedAction: 'browse',
  isLoading: false,
  error: undefined,
};

export function useMaterialsHub() {
  const [state, setState] = useState<MaterialsHubState>(initialState);

  const addMaterial = useCallback((material: Material) => {
    setState(prev => ({
      ...prev,
      materials: [...prev.materials, material],
      error: undefined,
    }));
  }, []);

  const updateMaterial = useCallback((materialId: string, updates: Partial<Material>) => {
    setState(prev => ({
      ...prev,
      materials: prev.materials.map(m => m.id === materialId ? { ...m, ...updates } : m),
      error: undefined,
    }));
  }, []);

  const deleteMaterial = useCallback((materialId: string) => {
    setState(prev => ({
      ...prev,
      materials: prev.materials.filter(m => m.id !== materialId),
      selectedMaterial: prev.selectedMaterial?.id === materialId ? undefined : prev.selectedMaterial,
    }));
  }, []);

  const selectMaterial = useCallback((material: Material | undefined) => {
    setState(prev => ({
      ...prev,
      selectedMaterial: material,
    }));
  }, []);

  const setAction = useCallback((action: MaterialsHubState['selectedAction']) => {
    setState(prev => ({
      ...prev,
      selectedAction: action,
    }));
  }, []);

  const sendToAIWriter = useCallback(async (_action: AIWriterAction) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      // TODO: Implement API call to AI writer service
      // For now, just show success
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: undefined,
      }));


    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send to AI Writer';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const setLoading = useCallback((isLoading: boolean, error?: string) => {
    setState(prev => ({ ...prev, isLoading, error }));
  }, []);

  return {
    // State
    materials: state.materials,
    selectedMaterial: state.selectedMaterial,
    selectedAction: state.selectedAction,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    addMaterial,
    updateMaterial,
    deleteMaterial,
    selectMaterial,
    setAction,
    sendToAIWriter,
    setLoading,
  };
}
