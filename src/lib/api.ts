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
  fotoUrl?: string;
  distanciaKm?: number;
}

export interface UpdateCuidadorRequest {
  nome: string;
  telefone: string;
  bio: string;
  hourlyRate: number;
  especialidades: string[];
}

export const cuidadoresApi = {
  getAll: () => apiRequest<Cuidador[]>('/api/Cuidadores', 'GET'),
  getById: (id: string) => apiRequest<Cuidador>(`/api/Cuidadores/${id}`, 'GET'),
  updateProfile: (data: UpdateCuidadorRequest) =>
    apiRequest<Cuidador>('/api/Cuidadores/meu-perfil', 'PUT', data),
  uploadFoto: async (file: File): Promise<{ fotoUrl?: string }> => {
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('arquivo', file);
    const response = await fetch(`${BASE_URL}/api/Cuidadores/upload-foto`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || err.title || `HTTP ${response.status}`);
    }
    return response.status === 204 ? {} : response.json();
  },
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
  status: 'Em análise' | 'Aceita' | 'Recusada' | 'Concluida';
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
    apiRequest<Reserva>(`/api/reservas/${id}/status`, 'PATCH', { novoStatus: status }),
};

export interface Avaliacao {
  id: string;
  nota: number;
  comentario: string;
  fotoUrl: string | null;
  nomeDono: string;
  dataCriacao: string;
}

export const avaliacoesApi = {
  getByCuidador: (cuidadorId: string) =>
    apiRequest<Avaliacao[]>(`/api/Avaliacoes/cuidador/${cuidadorId}`, 'GET'),
  create: async (cuidadorId: string, nota: number, comentario: string, foto?: File) => {
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('Nota', String(nota));
    form.append('Comentario', comentario);
    if (foto) form.append('Foto', foto);

    const response = await fetch(`https://pets-api.delo.dev.br/api/Avaliacoes/${cuidadorId}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || err.title || `HTTP ${response.status}`);
    }
    return response.status === 204 ? {} : response.json();
  },
};
