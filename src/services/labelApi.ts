import axios from 'axios';
import { LabelTemplate, CreateLabelRequest, UpdateLabelRequest } from '../types/labelTemplates';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  `${window.location.protocol === 'https:' ? 'https' : 'http'}://${window.location.hostname}:5001`;

// Create axios instance with auth header
const createAuthenticatedAxios = () => {
  const token = localStorage.getItem('token');
  return axios.create({
    baseURL: `${API_BASE_URL}/api/labels`,
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    }
  });
};

export class LabelApiService {
  // Get all templates
  static async getAllTemplates(archived?: boolean): Promise<LabelTemplate[]> {
    try {
      const api = createAuthenticatedAxios();
      const params = archived !== undefined ? { archived: archived.toString() } : {};
      const response = await api.get('/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw this.handleError(error);
    }
  }

  // Get active templates
  static async getActiveTemplates(): Promise<LabelTemplate[]> {
    return this.getAllTemplates(false);
  }

  // Get archived templates
  static async getArchivedTemplates(): Promise<LabelTemplate[]> {
    return this.getAllTemplates(true);
  }

  // Get template by ID
  static async getTemplate(id: string): Promise<LabelTemplate> {
    try {
      const api = createAuthenticatedAxios();
      const response = await api.get(`/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching template:', error);
      throw this.handleError(error);
    }
  }

  // Create new template
  static async createTemplate(template: CreateLabelRequest): Promise<LabelTemplate> {
    try {
      const api = createAuthenticatedAxios();
      const response = await api.post('/', template);
      return response.data;
    } catch (error) {
      console.error('Error creating template:', error);
      throw this.handleError(error);
    }
  }

  // Update template
  static async updateTemplate(id: string, updates: Partial<UpdateLabelRequest>): Promise<LabelTemplate> {
    try {
      const api = createAuthenticatedAxios();
      const response = await api.put(`/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating template:', error);
      throw this.handleError(error);
    }
  }

  // Archive template
  static async archiveTemplate(id: string): Promise<void> {
    try {
      const api = createAuthenticatedAxios();
      await api.delete(`/${id}`);
    } catch (error) {
      console.error('Error archiving template:', error);
      throw this.handleError(error);
    }
  }

  // Permanently delete template
  static async deleteTemplate(id: string): Promise<void> {
    try {
      const api = createAuthenticatedAxios();
      await api.delete(`/${id}`, { params: { permanent: 'true' } });
    } catch (error) {
      console.error('Error deleting template:', error);
      throw this.handleError(error);
    }
  }

  // Restore archived template
  static async restoreTemplate(id: string): Promise<LabelTemplate> {
    try {
      const api = createAuthenticatedAxios();
      const response = await api.post(`/${id}/restore`);
      return response.data;
    } catch (error) {
      console.error('Error restoring template:', error);
      throw this.handleError(error);
    }
  }

  // Duplicate template
  static async duplicateTemplate(id: string, createdBy: string): Promise<LabelTemplate> {
    try {
      const api = createAuthenticatedAxios();
      const response = await api.post(`/${id}/duplicate`, { createdBy });
      return response.data;
    } catch (error) {
      console.error('Error duplicating template:', error);
      throw this.handleError(error);
    }
  }

  // Error handler
  private static handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error || error.message || 'An error occurred';
      return new Error(message);
    }
    return error instanceof Error ? error : new Error('An unknown error occurred');
  }
}

// Export default instance
export default LabelApiService; 