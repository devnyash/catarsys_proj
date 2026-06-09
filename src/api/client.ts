class ApiClient {
  private baseUrl: string;
  private accessToken: string | null;
  private refreshToken: string | null;
  private refreshPromise: Promise<boolean> | null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
    this.refreshPromise = null;
  }

  setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  private async attemptRefresh(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: this.refreshToken }),
        });
        if (response.ok) {
          const result = await response.json();
          const data = result.data || result;
          this.setTokens(data.access_token, data.refresh_token);
          return true;
        }
        this.clearTokens();
        return false;
      } catch {
        this.clearTokens();
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();
    return this.refreshPromise;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: this.getHeaders(),
    };
    if (body !== undefined && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    let response = await fetch(url, options);

    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.attemptRefresh();
      if (refreshed) {
        options.headers = this.getHeaders();
        response = await fetch(url, options);
      }
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message = errorBody?.error?.message || errorBody?.message || `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status, errorBody?.error?.code);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) return undefined as T;

    const result = JSON.parse(text);
    if (result && typeof result === 'object' && 'success' in result) {
      if (!result.success) {
        throw new ApiError(result.error?.message || 'Request failed', response.status, result.error?.code);
      }
      return result.data as T;
    }
    return result as T;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}

class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export { ApiError };
export const api = new ApiClient();
