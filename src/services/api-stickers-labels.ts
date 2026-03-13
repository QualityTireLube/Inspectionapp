// Separate file for stickers and labels API methods to avoid circular imports
import { axiosInstance } from './api';
import { logout } from '../auth';

// Helper function to handle API errors
const handleApiError = (error: any) => {
  if (error.response?.status === 401) {
    logout();
  }
  console.error('API Error:', error.response?.data || error.message);
};

// ===== STATIC STICKERS API =====

export const getStaticStickers = async (locationFilter?: string, archived?: boolean): Promise<any[]> => {
  try {
    const params = new URLSearchParams();
    if (locationFilter) {
      params.append('location', locationFilter);
    }
    if (archived !== undefined) {
      params.append('archived', archived.toString());
    }
    
    const url = params.toString() ? `/static-stickers?${params.toString()}` : '/static-stickers';
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    console.error('❌ API Error - Get Static Stickers:', error);
    handleApiError(error);
    throw error;
  }
};

export const createStaticSticker = async (sticker: any): Promise<any> => {
  try {
    const response = await axiosInstance.post('/static-stickers', sticker);
    return response.data;
  } catch (error) {
    console.error('❌ API Error - Create Static Sticker:', error);
    handleApiError(error);
    throw error;
  }
};

export const updateStaticSticker = async (id: string, sticker: any): Promise<any> => {
  try {
    const response = await axiosInstance.put(`/static-stickers/${id}`, sticker);
    return response.data;
  } catch (error) {
    console.error('❌ API Error - Update Static Sticker:', error);
    handleApiError(error);
    throw error;
  }
};

export const deleteStaticSticker = async (id: string): Promise<any> => {
  try {
    const response = await axiosInstance.delete(`/static-stickers/${id}`);
    return response.data;
  } catch (error) {
    console.error('❌ API Error - Delete Static Sticker:', error);
    handleApiError(error);
    throw error;
  }
};

export const archiveStaticSticker = async (id: string): Promise<any> => {
  try {
    const response = await axiosInstance.patch(`/static-stickers/${id}/archive`);
    return response.data;
  } catch (error) {
    console.error('❌ API Error - Archive Static Sticker:', error);
    handleApiError(error);
    throw error;
  }
};

export const restoreStaticSticker = async (id: string): Promise<any> => {
  try {
    const response = await axiosInstance.patch(`/static-stickers/${id}/restore`);
    return response.data;
  } catch (error) {
    console.error('❌ API Error - Restore Static Sticker:', error);
    handleApiError(error);
    throw error;
  }
};

// ===== GENERATED LABELS API =====

export const getGeneratedLabels = async (locationFilter?: string): Promise<any[]> => {
  try {
    const url = locationFilter ? `/generated-labels?location=${encodeURIComponent(locationFilter)}` : '/generated-labels';
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    console.error('❌ API Error - Get Generated Labels:', error);
    handleApiError(error);
    throw error;
  }
};

export const createGeneratedLabel = async (label: any): Promise<any> => {
  try {
    const response = await axiosInstance.post('/generated-labels', label);
    return response.data;
  } catch (error) {
    console.error('❌ API Error - Create Generated Label:', error);
    handleApiError(error);
    throw error;
  }
};

export const updateGeneratedLabel = async (id: string, label: any): Promise<any> => {
  try {
    const response = await axiosInstance.put(`/generated-labels/${id}`, label);
    return response.data;
  } catch (error) {
    console.error('❌ API Error - Update Generated Label:', error);
    handleApiError(error);
    throw error;
  }
};

export const deleteGeneratedLabel = async (id: string): Promise<any> => {
  try {
    const response = await axiosInstance.delete(`/generated-labels/${id}`);
    return response.data;
  } catch (error) {
    console.error('❌ API Error - Delete Generated Label:', error);
    handleApiError(error);
    throw error;
  }
};

export const archiveGeneratedLabel = async (id: string, archivedBy: string): Promise<any> => {
  try {
    const response = await axiosInstance.patch(`/generated-labels/${id}/archive`, { archivedBy });
    return response.data;
  } catch (error) {
    console.error('❌ API Error - Archive Generated Label:', error);
    handleApiError(error);
    throw error;
  }
};

export const recordLabelPrint = async (id: string): Promise<any> => {
  try {
    const response = await axiosInstance.patch(`/generated-labels/${id}/print`);
    return response.data;
  } catch (error) {
    console.error('❌ API Error - Record Label Print:', error);
    handleApiError(error);
    throw error;
  }
};

export const updateLabelRestocking = async (id: string, restocking: boolean): Promise<any> => {
  try {
    const response = await axiosInstance.patch(`/generated-labels/${id}/restocking`, { restocking });
    return response.data;
  } catch (error) {
    console.error('❌ API Error - Update Label Restocking:', error);
    handleApiError(error);
    throw error;
  }
};

export const restoreGeneratedLabel = async (id: string): Promise<any> => {
  try {
    const response = await axiosInstance.patch(`/generated-labels/${id}/restore`);
    return response.data;
  } catch (error) {
    console.error('❌ API Error - Restore Generated Label:', error);
    handleApiError(error);
    throw error;
  }
};