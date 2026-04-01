# Sistema de Reservas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o fluxo completo de reservas: coleta de datas no chat, popup de revisão/confirmação no perfil do cuidador, e aba de reservas para donos e cuidadores.

**Architecture:** Os dados do pet já coletados no chat (persistidos no localStorage) são estendidos com datas de entrada/saída. O popup de revisão lê esses dados, calcula o total e envia para a API. A aba de reservas filtra client-side pelo ID do usuário extraído do JWT.

**Tech Stack:** React 18 + TypeScript, Tailwind CSS, Radix UI (Dialog, Popover, Calendar), date-fns 3.6, Vite

---

## File Map

| Status | Arquivo | Responsabilidade |
|--------|---------|-----------------|
| Modify | `src/lib/api.ts` | Adicionar `Reserva`, `CreateReservaRequest`, `reservasApi` |
| Create | `src/lib/chatStorage.ts` | Utilitário compartilhado: chave do localStorage, leitura de dados do pet, getUserId |
| Modify | `src/app/components/Dashboard.tsx` | Adicionar passos `checkin_date`/`checkout_date` no chat + aba bookings |
| Create | `src/app/components/ReservationCard.tsx` | Card de reserva (compartilhado dono/cuidador) |
| Create | `src/app/components/ReservationReviewDialog.tsx` | Popup de revisão com date pickers e cálculo de total |
| Create | `src/app/components/ReservationConfirmDialog.tsx` | Popup de confirmação pós-envio |
| Modify | `src/app/components/CaregiverProfile.tsx` | Conectar botão "Solicitar Orçamento" aos dialogs |
| Modify | `src/app/App.tsx` | Suporte a `initialTab` no Dashboard + prop `onGoToBookings` |

---

## Task 1: Adicionar types e reservasApi ao api.ts

**Files:**
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Ler o arquivo atual**

  ```bash
  # Verificar o final do arquivo para saber onde inserir
  # O arquivo termina em: export const matchApi = { ... }
  ```

- [ ] **Step 2: Adicionar ao final de `src/lib/api.ts`**

  ```typescript
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
    updateStatus: (id: string, status: string) =>
      apiRequest<Reserva>(`/api/reservas/${id}/status`, 'PATCH', { status }),
  };
  ```

- [ ] **Step 3: Verificar compilação**

  ```bash
  cd "C:\Users\alexs\OneDrive\Desktop\Projeto dog\ProjetoDog"
  npx tsc --noEmit
  ```
  Esperado: sem erros de tipo.

- [ ] **Step 4: Commit**

  ```bash
  git add src/lib/api.ts
  git commit -m "feat: add Reserva types and reservasApi"
  ```

---

## Task 2: Criar utilitário compartilhado de storage

**Files:**
- Create: `src/lib/chatStorage.ts`

Este arquivo centraliza a lógica de chave do localStorage (atualmente duplicada em Dashboard.tsx) e expõe helpers para leitura de dados do pet e ID do usuário.

- [ ] **Step 1: Criar `src/lib/chatStorage.ts`**

  ```typescript
  const CHAT_STORAGE_PREFIX = 'petconnect-chat-history';
  const CHAT_STORAGE_VERSION = 'v2';

  function stripEmoji(s: string): string {
    return s.replace(/^[^\s]+\s/, '').trim();
  }

  function getLegacyKey(): string {
    const token = localStorage.getItem('token');
    if (!token) return `${CHAT_STORAGE_PREFIX}:guest`;
    try {
      const payload = JSON.parse(
        atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      const userId =
        payload.sub ||
        payload.userId ||
        payload.user_id ||
        payload.email ||
        payload.unique_name ||
        payload.name;
      return `${CHAT_STORAGE_PREFIX}:${String(userId ?? 'guest')}`;
    } catch {
      return `${CHAT_STORAGE_PREFIX}:guest`;
    }
  }

  export function getChatStorageKey(): string {
    return `${getLegacyKey()}:${CHAT_STORAGE_VERSION}`;
  }

  export function getUserId(): string | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(
        atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      return (
        payload.sub ||
        payload.userId ||
        payload.user_id ||
        payload.nameid ||
        payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
        null
      );
    } catch {
      return null;
    }
  }

  export interface StoredPetData {
    petName: string;
    petType: string;   // já sem emoji: "Cachorro" / "Gato"
    petSize: string;   // já sem emoji: "Pequeno" / "Médio" / "Grande"
    specialCareDesc: string;
    petBehavior: string;
    dataEntrada: string | null;  // ISO string ou null
    dataSaida: string | null;    // ISO string ou null
  }

  export function getPetData(): StoredPetData | null {
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
  ```

- [ ] **Step 2: Verificar compilação**

  ```bash
  npx tsc --noEmit
  ```
  Esperado: sem erros.

- [ ] **Step 3: Commit**

  ```bash
  git add src/lib/chatStorage.ts
  git commit -m "feat: add shared chat storage utility"
  ```

---

## Task 3: Adicionar passos de data ao chat no Dashboard.tsx

**Files:**
- Modify: `src/app/components/Dashboard.tsx`

Esta task modifica o `ChatWidget` para incluir dois novos passos (`checkin_date`, `checkout_date`) e persistir as datas no FlowState. Também migra para usar `getChatStorageKey` do utilitário compartilhado.

- [ ] **Step 1: Atualizar imports no topo de Dashboard.tsx**

  Adicionar ao bloco de imports existente:
  ```typescript
  import { getChatStorageKey } from '../../lib/chatStorage';
  ```

- [ ] **Step 2: Substituir as constantes de prefixo/versão no Dashboard.tsx**

  Remover as linhas:
  ```typescript
  const CHAT_STORAGE_PREFIX = 'petconnect-chat-history';
  const CHAT_STORAGE_VERSION = 'v2';
  ```
  E remover as funções `getLegacyChatStorageKey()` e `getChatStorageKey()` do Dashboard.tsx (agora vêm do utilitário).

  Atualizar as 3 funções que usavam essas constantes para usar o import:
  - `loadPersistedChatState`: trocar `getChatStorageKey()` → já é o mesmo nome, funciona.
  - `persistChatState`: idem.
  - `clearPersistedChatState`: trocar `getLegacyChatStorageKey()` → não existe mais aqui. Simplificar:
    ```typescript
    function clearPersistedChatState() {
      try {
        localStorage.removeItem(getChatStorageKey());
      } catch { /* noop */ }
    }
    ```

- [ ] **Step 3: Estender FlowStep e FlowState**

  Substituir:
  ```typescript
  type FlowStep = 'pet_name' | 'pet_type' | 'pet_size' | 'special_care' | 'special_care_desc' | 'pet_behavior';

  interface FlowState {
    step: FlowStep;
    petName?: string;
    petType?: string;
    petSize?: string;
    specialCare?: boolean;
    specialCareDesc?: string;
  }
  ```
  Por:
  ```typescript
  type FlowStep =
    | 'pet_name'
    | 'pet_type'
    | 'pet_size'
    | 'special_care'
    | 'special_care_desc'
    | 'pet_behavior'
    | 'checkin_date'
    | 'checkout_date';

  interface FlowState {
    step: FlowStep;
    petName?: string;
    petType?: string;
    petSize?: string;
    specialCare?: boolean;
    specialCareDesc?: string;
    petBehavior?: string;
    dataEntrada?: string;
    dataSaida?: string;
  }
  ```

- [ ] **Step 4: Adicionar prompts para os novos passos em FLOW_PROMPTS**

  Adicionar ao objeto `FLOW_PROMPTS` (após `pet_behavior`):
  ```typescript
  checkin_date: [
    '📅 Quando seu pet vai precisar do cuidador? Selecione a **data de entrada**!',
    '📅 Ótimo! Agora me diz: qual é a **data de entrada** do seu pet?',
    '📅 Estamos quase lá! Selecione a **data em que o pet chega** ao cuidador.',
    '📅 Perfeito! Agora escolha a **data de início** da estadia.',
  ],
  checkout_date: [
    '📅 E quando ele volta pra casa? Selecione a **data de saída**!',
    '📅 Ótimo! Agora me diz a **data de saída** — quando seu pet vai embora.',
    '📅 Quase pronto! Selecione a **data em que o pet retorna** pra você.',
    '📅 Última etapa! Quando seu pet volta? Escolha a **data de saída**.',
  ],
  ```

- [ ] **Step 5: Adicionar `DATE_STEPS` e `dateInput` state**

  Após as declarações de `INPUT_STEPS` e `BUTTON_STEPS`, adicionar:
  ```typescript
  const DATE_STEPS: FlowStep[] = ['checkin_date', 'checkout_date'];
  ```

  Dentro do `ChatWidget`, após o `useState` de `postAction`, adicionar:
  ```typescript
  const [dateInput, setDateInput] = useState('');
  const today = new Date().toISOString().split('T')[0];
  ```

- [ ] **Step 6: Modificar `handleFlowInput` — passo `pet_behavior` deve avançar para `checkin_date`**

  Substituir o bloco:
  ```typescript
  if (flow.step === 'pet_behavior') {
    finishFlow({ ...flow, step: 'pet_behavior' }, trimmed);
  }
  ```
  Por:
  ```typescript
  if (flow.step === 'pet_behavior') {
    const next: FlowState = { ...flow, step: 'checkin_date', petBehavior: trimmed };
    setFlow(next);
    addBotMessage(pickRandom(FLOW_PROMPTS.checkin_date));
  }
  ```

- [ ] **Step 7: Adicionar `handleDateSubmit`**

  Após `handleFlowInput`, adicionar:
  ```typescript
  function formatDatePtBR(dateStr: string): string {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  const handleDateSubmit = () => {
    if (!flow || !dateInput) return;
    const isoDate = new Date(dateInput + 'T12:00:00').toISOString();

    if (flow.step === 'checkin_date') {
      addUserMessage(`📅 ${formatDatePtBR(dateInput)}`);
      setDateInput('');
      setFlow({ ...flow, step: 'checkout_date', dataEntrada: isoDate });
      addBotMessage(pickRandom(FLOW_PROMPTS.checkout_date));
    } else if (flow.step === 'checkout_date') {
      addUserMessage(`📅 ${formatDatePtBR(dateInput)}`);
      setDateInput('');
      finishFlow({ ...flow, dataSaida: isoDate });
    }
  };
  ```

- [ ] **Step 8: Modificar assinatura e corpo de `finishFlow`**

  Substituir a assinatura atual:
  ```typescript
  const finishFlow = async (currentFlow: FlowState, behavior: string) => {
    const { petName, petType, petSize, specialCareDesc } = currentFlow;
  ```
  Por:
  ```typescript
  const finishFlow = async (currentFlow: FlowState) => {
    const { petName, petType, petSize, specialCareDesc, petBehavior } = currentFlow;
  ```

  E no corpo, substituir a referência a `behavior` por `petBehavior`:
  - No `requestBody`, trocar `descricao: behavior` por `descricao: petBehavior ?? ''`
  - Na mensagem do bot com `${displayName}`, a variável `displayName` continua igual.

- [ ] **Step 9: Adicionar renderização do date input no chat**

  Após o bloco de `{/* Text input */}` (linha ~649), adicionar:
  ```tsx
  {/* Date input — shown for checkin_date, checkout_date */}
  {flow && DATE_STEPS.includes(flow.step) && !typing && (
    <div className="px-3 pb-3 pt-2 bg-white rounded-b-2xl border-t border-gray-100">
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={dateInput}
          min={
            flow.step === 'checkout_date' && flow.dataEntrada
              ? flow.dataEntrada.split('T')[0]
              : today
          }
          onChange={(e) => setDateInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleDateSubmit()}
          className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-sm border border-gray-200 outline-none focus:border-orange-400 text-gray-700"
        />
        <button
          onClick={handleDateSubmit}
          disabled={!dateInput}
          className="w-8 h-8 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  )}
  ```

- [ ] **Step 10: Verificar compilação**

  ```bash
  npx tsc --noEmit
  ```
  Esperado: sem erros.

- [ ] **Step 11: Testar manualmente**
  - Abrir o chat, clicar em "Encontrar cuidador"
  - Preencher todos os passos até "comportamento"
  - Confirmar que aparece o input de data para "entrada"
  - Selecionar data de entrada, confirmar que aparece input de "saída"
  - Selecionar data de saída, confirmar que o bot inicia a busca de cuidadores

- [ ] **Step 12: Commit**

  ```bash
  git add src/app/components/Dashboard.tsx src/lib/chatStorage.ts
  git commit -m "feat: add checkin/checkout date steps to chat flow"
  ```

---

## Task 4: Criar ReservationCard.tsx

**Files:**
- Create: `src/app/components/ReservationCard.tsx`

- [ ] **Step 1: Criar o arquivo**

  ```tsx
  import { format, differenceInDays, parseISO } from 'date-fns';
  import { ptBR } from 'date-fns/locale';
  import { Calendar, User, PawPrint } from 'lucide-react';
  import { Button } from './ui/button';
  import { Reserva } from '../../lib/api';

  const STATUS_STYLES: Record<string, string> = {
    Pendente: 'bg-yellow-100 text-yellow-800',
    Aceito:   'bg-green-100 text-green-800',
    Recusado: 'bg-red-100 text-red-800',
  };

  interface ReservationCardProps {
    reserva: Reserva;
    role: 'dono' | 'cuidador';
    onAccept?: (id: string) => void;
    onReject?: (id: string) => void;
  }

  export function ReservationCard({ reserva, role, onAccept, onReject }: ReservationCardProps) {
    const entrada = parseISO(reserva.dataEntrada);
    const saida = parseISO(reserva.dataSaida);
    const dias = differenceInDays(saida, entrada);
    const statusStyle = STATUS_STYLES[reserva.status] ?? 'bg-gray-100 text-gray-700';

    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
        {/* Header: pet + status */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <PawPrint className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <span className="font-semibold text-gray-900">{reserva.nomePet}</span>
            <span className="text-sm text-gray-400">
              · {reserva.especie} · {reserva.porte}
            </span>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusStyle}`}>
            {reserva.status}
          </span>
        </div>

        {/* Cuidados especiais */}
        {reserva.cuidadosEspeciais && (
          <p className="text-sm text-gray-600">
            <span className="font-medium">Cuidados especiais:</span>{' '}
            {reserva.cuidadosEspeciais}
          </p>
        )}

        {/* Período */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span>
            {format(entrada, 'dd/MM/yyyy', { locale: ptBR })}
            {' → '}
            {format(saida, 'dd/MM/yyyy', { locale: ptBR })}
          </span>
          <span className="text-gray-400">
            ({dias} dia{dias !== 1 ? 's' : ''})
          </span>
        </div>

        {/* Cuidador (visível para o dono) */}
        {role === 'dono' && reserva.cuidadorNome && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4 flex-shrink-0" />
            <span>
              Cuidador:{' '}
              <span className="font-medium">{reserva.cuidadorNome}</span>
            </span>
          </div>
        )}

        {/* Dono (visível para o cuidador) */}
        {role === 'cuidador' && reserva.donoNome && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4 flex-shrink-0" />
            <span>
              Dono:{' '}
              <span className="font-medium">{reserva.donoNome}</span>
            </span>
          </div>
        )}

        {/* Footer: total + ações */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <span className="font-bold text-orange-600 text-lg">
            R${' '}
            {reserva.valorTotal.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>

          {role === 'cuidador' && reserva.status === 'Pendente' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => onReject?.(reserva.id)}
              >
                Recusar
              </Button>
              <Button
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => onAccept?.(reserva.id)}
              >
                Aceitar
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Verificar compilação**

  ```bash
  npx tsc --noEmit
  ```
  Esperado: sem erros.

- [ ] **Step 3: Commit**

  ```bash
  git add src/app/components/ReservationCard.tsx
  git commit -m "feat: add ReservationCard component"
  ```

---

## Task 5: Criar ReservationReviewDialog.tsx

**Files:**
- Create: `src/app/components/ReservationReviewDialog.tsx`

- [ ] **Step 1: Criar o arquivo**

  ```tsx
  import { useState, useEffect } from 'react';
  import { format, differenceInDays, parseISO, isBefore, startOfDay } from 'date-fns';
  import { ptBR } from 'date-fns/locale';
  import { CalendarIcon } from 'lucide-react';
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
  } from './ui/dialog';
  import { Button } from './ui/button';
  import { Calendar } from './ui/calendar';
  import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
  import { toast } from 'sonner';
  import { Cuidador, CreateReservaRequest, reservasApi, Reserva } from '../../lib/api';
  import { getPetData, clearDatesFromStorage } from '../../lib/chatStorage';

  interface ReservationReviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cuidador: Cuidador;
    onConfirmed: (reserva: Reserva) => void;
  }

  export function ReservationReviewDialog({
    open,
    onOpenChange,
    cuidador,
    onConfirmed,
  }: ReservationReviewDialogProps) {
    const petData = getPetData();
    const hasPetData = !!(petData?.petName);

    const [dataEntrada, setDataEntrada] = useState<Date | undefined>(() => {
      if (petData?.dataEntrada) return parseISO(petData.dataEntrada);
      return undefined;
    });
    const [dataSaida, setDataSaida] = useState<Date | undefined>(() => {
      if (petData?.dataSaida) return parseISO(petData.dataSaida);
      return undefined;
    });
    const [loading, setLoading] = useState(false);

    // Recalculate when dialog opens
    useEffect(() => {
      if (open && petData) {
        if (petData.dataEntrada) setDataEntrada(parseISO(petData.dataEntrada));
        if (petData.dataSaida) setDataSaida(parseISO(petData.dataSaida));
      }
    }, [open]);

    const dias =
      dataEntrada && dataSaida
        ? differenceInDays(dataSaida, dataEntrada)
        : 0;

    const valorTotal = dias > 0 ? dias * cuidador.valorDiaria : 0;

    const canConfirm =
      hasPetData &&
      dataEntrada &&
      dataSaida &&
      dias > 0;

    const handleConfirm = async () => {
      if (!canConfirm || !dataEntrada || !dataSaida || !petData) return;
      setLoading(true);
      try {
        const body: CreateReservaRequest = {
          cuidadorId: cuidador.id,
          nomePet: petData.petName,
          especie: petData.petType,
          porte: petData.petSize,
          cuidadosEspeciais: petData.specialCareDesc,
          descricaoPet: petData.petBehavior,
          dataEntrada: dataEntrada.toISOString(),
          dataSaida: dataSaida.toISOString(),
          valorTotal,
        };
        const reserva = await reservasApi.create(body);
        clearDatesFromStorage();
        onConfirmed(reserva);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao criar reserva';
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    const today = startOfDay(new Date());

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revise sua solicitação</DialogTitle>
          </DialogHeader>

          {!hasPetData ? (
            <div className="py-6 text-center text-gray-500 text-sm">
              <p>Converse com nosso assistente primeiro para preencher os dados do seu pet.</p>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              {/* Dados do Pet */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Dados do Pet
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm text-gray-700">
                  <p><span className="font-medium">Nome:</span> {petData.petName}</p>
                  <p><span className="font-medium">Espécie:</span> {petData.petType}</p>
                  <p><span className="font-medium">Porte:</span> {petData.petSize}</p>
                  {petData.specialCareDesc && (
                    <p><span className="font-medium">Cuidados especiais:</span> {petData.specialCareDesc}</p>
                  )}
                  {petData.petBehavior && (
                    <p><span className="font-medium">Comportamento:</span> {petData.petBehavior}</p>
                  )}
                </div>
              </section>

              {/* Período */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Período da Estadia
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Data de entrada */}
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Entrada</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dataEntrada
                            ? format(dataEntrada, 'dd/MM/yyyy', { locale: ptBR })
                            : 'Selecionar'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dataEntrada}
                          onSelect={(d) => {
                            setDataEntrada(d);
                            if (d && dataSaida && !isBefore(d, dataSaida)) {
                              setDataSaida(undefined);
                            }
                          }}
                          disabled={(date) => isBefore(date, today)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Data de saída */}
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Saída</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dataSaida
                            ? format(dataSaida, 'dd/MM/yyyy', { locale: ptBR })
                            : 'Selecionar'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dataSaida}
                          onSelect={setDataSaida}
                          disabled={(date) =>
                            isBefore(date, dataEntrada ?? today) ||
                            date.getTime() === (dataEntrada?.getTime() ?? 0)
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {dias > 0 && (
                  <p className="text-xs text-gray-500 text-center">
                    {dias} dia{dias !== 1 ? 's' : ''} de estadia
                  </p>
                )}
              </section>

              {/* Cuidador */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Cuidador
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700">
                  <p className="font-medium">{cuidador.nome}</p>
                  {cuidador.endereco?.cidade && (
                    <p className="text-gray-500">{cuidador.endereco.cidade}, {cuidador.endereco.uf}</p>
                  )}
                </div>
              </section>

              {/* Valor estimado */}
              {dias > 0 && (
                <section className="bg-orange-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500 mb-1">
                    {dias} dia{dias !== 1 ? 's' : ''} × R$ {cuidador.valorDiaria.toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </section>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleConfirm}
              disabled={!canConfirm || loading}
            >
              {loading ? 'Enviando...' : 'Confirmar Solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  ```

- [ ] **Step 2: Verificar que Popover existe no projeto**

  ```bash
  ls "src/app/components/ui/popover.tsx" 2>/dev/null || echo "MISSING"
  ```
  Se retornar MISSING, criar o arquivo seguindo o padrão shadcn/ui — mas provavelmente já existe (o explore confirmou que Popover está na lista de componentes).

- [ ] **Step 3: Verificar compilação**

  ```bash
  npx tsc --noEmit
  ```
  Esperado: sem erros.

- [ ] **Step 4: Commit**

  ```bash
  git add src/app/components/ReservationReviewDialog.tsx
  git commit -m "feat: add ReservationReviewDialog component"
  ```

---

## Task 6: Criar ReservationConfirmDialog.tsx

**Files:**
- Create: `src/app/components/ReservationConfirmDialog.tsx`

- [ ] **Step 1: Criar o arquivo**

  ```tsx
  import { CheckCircle } from 'lucide-react';
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from './ui/dialog';
  import { Button } from './ui/button';

  interface ReservationConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onViewBookings: () => void;
  }

  export function ReservationConfirmDialog({
    open,
    onOpenChange,
    onViewBookings,
  }: ReservationConfirmDialogProps) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-xl">Solicitação enviada!</DialogTitle>
          </DialogHeader>
          <p className="text-gray-500 text-sm mt-2">
            O cuidador irá analisar sua solicitação e responder em breve.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white w-full"
              onClick={() => {
                onOpenChange(false);
                onViewBookings();
              }}
            >
              Ver minhas reservas
            </Button>
            <Button
              variant="ghost"
              className="w-full text-gray-500"
              onClick={() => onOpenChange(false)}
            >
              Continuar navegando
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  ```

- [ ] **Step 2: Verificar compilação**

  ```bash
  npx tsc --noEmit
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/app/components/ReservationConfirmDialog.tsx
  git commit -m "feat: add ReservationConfirmDialog component"
  ```

---

## Task 7: Conectar botão no CaregiverProfile + atualizar App.tsx

**Files:**
- Modify: `src/app/components/CaregiverProfile.tsx`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Atualizar `CaregiverProfileProps` e imports em CaregiverProfile.tsx**

  Substituir a interface:
  ```typescript
  interface CaregiverProfileProps {
    cuidador: Cuidador;
    onBack: () => void;
  }
  ```
  Por:
  ```typescript
  interface CaregiverProfileProps {
    cuidador: Cuidador;
    onBack: () => void;
    onGoToBookings: () => void;
  }
  ```

  Adicionar imports no topo:
  ```typescript
  import { useState } from 'react';
  import { ReservationReviewDialog } from './ReservationReviewDialog';
  import { ReservationConfirmDialog } from './ReservationConfirmDialog';
  ```
  (remover o `useState` do import existente se já existir, apenas consolidar)

- [ ] **Step 2: Adicionar state dos dialogs no componente**

  Dentro de `CaregiverProfile`, após as variáveis existentes (`whatsappUrl`, etc.), adicionar:
  ```typescript
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  ```

- [ ] **Step 3: Substituir os 3 botões "Solicitar Orçamento" pelo handler**

  Botão desktop hero (linha ~214):
  ```tsx
  // DE:
  <button className="px-6 py-3 bg-white text-orange-600 rounded-xl font-semibold shadow-lg hover:bg-orange-50 transition-colors">
    Solicitar Orçamento
  </button>

  // PARA:
  <button
    onClick={() => setReviewOpen(true)}
    className="px-6 py-3 bg-white text-orange-600 rounded-xl font-semibold shadow-lg hover:bg-orange-50 transition-colors"
  >
    Solicitar Orçamento
  </button>
  ```

  Botão sidebar desktop (linha ~423):
  ```tsx
  // DE:
  <button className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-colors shadow-md">
    <Calendar className="w-5 h-5" />
    Solicitar Orçamento
  </button>

  // PARA:
  <button
    onClick={() => setReviewOpen(true)}
    className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-colors shadow-md"
  >
    <Calendar className="w-5 h-5" />
    Solicitar Orçamento
  </button>
  ```

  Botão mobile fixo (linha ~496):
  ```tsx
  // DE:
  <button className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-semibold text-sm">
    Orçamento
  </button>

  // PARA:
  <button
    onClick={() => setReviewOpen(true)}
    className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-semibold text-sm"
  >
    Orçamento
  </button>
  ```

- [ ] **Step 4: Adicionar os dialogs ao JSX — antes do `</div>` final do return**

  ```tsx
  <ReservationReviewDialog
    open={reviewOpen}
    onOpenChange={setReviewOpen}
    cuidador={cuidador}
    onConfirmed={() => {
      setReviewOpen(false);
      setConfirmOpen(true);
    }}
  />

  <ReservationConfirmDialog
    open={confirmOpen}
    onOpenChange={setConfirmOpen}
    onViewBookings={() => {
      setConfirmOpen(false);
      onGoToBookings();
    }}
  />
  ```

- [ ] **Step 5: Atualizar App.tsx para suportar `initialDashboardTab` e `onGoToBookings`**

  Em `App.tsx`, adicionar state:
  ```typescript
  const [initialDashboardTab, setInitialDashboardTab] = useState<string | undefined>(undefined);
  ```

  Adicionar função:
  ```typescript
  const handleGoToBookings = () => {
    setInitialDashboardTab('bookings');
    setCurrentPage('dashboard');
  };
  ```

  Atualizar o render do `Dashboard`:
  ```tsx
  {currentPage === 'dashboard' && (
    <Dashboard
      onLogout={handleLogout}
      onNavigate={handleNavigate}
      userRole={userRole}
      initialTab={initialDashboardTab}
    />
  )}
  ```

  Atualizar o render do `CaregiverProfile`:
  ```tsx
  {currentPage === 'caregiver-profile' && selectedCaregiver && (
    <CaregiverProfile
      cuidador={selectedCaregiver}
      onBack={() => setCurrentPage('caregivers')}
      onGoToBookings={handleGoToBookings}
    />
  )}
  ```

- [ ] **Step 6: Atualizar `DashboardProps` e o `useState` de `activeTab` no Dashboard.tsx**

  Substituir a interface:
  ```typescript
  interface DashboardProps {
    onLogout: () => void;
    onNavigate: (page: string, filters?: CaregiverFilters) => void;
    userRole?: string | null;
  }
  ```
  Por:
  ```typescript
  interface DashboardProps {
    onLogout: () => void;
    onNavigate: (page: string, filters?: CaregiverFilters) => void;
    userRole?: string | null;
    initialTab?: string;
  }
  ```

  E atualizar a assinatura e o useState:
  ```typescript
  export function Dashboard({ onLogout, onNavigate, userRole, initialTab }: DashboardProps) {
    const [activeTab, setActiveTab] = useState(initialTab ?? 'dashboard');
  ```

- [ ] **Step 7: Verificar compilação**

  ```bash
  npx tsc --noEmit
  ```
  Esperado: sem erros.

- [ ] **Step 8: Testar manualmente**
  - Preencher o chat com dados do pet + datas
  - Navegar ao perfil de um cuidador
  - Clicar em "Solicitar Orçamento" — popup deve abrir com dados pré-preenchidos
  - Verificar cálculo do valor total
  - Confirmar → dialog de confirmação deve aparecer
  - Clicar "Ver minhas reservas" → Dashboard deve abrir na aba Reservas

- [ ] **Step 9: Commit**

  ```bash
  git add src/app/components/CaregiverProfile.tsx src/app/App.tsx src/app/components/Dashboard.tsx
  git commit -m "feat: wire up Solicitar Orcamento button and navigation to bookings"
  ```

---

## Task 8: Implementar aba Reservas no Dashboard

**Files:**
- Modify: `src/app/components/Dashboard.tsx`

- [ ] **Step 1: Adicionar imports necessários no Dashboard.tsx**

  Adicionar aos imports existentes:
  ```typescript
  import { reservasApi, Reserva } from '../../lib/api';
  import { getUserId } from '../../lib/chatStorage';
  import { ReservationCard } from './ReservationCard';
  ```

- [ ] **Step 2: Criar o componente `BookingsPage` dentro de Dashboard.tsx, antes da função `Dashboard`**

  ```tsx
  function BookingsPage({ isCaregiver }: { isCaregiver: boolean }) {
    const [reservas, setReservas] = useState<Reserva[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const userId = getUserId();

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const all = await reservasApi.getAll();
        // Filtrar pelo ID do usuário logado
        // Para dono: filtra pelo donoId
        // Para cuidador: filtra pelo cuidadorId
        const filtered = isCaregiver
          ? all.filter((r) => r.cuidadorId === userId)
          : all.filter((r) => r.donoId === userId || !r.donoId); // fallback: mostra tudo se donoId não existir na response
        setReservas(filtered);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar reservas');
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => { load(); }, []);

    const handleAccept = async (id: string) => {
      try {
        await reservasApi.updateStatus(id, 'Aceito');
        setReservas((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: 'Aceito' as const } : r))
        );
        toast.success('Reserva aceita!');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao aceitar reserva');
      }
    };

    const handleReject = async (id: string) => {
      try {
        await reservasApi.updateStatus(id, 'Recusado');
        setReservas((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: 'Recusado' as const } : r))
        );
        toast.info('Reserva recusada.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao recusar reserva');
      }
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12 space-y-3">
          <p className="text-red-500">{error}</p>
          <Button variant="outline" onClick={load}>Tentar novamente</Button>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">
            {isCaregiver ? 'Solicitações de Reserva' : 'Minhas Reservas'}
          </h1>
          <Button variant="outline" size="sm" onClick={load}>
            Atualizar
          </Button>
        </div>

        {reservas.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <PawPrint className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Nenhuma reserva ainda</p>
            <p className="text-sm mt-1">
              {isCaregiver
                ? 'Quando um dono solicitar, aparecerá aqui.'
                : 'Encontre um cuidador e faça sua primeira reserva!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reservas.map((r) => (
              <ReservationCard
                key={r.id}
                reserva={r}
                role={isCaregiver ? 'cuidador' : 'dono'}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 3: Adicionar a renderização condicional da aba bookings no JSX do Dashboard**

  No bloco de renderização do conteúdo (após `{activeTab === 'profile' && <UserProfilePage />}`):

  Substituir:
  ```tsx
  {activeTab !== 'profile' && (
    <div className="max-w-6xl mx-auto space-y-8">
  ```
  Por:
  ```tsx
  {activeTab === 'bookings' && (
    <BookingsPage isCaregiver={isCaregiver} />
  )}

  {activeTab !== 'profile' && activeTab !== 'bookings' && (
    <div className="max-w-6xl mx-auto space-y-8">
  ```

  E fechar o bloco corretamente (o `</div>` e `)}` existentes continuam intactos).

- [ ] **Step 4: Verificar compilação**

  ```bash
  npx tsc --noEmit
  ```
  Esperado: sem erros.

- [ ] **Step 5: Testar manualmente — Dono**
  - Fazer login como dono
  - Criar uma reserva (fluxo completo)
  - Navegar para aba Reservas
  - Confirmar que o card aparece com status "Pendente"

- [ ] **Step 6: Testar manualmente — Cuidador**
  - Fazer login como cuidador
  - Ir para aba Reservas
  - Confirmar que a reserva criada aparece com botões "Aceitar" / "Recusar"
  - Aceitar a reserva e confirmar que o badge muda para "Aceito"

- [ ] **Step 7: Commit final**

  ```bash
  git add src/app/components/Dashboard.tsx
  git commit -m "feat: implement bookings tab for owners and caregivers"
  ```

---

## Checklist de Spec Coverage

| Requisito da spec | Task |
|-------------------|------|
| Passos 7-8 no chat (checkin/checkout) | Task 3 |
| Datas persistidas no localStorage | Task 2 + 3 |
| Popup de revisão com date pickers | Task 5 |
| Cálculo de dias × diária | Task 5 |
| POST /api/reservas | Task 5 |
| Popup de confirmação | Task 6 |
| Limpar datas após confirmação | Task 2 (clearDatesFromStorage) + Task 5 |
| Navegar para aba Reservas | Task 6 + 7 |
| Aba Reservas — dono com status badge | Task 8 |
| Aba Reservas — cuidador com aceitar/recusar | Task 8 |
| PATCH /api/reservas/{id}/status | Task 1 + 8 |
| Filtro client-side por usuário logado | Task 2 (getUserId) + Task 8 |
