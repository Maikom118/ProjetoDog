# Sistema de Reservas — Design Spec
**Data:** 2026-04-01  
**Status:** Aprovado

---

## Visão Geral

Implementar o fluxo completo de reservas no ProjetoDog: desde a coleta de datas no chat, passando pelo popup de revisão/confirmação no perfil do cuidador, até a visualização das reservas para donos e cuidadores.

---

## 1. Persistência de Dados (localStorage)

**Abordagem:** Estender o objeto de estado do chat já salvo no localStorage (chave versionada por usuário) para incluir as datas da estadia.

Novos campos adicionados ao `FlowState`:
```typescript
dataEntrada: string | null  // ISO date string
dataSaida: string | null    // ISO date string
```

Esses campos são limpos após a confirmação de uma reserva.

---

## 2. Novas Etapas no Chat

Adicionar 2 passos ao final do fluxo existente (após `pet_behavior`):

**Passo 7 — `checkin_date`**
- Pergunta: *"📅 Quando seu pet vai precisar do cuidador? Me diz a **data de entrada**!"*
- Input: date picker (componente `Calendar` do Radix UI via Popover)
- Validação: data deve ser hoje ou futura
- Salvo em: `flow.dataEntrada`

**Passo 8 — `checkout_date`**
- Pergunta: *"📅 E quando ele volta pra casa? Me diz a **data de saída**!"*
- Input: date picker
- Validação: deve ser posterior à data de entrada
- Salvo em: `flow.dataSaida`

Após o passo 8, o fluxo continua normalmente: chama `POST /api/Match/encontrar-cuidador` e navega para a lista de cuidadores.

---

## 3. Popup de Revisão da Reserva

**Trigger:** Botão "Solicitar Orçamento" no `CaregiverProfile.tsx` (desktop e mobile).

**Componente:** `Dialog` (Radix UI, já disponível no projeto).

**Conteúdo do popup:**

| Bloco | Campos |
|-------|--------|
| Dados do Pet | Nome, Espécie, Porte, Cuidados Especiais, Comportamento |
| Período | Date picker de entrada + Date picker de saída (pré-preenchidos do localStorage, editáveis) + número de dias calculado |
| Cuidador | Nome + cidade |
| Valor Estimado | `Nº dias × valorDiaria` exibido em destaque |

**Rodapé:**
- `Cancelar` — fecha o popup
- `Confirmar Solicitação` (laranja) — chama `POST /api/reservas`

**Estado sem dados do chat:** Se não houver dados de pet no localStorage, exibir aviso: *"Converse com nosso assistente primeiro para preencher os dados do seu pet."* e desabilitar o botão de confirmar.

**Body enviado para a API:**
```json
{
  "cuidadorId": "<id do cuidador selecionado>",
  "nomePet": "<do localStorage>",
  "especie": "<do localStorage>",
  "porte": "<do localStorage>",
  "cuidadosEspeciais": "<do localStorage>",
  "descricaoPet": "<do localStorage>",
  "dataEntrada": "<ISO datetime>",
  "dataSaida": "<ISO datetime>",
  "valorTotal": "<dias × valorDiaria>"
}
```

---

## 4. Popup de Confirmação

Após sucesso do `POST /api/reservas`, fechar o popup de revisão e abrir um segundo `Dialog`:

> ✅ **Solicitação enviada!**  
> O cuidador irá analisar sua solicitação e responder em breve.

- Botão `Ver minhas reservas` → navega para a aba `bookings` no Dashboard
- Limpar `dataEntrada` e `dataSaida` do localStorage

---

## 5. Aba Reservas — Dono

**Rota:** Tab `bookings` no Dashboard, quando `userRole !== 'cuidador'`.

**Dados:** `GET /api/reservas` → filtrar client-side pelos registros onde o `donoId` (ou equivalente) corresponde ao usuário logado.

**Card de Reserva:**
- Nome do pet + espécie + porte
- Nome do cuidador
- Período formatado: `01/04 → 06/04 (5 dias)`
- Valor total: `R$ 400,00`
- Badge de status:
  - 🟡 Pendente
  - 🟢 Aceito  
  - 🔴 Recusado

---

## 6. Aba Reservas — Cuidador

**Rota:** Tab `bookings` no Dashboard, quando `userRole === 'cuidador'`.

**Dados:** `GET /api/reservas` → filtrar client-side pelos registros onde `cuidadorId` corresponde ao usuário logado.

**Card de Reserva (mesmos campos do dono) + para status `Pendente`:**
- Botão `Recusar` (bordado vermelho) → `PATCH /api/reservas/{id}/status` com `{ status: "Recusado" }`
- Botão `Aceitar` (laranja sólido) → `PATCH /api/reservas/{id}/status` com `{ status: "Aceito" }`

Após ação: atualizar o card na UI imediatamente (sem reload), remover os botões de ação.

---

## 7. Endpoints da API

| Método | Endpoint | Uso |
|--------|----------|-----|
| `POST` | `/api/reservas` | Criar reserva |
| `GET` | `/api/reservas` | Listar reservas (filtrar client-side) |
| `PATCH` | `/api/reservas/{id}/status` | Aceitar ou recusar (cuidador) |

---

## 8. Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/api.ts` | Adicionar `reservasApi` com os 3 endpoints |
| `src/app/components/Dashboard.tsx` | Adicionar passos 7-8 no chat + implementar aba `bookings` |
| `src/app/components/CaregiverProfile.tsx` | Conectar botão "Solicitar Orçamento" ao popup |
| `src/app/components/ReservationReviewDialog.tsx` | Novo componente: popup de revisão |
| `src/app/components/ReservationConfirmDialog.tsx` | Novo componente: popup de confirmação |
| `src/app/components/ReservationCard.tsx` | Novo componente: card de reserva (compartilhado dono/cuidador) |

---

## 9. Premissas e Riscos

- **Status do PATCH:** Assumindo `"Aceito"` e `"Recusado"` como valores válidos — ajustar se a API rejeitar.
- **Filtragem GET:** Assumindo que a response inclui `cuidadorId` e algum identificador do dono para filtrar client-side — verificar campos reais na response.
- **Datas:** Enviadas como ISO 8601 datetime string para a API.
