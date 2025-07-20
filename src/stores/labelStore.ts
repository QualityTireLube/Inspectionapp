import { create } from 'zustand';
import { LabelTemplate, LabelField, CreateLabelRequest } from '../types/labelTemplates';

interface LabelStore {
  // State
  templates: LabelTemplate[];
  activeTemplate: LabelTemplate | null;
  selectedField: LabelField | null;
  loading: boolean;
  error: string | null;

  // Actions
  setTemplates: (templates: LabelTemplate[]) => void;
  setActiveTemplate: (template: LabelTemplate | null) => void;
  setSelectedField: (field: LabelField | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Template actions
  addTemplate: (template: LabelTemplate) => void;
  updateTemplate: (id: string, updates: Partial<LabelTemplate>) => void;
  removeTemplate: (id: string) => void;
  archiveTemplate: (id: string) => void;
  restoreTemplate: (id: string) => void;
  
  // Field actions
  addField: (field: LabelField) => void;
  updateField: (fieldId: string, updates: Partial<LabelField>) => void;
  removeField: (fieldId: string) => void;
  moveField: (fieldId: string, position: { x: number; y: number }) => void;
  
  // Utility
  getActiveTemplates: () => LabelTemplate[];
  getArchivedTemplates: () => LabelTemplate[];
  clearError: () => void;
}

export const useLabelStore = create<LabelStore>((set, get) => ({
  // Initial state
  templates: [],
  activeTemplate: null,
  selectedField: null,
  loading: false,
  error: null,

  // Basic setters
  setTemplates: (templates) => set({ templates }),
  setActiveTemplate: (template) => set({ activeTemplate: template }),
  setSelectedField: (field) => set({ selectedField: field }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Template actions
  addTemplate: (template) => set((state) => ({
    templates: [...state.templates, template]
  })),

  updateTemplate: (id, updates) => set((state) => ({
    templates: state.templates.map(t => 
      t.id === id ? { ...t, ...updates, updatedDate: new Date().toISOString() } : t
    ),
    activeTemplate: state.activeTemplate?.id === id 
      ? { ...state.activeTemplate, ...updates, updatedDate: new Date().toISOString() }
      : state.activeTemplate
  })),

  removeTemplate: (id) => set((state) => ({
    templates: state.templates.filter(t => t.id !== id),
    activeTemplate: state.activeTemplate?.id === id ? null : state.activeTemplate
  })),

  archiveTemplate: (id) => set((state) => ({
    templates: state.templates.map(t => 
      t.id === id ? { ...t, archived: true, updatedDate: new Date().toISOString() } : t
    )
  })),

  restoreTemplate: (id) => set((state) => ({
    templates: state.templates.map(t => 
      t.id === id ? { ...t, archived: false, updatedDate: new Date().toISOString() } : t
    )
  })),

  // Field actions
  addField: (field) => set((state) => {
    if (!state.activeTemplate) return state;
    
    const updatedTemplate = {
      ...state.activeTemplate,
      fields: [...state.activeTemplate.fields, field],
      updatedDate: new Date().toISOString()
    };

    return {
      activeTemplate: updatedTemplate,
      templates: state.templates.map(t => 
        t.id === state.activeTemplate!.id ? updatedTemplate : t
      )
    };
  }),

  updateField: (fieldId, updates) => set((state) => {
    if (!state.activeTemplate) return state;
    
    const updatedTemplate = {
      ...state.activeTemplate,
      fields: state.activeTemplate.fields.map(f => 
        f.id === fieldId ? { ...f, ...updates } : f
      ),
      updatedDate: new Date().toISOString()
    };

    return {
      activeTemplate: updatedTemplate,
      templates: state.templates.map(t => 
        t.id === state.activeTemplate!.id ? updatedTemplate : t
      ),
      selectedField: state.selectedField?.id === fieldId 
        ? { ...state.selectedField, ...updates }
        : state.selectedField
    };
  }),

  removeField: (fieldId) => set((state) => {
    if (!state.activeTemplate) return state;
    
    const updatedTemplate = {
      ...state.activeTemplate,
      fields: state.activeTemplate.fields.filter(f => f.id !== fieldId),
      updatedDate: new Date().toISOString()
    };

    return {
      activeTemplate: updatedTemplate,
      templates: state.templates.map(t => 
        t.id === state.activeTemplate!.id ? updatedTemplate : t
      ),
      selectedField: state.selectedField?.id === fieldId ? null : state.selectedField
    };
  }),

  moveField: (fieldId, position) => set((state) => {
    if (!state.activeTemplate) return state;
    
    const updatedTemplate = {
      ...state.activeTemplate,
      fields: state.activeTemplate.fields.map(f => 
        f.id === fieldId ? { ...f, position } : f
      ),
      updatedDate: new Date().toISOString()
    };

    return {
      activeTemplate: updatedTemplate,
      templates: state.templates.map(t => 
        t.id === state.activeTemplate!.id ? updatedTemplate : t
      )
    };
  }),

  // Utility functions
  getActiveTemplates: () => get().templates.filter(t => !t.archived),
  getArchivedTemplates: () => get().templates.filter(t => t.archived),
  clearError: () => set({ error: null })
})); 