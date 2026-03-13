// Browser-compatible print server authentication
export interface BrowserPrintAuthCredentials {
  email: string;
  password: string;
}

export interface BrowserPrintAuthResponse {
  token: string;
  email: string;
  role: string;
  userId: string;
  tokenType?: string;
  expiresIn?: number;
}

export interface BrowserTokenData {
  token: string;
  email: string;
  role: string;
  userId: string;
  tokenType: string;
  expiresAt: string;
  createdAt: string;
}

export class BrowserPrintAuthClient {
  private serverUrl: string;
  private tokenData: BrowserTokenData | null = null;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  async login(credentials: BrowserPrintAuthCredentials, clearToken: boolean = false): Promise<BrowserPrintAuthResponse> {
    try {
      // Clear existing token if requested
      if (clearToken) {
        this.clearToken();
      }

      // Check if we already have a valid token
      if (!clearToken && this.isAuthenticated()) {
        console.log('🔄 Reusing valid token for print server authentication');
        return {
          token: this.tokenData!.token,
          email: this.tokenData!.email,
          role: this.tokenData!.role,
          userId: this.tokenData!.userId,
          tokenType: this.tokenData!.tokenType,
        };
      }

      console.log('🚀 Authenticating with print server:', this.serverUrl);
      
      const loginUrl = `${this.serverUrl}/api/login`;
      
      // Use fetch instead of axios for better browser compatibility
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email.toLowerCase().trim(),
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid email or password');
        } else if (response.status === 429) {
          throw new Error('Too many login attempts. Please try again later.');
        } else {
          throw new Error(`Login failed with status ${response.status}`);
        }
      }

      const loginData: BrowserPrintAuthResponse = await response.json();
      
      // Calculate expiration time
      const expiresIn = loginData.expiresIn || 3600; // Default 1 hour
      const expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();
      
      // Store token data
      this.tokenData = {
        token: loginData.token,
        email: loginData.email,
        role: loginData.role,
        userId: loginData.userId,
        tokenType: loginData.tokenType || 'Bearer',
        expiresAt,
        createdAt: new Date().toISOString(),
      };

      // Save to localStorage for persistence
      this.saveToken();

      console.log('✅ Print server authentication successful for:', loginData.email);
      
      return loginData;

    } catch (error) {
      if (error instanceof Error) {
        console.error('❌ Print server authentication failed:', error.message);
        throw error;
      } else {
        const errorMsg = 'Unknown authentication error';
        console.error('❌ Print server authentication failed:', errorMsg);
        throw new Error(errorMsg);
      }
    }
  }

  isAuthenticated(): boolean {
    if (!this.tokenData) {
      this.loadToken();
    }

    if (!this.tokenData) {
      return false;
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(this.tokenData.expiresAt);
    
    if (now >= expiresAt) {
      console.log('🔒 Token has expired');
      this.clearToken();
      return false;
    }

    return true;
  }

  getToken(): string | null {
    if (!this.isAuthenticated()) {
      return null;
    }
    return this.tokenData!.token;
  }

  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    if (!token) {
      return {};
    }

    const tokenType = this.tokenData?.tokenType || 'Bearer';
    return {
      'Authorization': `${tokenType} ${token}`
    };
  }

  getUserInfo(): any | null {
    if (!this.isAuthenticated()) {
      return null;
    }

    return {
      email: this.tokenData!.email,
      role: this.tokenData!.role,
      userId: this.tokenData!.userId,
      serverUrl: this.serverUrl,
    };
  }

  getTokenInfo(): { isValid: boolean; expiresAt: Date | null; timeUntilExpiration: number | null } {
    if (!this.tokenData) {
      this.loadToken();
    }

    if (!this.tokenData) {
      return {
        isValid: false,
        expiresAt: null,
        timeUntilExpiration: null,
      };
    }

    const expiresAt = new Date(this.tokenData.expiresAt);
    const now = new Date();
    const timeUntilExpiration = expiresAt.getTime() - now.getTime();
    const isValid = timeUntilExpiration > 0;

    return {
      isValid,
      expiresAt: isValid ? expiresAt : null,
      timeUntilExpiration: isValid ? timeUntilExpiration : null,
    };
  }

  clearToken(): void {
    this.tokenData = null;
    localStorage.removeItem('print-server-token');
    console.log('🔐 Print server token cleared');
  }

  private saveToken(): void {
    if (this.tokenData) {
      localStorage.setItem('print-server-token', JSON.stringify(this.tokenData));
    }
  }

  private loadToken(): void {
    try {
      const tokenStr = localStorage.getItem('print-server-token');
      if (tokenStr) {
        this.tokenData = JSON.parse(tokenStr);
      }
    } catch (error) {
      console.error('Failed to load token from localStorage:', error);
      this.tokenData = null;
    }
  }
} 