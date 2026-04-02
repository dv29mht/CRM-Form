import api from './client';

export interface AuthResponse {
  token: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export const login = (email: string, password: string) =>
  api.post<AuthResponse>('/auth/login', { email, password });

export const register = (email: string, password: string, firstName?: string, lastName?: string) =>
  api.post<AuthResponse>('/auth/register', { email, password, firstName, lastName });
