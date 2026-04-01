const CHAT_STORAGE_PREFIX = 'petconnect-chat-history';
const CHAT_STORAGE_VERSION = 'v2';

function stripEmoji(s: string): string {
  return s.replace(/^[^\s]+\s/, '').trim();
}

function decodeTokenPayload(): Record<string, unknown> | null {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function getLegacyKey(): string {
  const payload = decodeTokenPayload();
  if (!payload) return `${CHAT_STORAGE_PREFIX}:guest`;
  const userId =
    payload.sub ||
    payload.userId ||
    payload.user_id ||
    payload.nameid ||
    payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
    payload.email ||
    payload.unique_name ||
    payload.name;
  return `${CHAT_STORAGE_PREFIX}:${String(userId ?? 'guest')}`;
}

export function getChatStorageKey(): string {
  return `${getLegacyKey()}:${CHAT_STORAGE_VERSION}`;
}

export function getUserId(): string | null {
  const payload = decodeTokenPayload();
  if (!payload) return null;
  return (
    (payload.sub as string) ||
    (payload.userId as string) ||
    (payload.user_id as string) ||
    (payload.nameid as string) ||
    (payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] as string) ||
    (payload.email as string) ||
    (payload.unique_name as string) ||
    (payload.name as string) ||
    null
  );
}

export interface StoredPetData {
  petName: string;
  petType: string;   // sem emoji: "Cachorro" / "Gato"
  petSize: string;   // sem emoji: "Pequeno" / "Médio" / "Grande"
  specialCareDesc: string;
  petBehavior: string;
  dataEntrada: string | null;  // ISO string ou null
  dataSaida: string | null;    // ISO string ou null
}

const PET_SNAPSHOT_SUFFIX = ':pet-snapshot';

export function savePetDataSnapshot(data: StoredPetData): void {
  try {
    localStorage.setItem(getLegacyKey() + PET_SNAPSHOT_SUFFIX, JSON.stringify(data));
  } catch {}
}

export function getPetData(): StoredPetData | null {
  // Check snapshot first (saved after flow completes)
  try {
    const raw = localStorage.getItem(getLegacyKey() + PET_SNAPSHOT_SUFFIX);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredPetData;
      if (parsed.petName !== undefined) return parsed;
    }
  } catch {}

  // Fall back to live flow state
  try {
    const raw = localStorage.getItem(getChatStorageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const flow = parsed.flow;
    if (!flow) return null;
    return {
      petName: flow.petName ?? '',
      petType: flow.petType ? stripEmoji(flow.petType) : '',
      petSize: flow.petSize ? stripEmoji(flow.petSize) : '',
      specialCareDesc: flow.specialCareDesc ?? '',
      petBehavior: flow.petBehavior ?? '',
      dataEntrada: flow.dataEntrada ?? null,
      dataSaida: flow.dataSaida ?? null,
    };
  } catch {
    return null;
  }
}

export function clearDatesFromStorage(): void {
  try {
    const key = getChatStorageKey();
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.flow) {
      parsed.flow.dataEntrada = null;
      parsed.flow.dataSaida = null;
    }
    localStorage.setItem(key, JSON.stringify(parsed));
  } catch { /* noop */ }
}
