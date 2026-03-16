const BASE_URL = 'https://pets-api.delo.dev.br';

export async function apiRequest<T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  headers: Record<string, string> = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || response.statusText || 'Erro na requisição');
  }

  // Handle empty response for 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const authApi = {
  login: (data: any) => apiRequest<{ token: string }>('/api/Auth/login', 'POST', data),
  registerDono: (data: any) => apiRequest('/api/Auth/register-dono', 'POST', data),
  registerCuidador: (data: any) => apiRequest('/api/Auth/register-cuidador', 'POST', data),
};

// API de Cuidadores
export interface CuidadorEndereco {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface Cuidador {
  id: string;
  nome: string;
  valorDiaria: number;
  endereco: CuidadorEndereco;
  telefone: string;
  email: string;
  especialidades: string[];
  bio: string;
}

export const cuidadoresApi = {
  getAll: () => apiRequest<Cuidador[]>('/api/Cuidadores', 'GET'),
  getById: (id: string) => apiRequest<Cuidador>(`/api/Cuidadores/${id}`, 'GET'),
};