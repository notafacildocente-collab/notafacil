import * as SecureStore from 'expo-secure-store';
import { cerrarSesionGlobal } from './auth';

const API_URL = 'https://notafacil-backend-539h.onrender.com';

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await SecureStore.getItemAsync('accessToken');

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    cerrarSesionGlobal();
    throw new Error('Sesión vencida');
  }

  return response;
}
