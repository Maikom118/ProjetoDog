const BASE_URL = 'https://pets-api.delo.dev.br';

export async function apiRequest<T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
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
    const message =
      errorData.message ||
      errorData.title ||
      errorData.error ||
      (typeof errorData === 'string' ? errorData : null) ||
      `HTTP ${response.status}`;
    throw new Error(message);
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
  distanciaKm?: number;
}

export const cuidadoresApi = {
  getAll: () => apiRequest<Cuidador[]>('/api/Cuidadores', 'GET'),
  getById: (id: string) => apiRequest<Cuidador>(`/api/Cuidadores/${id}`, 'GET'),
};

export interface MatchRequest {
  nomePet: string;
  especie: string;
  porte: string;
  cuidadosEspeciais: string;
  descricao: string;
}

export const matchApi = {
  encontrarCuidador: (data: MatchRequest) =>
    apiRequest<Cuidador[]>('/api/Match/encontrar-cuidador', 'POST', data),
};

// ─── Reservas ────────────────────────────────────────────────────────────────

export interface Reserva {
  id: string;
  cuidadorId: string;
  donoId?: string;
  nomePet: string;
  especie: string;
  porte: string;
  cuidadosEspeciais: string;
  descricaoPet: string;
  dataEntrada: string;
  dataSaida: string;
  valorTotal: number;
  status: 'Pendente' | 'Aceito' | 'Recusado';
  cuidadorNome?: string;
  donoNome?: string;
}

export interface CreateReservaRequest {
  cuidadorId: string;
  nomePet: string;
  especie: string;
  porte: string;
  cuidadosEspeciais: string;
  descricaoPet: string;
  dataEntrada: string;
  dataSaida: string;
  valorTotal: number;
}

export const reservasApi = {
  create: (data: CreateReservaRequest) =>
    apiRequest<Reserva>('/api/reservas', 'POST', data),
  getAll: () =>
    apiRequest<Reserva[]>('/api/reservas', 'GET'),
  updateStatus: (id: string, status: Reserva['status']) =>
    apiRequest<Reserva>(`/api/reservas/${id}/status`, 'PATCH', { status }),
};
