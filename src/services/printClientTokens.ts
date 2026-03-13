import { axiosInstance } from './api';

export interface PrintClientToken {
  id: string;
  name: string;
  token: string;
  token_preview?: string;
  created_by: string;
  created_by_name: string;
  server_url: string;
  email: string;
  role: string;
  user_id: string;
  expires_at: string;
  enabled: boolean;
  last_used?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTokenRequest {
  name: string;
  serverUrl: string;
  email: string;
  password: string;
}

export interface UpdateTokenRequest {
  name?: string;
  enabled?: boolean;
}

export interface TokenResponse {
  id: string;
  name: string;
  token: string;
  serverUrl: string;
  email: string;
  expiresAt: string;
  enabled: boolean;
  message: string;
}

class PrintClientTokenService {
  private baseURL = '/print-client-tokens';

  async getTokens(): Promise<PrintClientToken[]> {
    try {
      const response = await axiosInstance.get(this.baseURL);
      return response.data;
    } catch (error) {
      console.error('Error fetching print client tokens:', error);
      throw error;
    }
  }

  async createToken(tokenData: CreateTokenRequest): Promise<TokenResponse> {
    try {
      const response = await axiosInstance.post(this.baseURL, tokenData);
      return response.data;
    } catch (error) {
      console.error('Error creating print client token:', error);
      throw error;
    }
  }

  async updateToken(id: string, updates: UpdateTokenRequest): Promise<{ message: string }> {
    try {
      const response = await axiosInstance.put(`${this.baseURL}/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating print client token:', error);
      throw error;
    }
  }

  async deleteToken(id: string): Promise<{ message: string }> {
    try {
      const response = await axiosInstance.delete(`${this.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting print client token:', error);
      throw error;
    }
  }

  async getTokenDetails(id: string): Promise<{
    id: string;
    name: string;
    token: string;
    serverUrl: string;
    email: string;
    enabled: boolean;
  }> {
    try {
      const response = await axiosInstance.get(`${this.baseURL}/${id}/token`);
      return response.data;
    } catch (error) {
      console.error('Error fetching token details:', error);
      throw error;
    }
  }

  async disableToken(id: string): Promise<{ message: string }> {
    return this.updateToken(id, { enabled: false });
  }

  async enableToken(id: string): Promise<{ message: string }> {
    return this.updateToken(id, { enabled: true });
  }
}

export default new PrintClientTokenService();
