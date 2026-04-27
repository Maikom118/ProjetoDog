import React, { useState, useRef, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import {
  PawPrint,
  LayoutDashboard,
  Calendar,
  MessageSquare,
  Settings,
  LogOut,
  User,
  Search,
  PlusCircle,
  Bell,
  Users,
  MessageCircle,
  X,
  Send,
  Dog,
  Menu,
  ChevronLeft,
  Mail,
  Shield,
  Clock,
  Star,
  Edit2,
  Upload,
  Wallet,
  TrendingUp,
  ArrowDownToLine,
  CheckCircle2,
  Clock3,
  CreditCard,
  Banknote,
  ChevronRight,
  Moon,
  Sun,
  Bell as BellIcon,
  Lock,
  Smartphone,
  Globe,
  Trash2,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { CaregiverFilters } from '../App';
import { cuidadoresApi, donosApi, matchApi, reservasApi, avaliacoesApi, chatApi, Avaliacao, Reserva, ChatMensagem, UpdateCuidadorRequest, UpdateDonoRequest, Dono } from '../../lib/api';
import { getChatStorageKey, savePetDataSnapshot } from '../../lib/chatStorage';
import { PetConnectLogo } from './PetConnectLogo';

interface ChatMessage {
  id: number;
  from: 'bot' | 'user';
  text: string;
  time: string;
}

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

interface PersistedChatState {
  messages: ChatMessage[];
  input: string;
  flow: FlowState | null;
  postAction: 'find_caregiver' | null;
}

function getUserInfo(): { firstName: string; fullName: string; initials: string } {
  const token = localStorage.getItem('token');
  if (!token) return { firstName: '', fullName: '', initials: 'U' };
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const fullName: string =
      payload.name ||
      payload.nome ||
      payload.given_name ||
      payload.unique_name ||
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] ||
      payload.sub ||
      '';
    const parts = fullName.trim().split(' ');
    const firstName = parts[0] || '';
    const initials = parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : (parts[0]?.[0] ?? 'U').toUpperCase();
    return { firstName, fullName, initials };
  } catch {
    return { firstName: '', fullName: '', initials: 'U' };
  }
}

function getUserFirstName(): string {
  return getUserInfo().firstName;
}

function loadPersistedChatState(): PersistedChatState | null {
  try {
    const raw = localStorage.getItem(getChatStorageKey());
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedChatState;
    if (!Array.isArray(parsed.messages)) return null;
    const hasLegacyAssistantName = parsed.messages.some(
      (message) => typeof message.text === 'string' && /chat inteligente/i.test(message.text)
    );
    if (hasLegacyAssistantName) {
      localStorage.removeItem(getChatStorageKey());
      return null;
    }

    return {
      messages: parsed.messages.length ? parsed.messages : [makeWelcomeMessage()],
      input: typeof parsed.input === 'string' ? parsed.input : '',
      flow: parsed.flow ?? null,
      postAction: parsed.postAction ?? null,
    };
  } catch {
    return null;
  }
}

function persistChatState(state: PersistedChatState) {
  try {
    localStorage.setItem(getChatStorageKey(), JSON.stringify(state));
  } catch {
    // Ignore storage failures to avoid breaking chat usage.
  }
}

function clearPersistedChatState() {
  try {
    localStorage.removeItem(getChatStorageKey());
  } catch {
    // Ignore storage cleanup failures.
  }
}

const HOW_IT_WORKS_INTRO =
  'O **PetConnect** é a plataforma que conecta donos de pets a cuidadores verificados e confiáveis em todo o Brasil. Nossa missão é garantir que o seu pet receba o melhor cuidado possível enquanto você está ocupado — seja numa viagem, num dia longo de trabalho ou qualquer outra necessidade. Com avaliações reais de outros donos e perfis completos, você tem tudo que precisa para escolher com total confiança. 🐾';

const HOW_IT_WORKS_TUTORIAL =
  '📋 **Mini Tutorial — Como usar o PetConnect:**\n\n' +
  '**Passo 1 — Encontre um cuidador**\n' +
  'Use o chat abaixo para descrever o seu pet e encontrar os cuidadores mais indicados para ele.\n\n' +
  '**Passo 2 — Veja o perfil completo**\n' +
  'Clique em "Ver Perfil" para ver bio, localização no mapa, especialidades e avaliações de outros donos.\n\n' +
  '**Passo 3 — Faça um agendamento**\n' +
  'Escolha o cuidador ideal e agende o serviço diretamente pelo app. Simples e rápido!\n\n' +
  '**Passo 4 — Acompanhe sua reserva**\n' +
  'Sua reserva aparece aqui no Dashboard. Fique tranquilo — seu pet está em ótimas mãos. 🐾\n\n' +
  'Pronto para começar? 👇';

const STATIC_REPLIES: Record<string, string[]> = {
  'ver minhas reservas': [
    'Você tem **3 reservas ativas**. A mais próxima é: Max com Ana Silva, de 15 a 18 de Outubro. Quer mais detalhes?',
    'Sua reserva mais recente está **confirmada** ✅. O cuidador Ana Silva já está aguardando o Max. Lembre-se de levar os itens do pet no dia da entrega!',
    'Todas as suas reservas podem ser gerenciadas na aba **Reservas** no menu lateral. Lá você vê status, datas e o contato de cada cuidador.',
  ],
  'dicas para pets': [
    '🌿 Pets precisam de rotina. Mantenha horários fixos de alimentação e passeio — isso reduz a ansiedade deles significativamente.',
    '🦷 Escove os dentes do seu pet pelo menos 3 vezes por semana para evitar tártaro e doenças gengivais.',
    '💧 Troque a água do seu pet diariamente. Água fresca incentiva a hidratação e evita proliferação de bactérias.',
    '🎾 30 minutos de brincadeira por dia mantêm seu pet mais saudável, equilibrado e feliz.',
    '🐾 Antes de deixar seu pet com um cuidador novo, faça uma visita de apresentação. O animal se familiariza com o ambiente e chega mais tranquilo.',
    '🌡️ No verão, nunca deixe seu pet em carros fechados. A temperatura interna pode atingir níveis fatais em apenas minutos.',
    '🏥 Consultas veterinárias anuais são essenciais, mesmo que seu pet pareça completamente saudável.',
    '🍗 Evite dar ossos de frango cozidos para cães — eles se fragmentam facilmente e podem causar sérias lesões internas.',
    '🐱 Gatos precisam de arranhadores. Ofereça um para proteger seus móveis e satisfazer o instinto natural deles.',
    '🎵 Músicas calmas e clássicas podem ajudar pets ansiosos durante tempestades ou fogos de artifício.',
    '🪮 Escovar o pelo do seu pet regularmente reduz a queda de pelos pela casa e fortalece o vínculo entre vocês.',
    '🧴 Use sempre produtos de higiene específicos para pets. Produtos humanos podem irritar a pele sensível deles.',
    '🌱 Algumas plantas comuns são tóxicas para pets: lírio, azaleia e comigo-ninguém-pode. Pesquise antes de decorar!',
    '🐕 Socialização precoce é fundamental. Exponha filhotes a diferentes pessoas, sons e ambientes com segurança e calma.',
    '🎓 Treinamento positivo com recompensas é muito mais eficaz do que punição. Pets aprendem mais rápido e ficam mais felizes.',
    '🛏️ Pets dormem melhor em locais próprios deles. Invista em uma cama confortável no cantinho favorito do animal.',
    '🦟 Aplique antipulgas e vermífugos regularmente conforme indicação do veterinário. Prevenção é sempre melhor.',
    '🐠 Peixes também precisam de cuidados! Mantenha o aquário limpo e monitore a temperatura da água regularmente.',
    '🏃 Raças energéticas como Border Collie e Husky precisam de exercício intenso diário — não basta um passeio curtinho.',
    '😻 Gatos são mais felizes com estímulo mental. Brinquedos de caça e arranhadores em altura são ótimos para eles!',
    '🌊 Nem todos os cães sabem nadar instintivamente. Apresente a água gradualmente, com paciência e segurança.',
    '🧪 Chocolate, uva, cebola e xilitol são altamente tóxicos para cães. Nunca os ofereça como petisco, mesmo em pequenas doses.',
    '🐓 Dietas de comida crua (BARF) requerem orientação veterinária. Não mude a alimentação do pet sem consultar um especialista.',
    '📸 Tire fotos do seu pet regularmente e em boa resolução. Se ele se perder, imagens recentes são essenciais para a busca.',
    '🏷️ Mantenha a coleira com identificação sempre atualizada — nome, telefone e endereço são indispensáveis.',
    '🧸 Troque os brinquedos do seu pet periodicamente. Novidades estimulam a curiosidade e evitam o tédio e a destruição de móveis.',
    '🛁 Banhos excessivos podem ressecar a pele do pet. Siga a frequência recomendada para cada raça e tipo de pelo.',
    '🐇 Coelhos precisam de muito espaço para se movimentar. Gaiolas pequenas causam problemas físicos e psicológicos sérios.',
    '💊 Nunca dê medicamentos humanos para pets sem orientação veterinária — muitos são altamente tóxicos para eles.',
    '🤝 Adotar é um ato de amor! Antes de adotar, pesquise o perfil do animal para garantir que combina com seu estilo de vida.',
  ],
};

const staticCounters: Record<string, number> = {};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const FLOW_PROMPTS: Record<FlowStep, string[]> = {
  pet_name: [
    'Pode me falar o **nome do seu pet**?',
    'Como é o nome do seu bichinho? 🐾',
    'Qual é o **nome do pet** que você quer cuidar?',
    'Me conta o **nome do seu companheiro**! 😊',
  ],
  pet_type: [
    'Legal! Que **tipo de pet** é?',
    'Que fofo! 😍 Seu pet é cachorro ou gato?',
    'Adorei o nome! 🐾 E que **tipo de animal** é o seu pet?',
    'Boa escolha! Agora me conta: é **cachorro ou gato**?',
  ],
  pet_size: [
    'Qual é o **porte do animal**?',
    'E qual é o **tamanho** do seu pet?',
    'Legal! Qual é o **porte** do seu bichinho?',
    'Entendido! Me fala o **porte** do seu pet.',
  ],
  special_care: [
    'O pet precisa de **cuidados especiais** como remédios, escovação dentária ou banhos regulares?',
    'Seu pet tem algum **cuidado especial** que o cuidador precisa saber? Tipo remédios, alergias ou rotinas específicas?',
    'Precisa de **atenção extra**? Remédios, higiene especial ou outro cuidado específico?',
    'Tem algo **especial** que o cuidador deve saber? Medicamentos, necessidades de saúde ou cuidados específicos?',
  ],
  special_care_desc: [
    'Por favor **descreva os cuidados especiais** que o seu pet precisa.',
    'Pode me contar com mais detalhes quais são esses **cuidados especiais**? 📋',
    'Que cuidados são esses? **Descreva** para que possamos encontrar o cuidador certo!',
    'Me conta mais sobre esses **cuidados**: o que o cuidador precisa fazer e com qual frequência?',
  ],
  pet_behavior: [
    'Ótimo! Estamos quase lá! 🎉\n\nPor último, você poderia **descrever o comportamento do pet**? Se é carinhoso, se precisa de bastante atenção, gosta de coisas específicas, etc.',
    'Estamos quase terminando! 🙌\n\nSó falta uma coisa: como é o **comportamento do seu pet** no dia a dia? É agitado, tranquilo, adora atenção?',
    'Perfeito! Só mais uma pergunta! 🌟\n\nComo você descreveria o **jeito de ser do seu pet**? Nos ajuda a encontrar o cuidador mais compatível!',
    'Ufa, última etapa! 🎉\n\nMe conta: como é a **personalidade do seu pet**? Tímido, brincalhão, ansioso? Qualquer detalhe ajuda!',
  ],
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
};

const INPUT_STEPS: FlowStep[] = ['pet_name', 'special_care_desc', 'pet_behavior'];
const BUTTON_STEPS: FlowStep[] = ['pet_type', 'pet_size', 'special_care'];
const DATE_STEPS: FlowStep[] = ['checkin_date', 'checkout_date'];

const MAX_LENGTH: Partial<Record<FlowStep, number>> = {
  pet_name: 20,
  special_care_desc: 200,
  pet_behavior: 300,
};

const STEP_BUTTONS: Partial<Record<FlowStep, string[]>> = {
  pet_type:     ['🐶 Cachorro', '🐱 Gato'],
  pet_size:     ['🟡 Pequeno', '🟠 Médio', '🔴 Grande'],
  special_care: ['✅ Sim', '❌ Não'],
};

function now() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function makeWelcomeMessage(): ChatMessage {
  const firstName = getUserFirstName();
  const name = firstName ? `**${firstName}**` : '';
  const WELCOME_VARIATIONS = [
    name
      ? `Olá, ${name}! 🐾 Sou o **Toby**, seu assistente do PetConnect. Clique em um dos botões abaixo para começar 👇`
      : 'Olá! 🐾 Sou o **Toby**, seu assistente do PetConnect. Clique em um dos botões abaixo para começar 👇',
    name
      ? `Oi, ${name}! 🐾 Que bom ter você por aqui! Sou o **Toby** e estou pronto pra te ajudar. O que você precisa hoje? 👇`
      : 'Oi! 🐾 Que bom ter você por aqui! Sou o **Toby** e estou pronto pra te ajudar. O que você precisa hoje? 👇',
    name
      ? `Olá, ${name}! 🐾 Bem-vindo ao **PetConnect**! Sou o Toby e estou aqui pra facilitar sua vida. Como posso ajudar? 👇`
      : 'Olá! 🐾 Bem-vindo ao **PetConnect**! Sou o Toby e estou aqui pra facilitar sua vida. Como posso ajudar? 👇',
    name
      ? `Ei, ${name}! 🐾 Sou o **Toby**, seu assistente virtual do PetConnect. Me diz o que você precisa! 👇`
      : 'Ei! 🐾 Sou o **Toby**, seu assistente virtual do PetConnect. Me diz o que você precisa! 👇',
  ];
  return {
    id: 1,
    from: 'bot',
    text: pickRandom(WELCOME_VARIATIONS),
    time: 'agora',
  };
}

const QUICK_REPLIES = [
  { label: '🔍 Encontrar cuidador', key: 'encontrar' },
  { label: '❓ Como funciona?', key: 'como funciona' },
  { label: '📅 Ver minhas reservas', key: 'ver minhas reservas' },
  { label: '💡 Dicas para pets', key: 'dicas para pets' },
];

function ChatWidget({ onClose, onNavigate }: { onClose: () => void; onNavigate: (page: string, filters?: CaregiverFilters) => void }) {
  const dark = localStorage.getItem('petconnect-dark') === 'true';
  const cdm = {
    bg:          dark ? '#0F172A' : '#FFFBEB',
    card:        dark ? '#1E293B' : '#FFFFFF',
    border:      dark ? '#334155' : '#EEDFD3',
    textPrimary: dark ? '#E2E8F0' : '#1E2939',
    textSec:     dark ? '#94A3B8' : '#717182',
    botBubble:   dark ? '#1E293B' : '#FFFFFF',
    inputArea:   dark ? '#0F172A' : '#FFFBEB',
  };
  const persistedStateRef = useRef<PersistedChatState | null>(loadPersistedChatState());
  const [messages, setMessages] = useState<ChatMessage[]>(() => persistedStateRef.current?.messages ?? [makeWelcomeMessage()]);
  const [input, setInput] = useState(() => persistedStateRef.current?.input ?? '');
  const [typing, setTyping] = useState(false);
  const [flow, setFlow] = useState<FlowState | null>(() => persistedStateRef.current?.flow ?? null);
  const [postAction, setPostAction] = useState<'find_caregiver' | null>(() => persistedStateRef.current?.postAction ?? null);
  const [dateInput, setDateInput] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    if (flow && INPUT_STEPS.includes(flow.step)) inputRef.current?.focus();
  }, [flow]);

  useEffect(() => {
    persistChatState({ messages, input, flow, postAction });
  }, [messages, input, flow, postAction]);

  const addBotMessage = (text: string, delay = 900) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, { id: Date.now(), from: 'bot', text, time: now() }]);
    }, delay);
  };

  const addUserMessage = (text: string) => {
    setMessages((prev) => [...prev, { id: Date.now(), from: 'user', text, time: now() }]);
  };

  const sendHowItWorks = () => {
    setTimeout(() => setTyping(true), 100);
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, { id: Date.now(), from: 'bot', text: HOW_IT_WORKS_INTRO, time: now() }]);
      setTimeout(() => setTyping(true), 300);
      setTimeout(() => {
        setTyping(false);
        setMessages((prev) => [...prev, { id: Date.now() + 1, from: 'bot', text: HOW_IT_WORKS_TUTORIAL, time: now() }]);
        setTimeout(() => setPostAction('find_caregiver'), 400);
      }, 2200);
    }, 1200);
  };

  const handleQuickReply = (key: string) => {
    if (key === 'encontrar') {
      setPostAction(null);
      addUserMessage('🔍 Encontrar cuidador');
      setFlow({ step: 'pet_name' });
      addBotMessage(pickRandom(FLOW_PROMPTS.pet_name));
      return;
    }
    if (key === 'como funciona') {
      addUserMessage('❓ Como funciona?');
      sendHowItWorks();
      return;
    }
    const replies = STATIC_REPLIES[key];
    if (replies) {
      addUserMessage(QUICK_REPLIES.find((r) => r.key === key)?.label ?? key);
      const count = staticCounters[key] ?? 0;
      staticCounters[key] = (count + 1) % replies.length;
      addBotMessage(replies[count]);
    }
  };

  // Handle button choices (pet_type, pet_size, special_care)
  const handleButtonChoice = (label: string) => {
    if (!flow) return;
    addUserMessage(label);

    if (flow.step === 'pet_type') {
      const petType = label.replace(/^[^\s]+\s/, ''); // strip emoji prefix
      const next: FlowState = { ...flow, step: 'pet_size', petType };
      setFlow(next);
      addBotMessage(pickRandom(FLOW_PROMPTS.pet_size));
      return;
    }

    if (flow.step === 'pet_size') {
      const petSize = label.replace(/^[^\s]+\s/, '');
      const next: FlowState = { ...flow, step: 'special_care', petSize };
      setFlow(next);
      addBotMessage(pickRandom(FLOW_PROMPTS.special_care));
      return;
    }

    if (flow.step === 'special_care') {
      const specialCare = label.includes('Sim');
      if (specialCare) {
        setFlow({ ...flow, step: 'special_care_desc', specialCare: true });
        addBotMessage(pickRandom(FLOW_PROMPTS.special_care_desc));
      } else {
        setFlow({ ...flow, step: 'pet_behavior', specialCare: false });
        addBotMessage(pickRandom(FLOW_PROMPTS.pet_behavior));
      }
    }
  };

  // Handle text input steps
  const handleFlowInput = (text: string) => {
    if (!flow) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    addUserMessage(trimmed);
    setInput('');

    if (flow.step === 'pet_name') {
      const next: FlowState = { ...flow, step: 'pet_type', petName: trimmed };
      setFlow(next);
      addBotMessage(pickRandom(FLOW_PROMPTS.pet_type));
      return;
    }

    if (flow.step === 'special_care_desc') {
      const next: FlowState = { ...flow, step: 'pet_behavior', specialCareDesc: trimmed };
      setFlow(next);
      addBotMessage(pickRandom(FLOW_PROMPTS.pet_behavior));
      return;
    }

    if (flow.step === 'pet_behavior') {
      const next: FlowState = { ...flow, step: 'checkin_date', petBehavior: trimmed };
      setFlow(next);
      addBotMessage(pickRandom(FLOW_PROMPTS.checkin_date));
    }
  };

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

  const finishFlow = async (currentFlow: FlowState) => {
    const { petName, petType, petSize, specialCareDesc, petBehavior } = currentFlow;

    // Persist pet data before clearing flow so CaregiverProfile can read it
    savePetDataSnapshot({
      petName: petName ?? '',
      petType: petType ?? '',
      petSize: petSize ?? '',
      specialCareDesc: specialCareDesc ?? '',
      petBehavior: petBehavior ?? '',
      dataEntrada: currentFlow.dataEntrada ?? null,
      dataSaida: currentFlow.dataSaida ?? null,
    });

    setFlow(null);

    const displayName = petName ?? 'seu pet';

    addBotMessage(pickRandom([
      `Buscando os melhores cuidadores para o(a) **${displayName}**... 🔍`,
      `Procurando o cuidador ideal para o(a) **${displayName}**... 🔍 Um momento!`,
      `Analisando o perfil do(a) **${displayName}** e buscando o melhor match... 🤖✨`,
      `Já estou encontrando o cuidador perfeito para o(a) **${displayName}**! Só um segundo... 🐾`,
    ]), 800);

    // Strip emoji prefix from button labels
    const stripEmoji = (s: string) => s.replace(/^[^\s]+\s/, '').trim();

    const requestBody = {
      nomePet:          petName ?? '',
      especie:          petType ? stripEmoji(petType) : '',
      porte:            petSize ? stripEmoji(petSize) : '',
      cuidadosEspeciais: specialCareDesc ?? '',
      descricao:        petBehavior ?? '',
    };

    console.log('[Chat] Enviando para /api/Match/encontrar-cuidador:', requestBody);

    try {
      const resultado = await matchApi.encontrarCuidador(requestBody);

      console.log('[Chat] Resultado do match:', resultado);

      const total = resultado.length;
      const bestMatch = resultado[0];

      console.log('[Chat] Best match:', bestMatch?.id, bestMatch?.nome);

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            from: 'bot',
            text: pickRandom([
                `Ok! Está tudo pronto! 🎉\n\nEncontramos **${total} cuidador${total !== 1 ? 'es' : ''}** para o(a) **${displayName}**. O primeiro da lista é o **Best Match** mais indicado! 🏆\n\nRedirecionando... 🚀`,
                `Missão cumprida! 🎉\n\n**${total} cuidador${total !== 1 ? 'es encontrados' : ' encontrado'}** para o(a) **${displayName}**! O **Best Match** está no topo da lista. 🏆\n\nVou te levar lá agora... 🚀`,
                `Boa notícia! 🌟\n\nEncontramos **${total} cuidador${total !== 1 ? 'es' : ''}** compatíve${total !== 1 ? 'is' : 'l'} com o perfil do(a) **${displayName}**! O primeiro é o **Best Match**! 🏆\n\nRedirecionando... 🚀`,
                `Perfeito! Análise concluída! 🤖✨\n\n**${total} cuidador${total !== 1 ? 'es' : ''}** para o(a) **${displayName}**. O **Best Match** já está no topo esperando por vocês! 🏆\n\nVamos lá! 🚀`,
              ]),
            time: now(),
          },
        ]);

        setTimeout(() => {
          const filters = {
            bestMatchId: bestMatch?.id,
            petName: displayName,
            specialty: petType ? stripEmoji(petType) : undefined,
            preloadedCuidadores: resultado,
          };
          console.log('[Chat] Navegando com filtros:', filters);
          onNavigate('caregivers', filters);
          onClose();
        }, 2500);
      }, 1800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Chat] Erro no match API:', msg);
      toast.error(`Erro da API: ${msg}`, { duration: 8000 });
      setTimeout(() => {
        onNavigate('caregivers', {});
        onClose();
      }, 3000);
    }
  };

  const handleSend = () => {
    if (!input.trim() || !flow) return;
    handleFlowInput(input.trim());
  };

  const currentMaxLength = flow ? (MAX_LENGTH[flow.step] ?? undefined) : undefined;

  const renderText = (text: string) =>
    text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 rounded-t-2xl" style={{ background: 'linear-gradient(to right, #FF6900, #FE9A00)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center relative">
            <Dog className="w-4 h-4 text-white" />
            <MessageCircle className="w-3 h-3 text-white absolute -bottom-0.5 -right-0.5 drop-shadow" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">Toby</p>
            <span className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-green-300 rounded-full inline-block"></span>
              <span className="text-white/80 text-xs">Online</span>
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3" style={{ backgroundColor: cdm.bg }}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.from === 'bot' && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1" style={{ backgroundColor: dark ? '#1E3A5F' : '#FFEDD4' }}>
                <PawPrint className="w-3.5 h-3.5" style={{ color: '#FF6900' }} />
              </div>
            )}
            <div className={`max-w-[78%] ${msg.from === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
              <div
                className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.from === 'user' ? 'rounded-br-sm' : 'shadow-sm rounded-bl-sm'
                }`}
                style={msg.from === 'user'
                  ? { backgroundColor: '#FF6900', color: 'white' }
                  : { backgroundColor: cdm.botBubble, color: cdm.textPrimary, border: `1px solid ${cdm.border}` }
                }
              >
                {renderText(msg.text)}
              </div>
              <span className="text-xs px-1" style={{ color: cdm.textSec }}>{msg.time}</span>
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full flex items-center justify-center mr-2 flex-shrink-0" style={{ backgroundColor: dark ? '#1E3A5F' : '#FFEDD4' }}>
              <PawPrint className="w-3.5 h-3.5" style={{ color: '#FF6900' }} />
            </div>
            <div className="shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1" style={{ backgroundColor: cdm.botBubble, border: `1px solid ${cdm.border}` }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ backgroundColor: dark ? '#94A3B8' : '#9CA3AF', animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies — shown when idle */}
      {!flow && !postAction && (
        <div className="px-3 py-3 border-t" style={{ backgroundColor: cdm.bg, borderColor: cdm.border }}>
          <p className="text-xs mb-2 px-1" style={{ color: cdm.textSec }}>Escolha uma opção:</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply.key}
                onClick={() => handleQuickReply(reply.key)}
                className="px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left border"
                style={{ backgroundColor: cdm.card, borderColor: cdm.border, color: '#FF6900' }}
              >
                {reply.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Post "Como funciona?" CTA */}
      {!flow && postAction === 'find_caregiver' && (
        <div className="px-3 py-3 border-t space-y-2" style={{ backgroundColor: cdm.bg, borderColor: cdm.border }}>
          <button
            onClick={() => handleQuickReply('encontrar')}
            className="w-full py-2.5 text-white rounded-xl text-sm font-semibold transition-colors"
            style={{ backgroundColor: '#FF6900' }}
          >
            🔍 Encontrar cuidador agora
          </button>
          <button
            onClick={() => setPostAction(null)}
            className="w-full py-2 rounded-xl text-xs transition-colors border"
            style={{ backgroundColor: cdm.card, borderColor: cdm.border, color: cdm.textSec }}
          >
            ↩️ Voltar ao menu
          </button>
        </div>
      )}

      {/* Button choices — shown for pet_type, pet_size, special_care */}
      {flow && BUTTON_STEPS.includes(flow.step) && !typing && (
        <div className="px-3 py-3 border-t" style={{ backgroundColor: cdm.bg, borderColor: cdm.border }}>
          <div className="flex flex-wrap gap-2">
            {(STEP_BUTTONS[flow.step] ?? []).map((btn) => (
              <button
                key={btn}
                onClick={() => handleButtonChoice(btn)}
                className="px-4 py-2 border rounded-full text-sm font-semibold transition-colors"
                style={{ backgroundColor: cdm.card, borderColor: cdm.border, color: '#FF6900' }}
              >
                {btn}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Text input — shown for pet_name, special_care_desc, pet_behavior */}
      {flow && INPUT_STEPS.includes(flow.step) && (
        <div className="px-3 pb-3 pt-2 rounded-b-2xl border-t" style={{ backgroundColor: cdm.card, borderColor: cdm.border }}>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: cdm.bg }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              maxLength={currentMaxLength}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Escreva sua resposta..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: cdm.textPrimary }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:bg-gray-200"
              style={{ backgroundColor: '#FF6900' }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          {currentMaxLength && (
            <p className="text-xs text-right mt-1 pr-1" style={{ color: '#717182' }}>
              {input.length}/{currentMaxLength}
            </p>
          )}
        </div>
      )}

      {/* Date input — shown for checkin_date, checkout_date */}
      {flow && DATE_STEPS.includes(flow.step) && !typing && (
        <div className="px-3 pb-3 pt-2 bg-white rounded-b-2xl border-t" style={{ borderColor: '#EEDFD3' }}>
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
              className="flex-1 rounded-xl px-3 py-2 text-sm border outline-none"
              style={{ backgroundColor: '#FFFBEB', borderColor: '#EEDFD3', color: '#1E2939' }}
            />
            <button
              onClick={handleDateSubmit}
              disabled={!dateInput}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:bg-gray-200"
              style={{ backgroundColor: '#FF6900' }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getFullUserProfile() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const fullName: string =
      payload.name || payload.nome || payload.unique_name ||
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || payload.sub || '';
    const parts = fullName.trim().split(' ');
    const initials = parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : (parts[0]?.[0] ?? 'U').toUpperCase();
    const expDate = payload.exp ? new Date(payload.exp * 1000) : null;
    return {
      fullName,
      initials,
      email: payload.email || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || '',
      role: payload.role || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.tipo || '',
      sessionExpires: expDate,
    };
  } catch {
    return null;
  }
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-3">
      <h3 className="font-bold text-base" style={{ color: '#1E2939' }}>{title}</h3>
      <hr className="mt-1" style={{ borderColor: '#EEDFD3' }} />
    </div>
  );
}

function DataField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs mb-0.5" style={{ color: '#717182' }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: '#1E2939' }}>{value || '—'}</p>
    </div>
  );
}

function UserProfilePage() {
  const profile = getFullUserProfile();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditModalDono, setShowEditModalDono] = useState(false);
  const [profileData, setProfileData] = useState<UpdateCuidadorRequest | null>(null);
  const [donoProfileData, setDonoProfileData] = useState<UpdateDonoRequest | null>(null);
  const [especialidadesInput, setEspecialidadesInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [overrideName, setOverrideName] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [cuidadorData, setCuidadorData] = useState<import('../../lib/api').Cuidador | null>(null);
  const [donoData, setDonoData] = useState<Dono | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [enderecoTravado, setEnderecoTravado] = useState(false);
  const [reservas, setReservas] = useState<Reserva[]>([]);

  useEffect(() => {
    if (!profile) return;
    const r = profile.role?.toLowerCase();
    const token = localStorage.getItem('token');
    if (!token) return;
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));

    if (r === 'cuidador' || r === 'caregiver') {
      cuidadoresApi.getAll()
        .then((lista) => {
          const meu = lista.find((c) => c.id === payload.sub);
          if (meu) {
            setCuidadorData(meu);
            if (meu.fotoUrl) setFotoUrl(meu.fotoUrl);
          }
        })
        .catch(() => {});
    } else {
      donosApi.getMeuPerfil().then(setDonoData).catch(() => {});
    }
    reservasApi.getAll().then(setReservas).catch(() => {});
  }, []);

  if (!profile) return (
    <div className="flex items-center justify-center h-64" style={{ color: '#717182' }}>
      Não foi possível carregar os dados do perfil.
    </div>
  );

  const { fullName, initials, email, role } = profile;
  const isCaregiver = role?.toLowerCase() === 'cuidador' || role?.toLowerCase() === 'caregiver';
  const displayName = overrideName ?? cuidadorData?.nome ?? donoData?.nome ?? fullName ?? 'Usuário';
  const displayEmail = cuidadorData?.email ?? donoData?.email ?? email ?? '—';
  const roleName = isCaregiver ? 'Cuidador' : 'Tutor';

  const reservasAtivas = reservas.filter(r => r.status === 'Aceita' || r.status === 'Em análise');

  const openEditModal = async () => {
    try {
      const token = localStorage.getItem('token');
      const payload = JSON.parse(atob(token!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const todos = await cuidadoresApi.getAll();
      const c = todos.find((x) => x.id === payload.sub);
      if (!c) throw new Error('Perfil não encontrado');
      setProfileData({ nome: c.nome ?? '', telefone: c.telefone ?? '', bio: c.bio ?? '', hourlyRate: c.valorDiaria ?? 0, especialidades: c.especialidades ?? [] });
      setEspecialidadesInput((c.especialidades ?? []).join(', '));
      setShowEditModal(true);
    } catch {
      toast.error('Erro ao carregar dados do perfil');
    }
  };

  const handleSave = async () => {
    if (!profileData) return;
    setSaving(true);
    try {
      const esp = especialidadesInput.split(',').map((s) => s.trim()).filter(Boolean);
      await cuidadoresApi.updateProfile({ ...profileData, especialidades: esp });
      setOverrideName(profileData.nome);
      toast.success('Perfil atualizado com sucesso!');
      setShowEditModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setDonoProfileData((p) => p ? { ...p, endereco: { ...(p.endereco ?? { cep:'',logradouro:'',numero:'',complemento:'',bairro:'',cidade:'',uf:'' }), cep: raw } } : p);
    if (raw.length < 8) { setEnderecoTravado(false); return; }
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setDonoProfileData((p) => p ? { ...p, endereco: { ...(p.endereco ?? { cep:raw,logradouro:'',numero:'',complemento:'',bairro:'',cidade:'',uf:'' }), logradouro: data.logradouro || '', bairro: data.bairro || '', cidade: data.localidade || '', uf: data.uf || '', complemento: data.complemento || p.endereco?.complemento || '' } } : p);
        setEnderecoTravado(true);
      } else {
        toast.error('CEP não encontrado.');
      }
    } catch {
      toast.error('Erro ao buscar CEP.');
    } finally {
      setCepLoading(false);
    }
  };

  const openEditModalDono = () => {
    if (!donoData) return;
    setEnderecoTravado(false);
    setDonoProfileData({
      nome: donoData.nome ?? '',
      telefone: donoData.telefone ?? '',
      endereco: donoData.endereco ?? { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' },
      contatoEmergenciaNome: donoData.contatoEmergenciaNome ?? '',
      contatoEmergenciaTelefone: donoData.contatoEmergenciaTelefone ?? '',
    });
    setShowEditModalDono(true);
  };

  const handleSaveDono = async () => {
    if (!donoProfileData) return;
    setSaving(true);
    try {
      const updated = await donosApi.updateProfile(donoProfileData);
      setDonoData(updated);
      setOverrideName(donoProfileData.nome);
      toast.success('Perfil atualizado com sucesso!');
      setShowEditModalDono(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadFoto = async (file: File) => {
    setUploadingFoto(true);
    try {
      await cuidadoresApi.uploadFoto(file);
      toast.success('Foto atualizada!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar foto');
    } finally {
      setUploadingFoto(false);
    }
  };

  const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
    'Em análise': { label: 'Em análise', bg: '#FEF3C7', color: '#92400E' },
    'Aceita':     { label: 'Confirmado', bg: '#D1FAE5', color: '#065F46' },
    'Recusada':   { label: 'Cancelado',  bg: '#FEE2E2', color: '#991B1B' },
    'Finalizada': { label: 'Finalizado', bg: '#DBEAFE', color: '#1E40AF' },
  };

  const end = cuidadorData?.endereco ?? donoData?.endereco;

  return (
    <div className="max-w-2xl mx-auto pb-16">

      {/* Cover banner */}
      <div className="relative rounded-2xl overflow-hidden mb-0" style={{ height: '160px' }}>
        {fotoUrl ? (
          <img src={fotoUrl} alt={displayName} className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #FF6900, #FE9A00)' }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.15))' }} />
      </div>

      {/* Avatar overlapping */}
      <div className="flex flex-col items-center -mt-12 mb-4 relative z-10">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden" style={{ backgroundColor: '#FFEDD4' }}>
            {fotoUrl ? (
              <img src={fotoUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #FF6900, #FE9A00)' }}>
                {initials}
              </div>
            )}
          </div>
          {isCaregiver && (
            <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-md border" style={{ borderColor: '#EEDFD3' }}>
              {uploadingFoto
                ? <span className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6900', borderTopColor: 'transparent' }} />
                : <Upload className="w-3.5 h-3.5" style={{ color: '#FF6900' }} />}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFoto(f); }} />
            </label>
          )}
        </div>

        <h2 className="mt-3 text-xl font-bold" style={{ color: '#FF6900' }}>{displayName}</h2>
        <p className="text-sm" style={{ color: '#717182' }}>{displayEmail}</p>

        {/* Role badge — outlined */}
        <div className="mt-2 flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-sm font-semibold" style={{ borderColor: '#FF6900', color: '#FF6900' }}>
          <PawPrint className="w-3.5 h-3.5" />
          {roleName}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Reservas Ativas', value: reservasAtivas.length, icon: Calendar },
          { label: 'Meus Pets',       value: '—',                    icon: PawPrint },
          { label: 'Avaliação',       value: '4.5',                  icon: Star },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl p-4 text-center shadow-sm" style={{ border: '1px solid #EEDFD3' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-1.5" style={{ backgroundColor: '#FFEDD4' }}>
              <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" style={{ color: '#FF6900' }} />
            </div>
            <p className="text-lg font-bold leading-tight" style={{ color: '#1E2939' }}>{value}</p>
            <p className="text-xs" style={{ color: '#717182' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Reservas Ativas + Meus Pets */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Reservas Ativas */}
        <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1px solid #EEDFD3' }}>
          <h3 className="font-bold text-sm mb-3" style={{ color: '#1E2939' }}>Reservas Ativas</h3>
          {reservasAtivas.length === 0 ? (
            <p className="text-xs" style={{ color: '#717182' }}>Nenhuma reserva ativa.</p>
          ) : (
            <div className="space-y-3">
              {reservasAtivas.slice(0, 3).map((r) => {
                const sc = statusConfig[r.status] ?? { label: r.status, bg: '#F3F3F5', color: '#717182' };
                return (
                  <div key={r.id} className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg, #FF6900, #FE9A00)' }}>
                      {(isCaregiver ? r.donoNome : r.cuidadorNome)?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: '#1E2939' }}>{isCaregiver ? r.donoNome : r.cuidadorNome}</p>
                      <p className="text-xs truncate" style={{ color: '#717182' }}>
                        {new Date(r.dataEntrada).toLocaleDateString('pt-BR')} – {new Date(r.dataSaida).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0" style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Meus Pets */}
        <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1px solid #EEDFD3' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm" style={{ color: '#1E2939' }}>Meus Pets</h3>
            <button className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm" style={{ backgroundColor: '#FF6900' }}>+</button>
          </div>
          {reservas.length === 0 ? (
            <p className="text-xs" style={{ color: '#717182' }}>Nenhum pet cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {[...new Map(reservas.map(r => [r.nomePet, r])).values()].slice(0, 3).map((r) => (
                <div key={r.nomePet} className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-lg" style={{ backgroundColor: '#FFEDD4' }}>
                    {r.especie?.toLowerCase().includes('gato') ? '🐱' : '🐶'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#1E2939' }}>{r.nomePet}</p>
                    <p className="text-xs" style={{ color: '#717182' }}>{r.especie}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Endereço */}
      {end && (
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4" style={{ border: '1px solid #EEDFD3' }}>
          <SectionTitle title="Endereço" />
          <div className="grid grid-cols-3 gap-x-4 gap-y-3">
            <DataField label="CEP"        value={end.cep} />
            <DataField label="Logradouro" value={end.logradouro} />
            <DataField label="Número"     value={end.numero} />
            <DataField label="Bairro"     value={end.bairro} />
            <DataField label="Cidade"     value={end.cidade} />
            <DataField label="Estado"     value={end.uf} />
          </div>
        </div>
      )}

      {/* Dados Pessoais */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4" style={{ border: '1px solid #EEDFD3' }}>
        <SectionTitle title="Dados Pessoais" />
        <div className="grid grid-cols-3 gap-x-4 gap-y-3">
          <DataField label="Nome Completo" value={displayName} />
          <DataField label="Email"         value={displayEmail} />
          <div>
            <p className="text-xs mb-0.5" style={{ color: '#717182' }}>Senha</p>
            <p className="text-sm font-medium tracking-widest" style={{ color: '#1E2939' }}>••••••••</p>
          </div>
          <DataField label="Telefone"      value={cuidadorData?.telefone ?? donoData?.telefone} />
          {isCaregiver && cuidadorData?.valorDiaria != null && (
            <DataField label="Valor/dia"   value={`R$ ${cuidadorData.valorDiaria.toFixed(2)}`} />
          )}
          {isCaregiver && cuidadorData?.especialidades?.length ? (
            <DataField label="Especialidades" value={cuidadorData.especialidades.join(', ')} />
          ) : null}
        </div>
        {isCaregiver && cuidadorData?.bio && (
          <div className="mt-3">
            <p className="text-xs mb-0.5" style={{ color: '#717182' }}>Bio</p>
            <p className="text-sm" style={{ color: '#1E2939' }}>{cuidadorData.bio}</p>
          </div>
        )}
      </div>

      {/* Contatos de Emergência */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-6" style={{ border: '1px solid #EEDFD3' }}>
        <SectionTitle title="Contatos de Emergência" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <DataField label="Nome Completo" value={donoData?.contatoEmergenciaNome} />
          <DataField label="Telefone"      value={donoData?.contatoEmergenciaTelefone} />
        </div>
      </div>

      {/* Editar Perfil */}
      <button
        onClick={isCaregiver ? openEditModal : openEditModalDono}
        className="flex items-center gap-2 px-6 py-2.5 rounded-full border-2 font-semibold text-sm transition-colors hover:bg-orange-50"
        style={{ borderColor: '#FF6900', color: '#FF6900' }}
      >
        <Edit2 className="w-4 h-4" />
        Editar Perfil
      </button>

      {/* Modal editar perfil — Dono */}
      {showEditModalDono && donoProfileData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: '#EEDFD3' }}>
              <h2 className="text-lg font-bold" style={{ color: '#1E2939' }}>Editar Perfil</h2>
              <button onClick={() => setShowEditModalDono(false)} style={{ color: '#717182' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Dados pessoais */}
              {[
                { label: 'Nome', key: 'nome' },
                { label: 'Telefone', key: 'telefone' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#FF6900' }}>{label}</label>
                  <input className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none border" style={{ backgroundColor: '#F3F3F5', borderColor: '#EEDFD3' }}
                    value={(donoProfileData as any)[key]}
                    onChange={(e) => setDonoProfileData((p) => p ? { ...p, [key]: e.target.value } : p)} />
                </div>
              ))}

              {/* Endereço */}
              <p className="text-xs font-bold uppercase tracking-wider pt-2" style={{ color: '#FF6900' }}>Endereço</p>
              <div className="grid grid-cols-2 gap-3">
                {/* CEP com busca automática */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#717182' }}>CEP</label>
                  <input
                    maxLength={8} placeholder="00000000"
                    className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none border"
                    style={{ backgroundColor: '#F3F3F5', borderColor: '#EEDFD3' }}
                    value={donoProfileData.endereco?.cep ?? ''}
                    onChange={handleCepChange}
                  />
                  {cepLoading && <p className="text-xs mt-0.5" style={{ color: '#FF6900' }}>Buscando...</p>}
                </div>
                {/* Estado (UF) */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#717182' }}>Estado (UF)</label>
                  <input
                    maxLength={2}
                    className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none border"
                    style={{ backgroundColor: enderecoTravado ? '#F9F9F9' : '#F3F3F5', borderColor: '#EEDFD3' }}
                    value={donoProfileData.endereco?.uf ?? ''}
                    readOnly={enderecoTravado}
                    onChange={(e) => setDonoProfileData((p) => p ? { ...p, endereco: { ...(p.endereco ?? { cep:'',logradouro:'',numero:'',complemento:'',bairro:'',cidade:'',uf:'' }), uf: e.target.value } } : p)}
                  />
                </div>
                {/* Logradouro */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#717182' }}>Logradouro</label>
                  <input
                    className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none border"
                    style={{ backgroundColor: enderecoTravado ? '#F9F9F9' : '#F3F3F5', borderColor: '#EEDFD3' }}
                    value={donoProfileData.endereco?.logradouro ?? ''}
                    readOnly={enderecoTravado}
                    onChange={(e) => setDonoProfileData((p) => p ? { ...p, endereco: { ...(p.endereco ?? { cep:'',logradouro:'',numero:'',complemento:'',bairro:'',cidade:'',uf:'' }), logradouro: e.target.value } } : p)}
                  />
                </div>
                {/* Número */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#717182' }}>Número</label>
                  <input
                    className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none border"
                    style={{ backgroundColor: '#F3F3F5', borderColor: '#EEDFD3' }}
                    value={donoProfileData.endereco?.numero ?? ''}
                    onChange={(e) => setDonoProfileData((p) => p ? { ...p, endereco: { ...(p.endereco ?? { cep:'',logradouro:'',numero:'',complemento:'',bairro:'',cidade:'',uf:'' }), numero: e.target.value } } : p)}
                  />
                </div>
                {/* Complemento */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#717182' }}>Complemento</label>
                  <input
                    className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none border"
                    style={{ backgroundColor: '#F3F3F5', borderColor: '#EEDFD3' }}
                    value={donoProfileData.endereco?.complemento ?? ''}
                    onChange={(e) => setDonoProfileData((p) => p ? { ...p, endereco: { ...(p.endereco ?? { cep:'',logradouro:'',numero:'',complemento:'',bairro:'',cidade:'',uf:'' }), complemento: e.target.value } } : p)}
                  />
                </div>
                {/* Bairro */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#717182' }}>Bairro</label>
                  <input
                    className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none border"
                    style={{ backgroundColor: enderecoTravado ? '#F9F9F9' : '#F3F3F5', borderColor: '#EEDFD3' }}
                    value={donoProfileData.endereco?.bairro ?? ''}
                    readOnly={enderecoTravado}
                    onChange={(e) => setDonoProfileData((p) => p ? { ...p, endereco: { ...(p.endereco ?? { cep:'',logradouro:'',numero:'',complemento:'',bairro:'',cidade:'',uf:'' }), bairro: e.target.value } } : p)}
                  />
                </div>
                {/* Cidade */}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#717182' }}>Cidade</label>
                  <input
                    className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none border"
                    style={{ backgroundColor: enderecoTravado ? '#F9F9F9' : '#F3F3F5', borderColor: '#EEDFD3' }}
                    value={donoProfileData.endereco?.cidade ?? ''}
                    readOnly={enderecoTravado}
                    onChange={(e) => setDonoProfileData((p) => p ? { ...p, endereco: { ...(p.endereco ?? { cep:'',logradouro:'',numero:'',complemento:'',bairro:'',cidade:'',uf:'' }), cidade: e.target.value } } : p)}
                  />
                </div>
              </div>

              {/* Contato de Emergência */}
              <p className="text-xs font-bold uppercase tracking-wider pt-2" style={{ color: '#FF6900' }}>Contato de Emergência</p>
              {[
                { label: 'Nome', key: 'contatoEmergenciaNome' },
                { label: 'Telefone', key: 'contatoEmergenciaTelefone' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#717182' }}>{label}</label>
                  <input className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none border" style={{ backgroundColor: '#F3F3F5', borderColor: '#EEDFD3' }}
                    value={(donoProfileData as any)[key] ?? ''}
                    onChange={(e) => setDonoProfileData((p) => p ? { ...p, [key]: e.target.value } : p)} />
                </div>
              ))}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowEditModalDono(false)} className="flex-1 py-3 rounded-full font-bold" style={{ backgroundColor: '#F3F3F5', color: '#717182' }}>Cancelar</button>
              <button onClick={handleSaveDono} disabled={saving} className="flex-1 py-3 rounded-full font-bold text-white disabled:opacity-40" style={{ backgroundColor: '#FF6900' }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar perfil — Cuidador */}
      {showEditModal && profileData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: '#EEDFD3' }}>
              <h2 className="text-lg font-bold" style={{ color: '#1E2939' }}>Editar Perfil</h2>
              <button onClick={() => setShowEditModal(false)} style={{ color: '#717182' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { label: 'Nome', key: 'nome', type: 'text' },
                { label: 'Telefone', key: 'telefone', type: 'text' },
                { label: 'Valor por dia (R$)', key: 'hourlyRate', type: 'number' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#FF6900' }}>{label}</label>
                  <input type={type} min={type === 'number' ? '0' : undefined} className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none border" style={{ backgroundColor: '#F3F3F5', borderColor: '#EEDFD3' }}
                    value={(profileData as any)[key]}
                    onChange={(e) => setProfileData((p) => p ? { ...p, [key]: type === 'number' ? Number(e.target.value) : e.target.value } : p)} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#FF6900' }}>Bio</label>
                <textarea rows={3} className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none border" style={{ backgroundColor: '#F3F3F5', borderColor: '#EEDFD3' }} value={profileData.bio} onChange={(e) => setProfileData((p) => p ? { ...p, bio: e.target.value } : p)} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#FF6900' }}>Especialidades (separadas por vírgula)</label>
                <input className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none border" style={{ backgroundColor: '#F3F3F5', borderColor: '#EEDFD3' }} value={especialidadesInput} onChange={(e) => setEspecialidadesInput(e.target.value)} placeholder="Ex: Cachorro, Gato" />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-3 rounded-full font-bold" style={{ backgroundColor: '#F3F3F5', color: '#717182' }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-full font-bold text-white disabled:opacity-40" style={{ backgroundColor: '#FF6900' }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const BASE_API = 'https://pets-api.delo.dev.br';

function ReservaChat({ reservaId, titulo, onClose }: { reservaId: string; titulo: string; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMensagem[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem('token');
  const myId = token
    ? JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub as string
    : '';

  useEffect(() => {
    chatApi.getHistorico(reservaId).then(setMessages).catch(() => {});

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${BASE_API}/hubs/chat`, {
        accessTokenFactory: () => localStorage.getItem('token') ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    conn.on('ReceberMensagem', (msg: ChatMensagem) => {
      setMessages((prev) => [...prev, msg]);
    });

    conn.start()
      .then(() => {
        setConnected(true);
        return conn.invoke('EntrarNaReserva', reservaId)
          .catch((e: any) => console.warn('[Chat] EntrarNaReserva error:', e?.message ?? e));
      })
      .catch((e: any) => console.error('[Chat] Connection error:', e?.message ?? e));

    connectionRef.current = conn;
    return () => { conn.stop(); };
  }, [reservaId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !connectionRef.current || !connected) return;
    setSending(true);
    try {
      await connectionRef.current.invoke('EnviarMensagem', reservaId, text);
      setInput('');
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error('[Chat] SendMessage error:', msg);
      toast.error(msg || 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const fmtTime = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-6 bg-black/40">
      <div className="w-full sm:w-[400px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden" style={{ height: '75vh', maxHeight: '620px' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #FF6900, #FE9A00)' }}>
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{titulo}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-300' : 'bg-white/40'}`} />
              <p className="text-xs text-white/80">{connected ? 'Conectado' : 'Conectando...'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ backgroundColor: '#FFF8F0' }}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
              <MessageCircle className="w-10 h-10 mb-2" style={{ color: '#FF6900' }} />
              <p className="text-sm font-semibold" style={{ color: '#717182' }}>Nenhuma mensagem ainda</p>
              <p className="text-xs mt-1" style={{ color: '#717182' }}>Seja o primeiro a enviar!</p>
            </div>
          )}
          {messages.map((m, i) => {
            const isMine = m.remetenteId === myId;
            return (
              <div key={m.id ?? i} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                {!isMine && (
                  <p className="text-xs font-semibold mb-1 px-1" style={{ color: '#FF6900' }}>{m.remetenteNome}</p>
                )}
                <div
                  className="max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm"
                  style={isMine
                    ? { background: 'linear-gradient(135deg, #FF6900, #FE9A00)', color: '#fff', borderBottomRightRadius: '6px' }
                    : { backgroundColor: '#fff', color: '#1E2939', border: '1px solid #EEDFD3', borderBottomLeftRadius: '6px' }
                  }
                >
                  {m.conteudo}
                </div>
                <p className="text-xs mt-1 px-1" style={{ color: '#717182' }}>{fmtTime(m.enviadoEm)}</p>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-t flex-shrink-0" style={{ borderColor: '#EEDFD3', backgroundColor: '#fff' }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Digite uma mensagem..."
            className="flex-1 px-4 py-2.5 rounded-full text-sm focus:outline-none border"
            style={{ backgroundColor: '#F3F3F5', borderColor: '#EEDFD3', color: '#1E2939' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending || !connected}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-opacity flex-shrink-0"
            style={{ backgroundColor: '#FF6900' }}
          >
            {sending
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DashboardProps {
  onLogout: () => void;
  onNavigate: (page: string, filters?: CaregiverFilters) => void;
  userRole?: string | null;
}

export function Dashboard({ onLogout, onNavigate, userRole }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [chatOpen, setChatOpen] = useState(false);
  // Desktop: sidebar expandida/recolhida. Mobile: sidebar visível/oculta como overlay
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [reservasLoading, setReservasLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [reservaFiltro, setReservaFiltro] = useState<Reserva['status'] | 'Todas'>('Todas');
  const [reservaOrdem, setReservaOrdem] = useState<Reserva['status'] | 'valor-asc' | 'valor-desc'>('Em análise');
  const [avaliacaoMedia, setAvaliacaoMedia] = useState<number | null>(null);
  const [avaliacaoModal, setAvaliacaoModal] = useState<{ reservaId: string; cuidadorId: string } | null>(null);
  const [avaliacaoNota, setAvaliacaoNota] = useState(5);
  const [avaliacaoComentario, setAvaliacaoComentario] = useState('');
  const [avaliacaoFoto, setAvaliacaoFoto] = useState<File | null>(null);
  const [avaliacaoLoading, setAvaliacaoLoading] = useState(false);
  const [chatReserva, setChatReserva] = useState<{ id: string; titulo: string } | null>(null);
  const [pagamentoModal, setPagamentoModal] = useState<{ reservaId: string; valor: number; cpf: string } | null>(null);
  const [entregaModal, setEntregaModal] = useState<{ reservaId: string; nomePet: string } | null>(null);
  const [entregaForm, setEntregaForm] = useState({ condicao: 'Ótima', apetite: 'Normal', comportamento: 'Calmo', peso: '', observacoes: '', confirmou: false });
  const [saldoRetiradaModal, setSaldoRetiradaModal] = useState(false);
  const [saldoRetiradaStep, setSaldoRetiradaStep] = useState<'form' | 'success'>('form');
  const [saldoRetiradaValor, setSaldoRetiradaValor] = useState('');
  const [saldoChavePix, setSaldoChavePix] = useState('');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('petconnect-dark') === 'true');
  const [notifReservas, setNotifReservas] = useState(true);
  const [notifMensagens, setNotifMensagens] = useState(true);
  const [notifPromos, setNotifPromos] = useState(false);

  const { firstName, fullName, initials } = getUserInfo();
  const isCaregiver = userRole?.toLowerCase() === 'cuidador' || userRole?.toLowerCase() === 'caregiver';
  const [headerFotoUrl, setHeaderFotoUrl] = useState<string | null>(null);

  // Dark mode — aplica/remove classe no <html> e persiste no localStorage
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('petconnect-dark', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('petconnect-dark', 'false');
    }
  }, [darkMode]);

  // Paleta dinâmica — usada nos containers principais e na aba Configurações
  const dm = {
    bg:            darkMode ? '#0F172A' : '#FFFBEB',
    card:          darkMode ? '#1E293B' : '#FFFFFF',
    sidebar:       darkMode ? '#1A2438' : '#FFFFFF',
    border:        darkMode ? '#334155' : '#EEDFD3',
    textPrimary:   darkMode ? '#E2E8F0' : '#1E2939',
    textSecondary: darkMode ? '#94A3B8' : '#717182',
    form:          darkMode ? '#0F172A' : '#F3F3F5',
    accent:        darkMode ? '#1E3A5F' : '#FFEDD4',
    divider:       darkMode ? '#1E293B' : '#F3F3F5',
  };

  useEffect(() => {
    if (!isCaregiver) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    cuidadoresApi.getAll()
      .then((lista) => {
        const meu = lista.find((c) => c.id === payload.sub);
        if (meu?.fotoUrl) setHeaderFotoUrl(meu.fotoUrl);
      })
      .catch(() => {});
  }, [isCaregiver]);

  const loadReservas = async () => {
    const lista = await reservasApi.getAll();
    if (!isCaregiver && lista.length > 0) {
      const todosCuidadores = await cuidadoresApi.getAll().catch(() => []);
      const nomeMap: Record<string, string> = {};
      const telMap: Record<string, string> = {};
      todosCuidadores.forEach((c) => { nomeMap[c.id] = c.nome; telMap[c.id] = c.telefone; });
      return lista.map((r) => ({
        ...r,
        cuidadorNome: r.cuidadorNome || nomeMap[r.cuidadorId] || '—',
        cuidadorTelefone: r.cuidadorTelefone || telMap[r.cuidadorId] || '',
      }));
    }
    return lista;
  };

  useEffect(() => {
    loadReservas().then(setReservas).catch(() => {});
  }, []);

  useEffect(() => {
    if ((activeTab === 'bookings' || activeTab === 'messages') && reservas.length === 0) {
      setReservasLoading(true);
      loadReservas()
        .then(setReservas)
        .catch(() => toast.error('Erro ao carregar reservas'))
        .finally(() => setReservasLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isCaregiver) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      avaliacoesApi.getByCuidador(payload.sub)
        .then((list: Avaliacao[]) => {
          if (list.length > 0) {
            setAvaliacaoMedia(list.reduce((s, a) => s + a.nota, 0) / list.length);
          }
        })
        .catch(() => {});
    } catch {}
  }, [isCaregiver]);

  const handleUpdateStatus = async (id: string, status: Reserva['status']) => {
    setUpdatingStatus(id);
    try {
      await reservasApi.updateStatus(id, status);
      setReservas((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
      const msg = status === 'Aceita' ? 'Reserva aceita!' : status === 'Finalizada' ? 'Reserva finalizada!' : 'Reserva recusada.';
      toast.success(msg);
    } catch {
      toast.error('Erro ao atualizar status da reserva');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const gerarCpf = () => {
    const d = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
    const d1 = (d.reduce((s, v, i) => s + v * (10 - i), 0) * 10) % 11 % 10;
    const d2 = ([...d, d1].reduce((s, v, i) => s + v * (11 - i), 0) * 10) % 11 % 10;
    return `${d.slice(0, 3).join('')}.${d.slice(3, 6).join('')}.${d.slice(6, 9).join('')}-${d1}${d2}`;
  };

  const handleFinalizar = async (id: string) => {
    setUpdatingStatus(id);
    try {
      const updated = await reservasApi.finalizar(id);
      setReservas((prev) => prev.map((r) => r.id === id ? { ...r, ...updated } : r));
      if (updated.status === 'Finalizada') {
        toast.success('Reserva concluída por ambas as partes!');
      } else {
        toast.success('Finalização confirmada! Aguardando a outra parte.');
      }
    } catch {
      toast.error('Erro ao finalizar reserva');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleSubmitAvaliacao = async () => {
    if (!avaliacaoModal) return;
    setAvaliacaoLoading(true);
    try {
      await avaliacoesApi.create(avaliacaoModal.cuidadorId, avaliacaoNota, avaliacaoComentario, avaliacaoFoto ?? undefined);
      toast.success('Avaliação enviada!');
      setAvaliacaoModal(null);
      setAvaliacaoNota(5);
      setAvaliacaoComentario('');
      setAvaliacaoFoto(null);
    } catch {
      toast.error('Erro ao enviar avaliação');
    } finally {
      setAvaliacaoLoading(false);
    }
  };

  const handleLogout = () => {
    clearPersistedChatState();
    localStorage.removeItem('token');
    toast.info('Sessão encerrada');
    onLogout();
  };

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setMobileSidebarOpen(false); // fecha overlay no mobile ao navegar
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard',    icon: LayoutDashboard },
    ...(isCaregiver
      ? [{ id: 'saldo', label: 'Meu Saldo', icon: Wallet }]
      : [{ id: 'pets',  label: 'Meus Pets', icon: PawPrint }]
    ),
    { id: 'bookings',  label: 'Reservas',     icon: Calendar },
    { id: 'messages',  label: 'Mensagens',    icon: MessageSquare },
    { id: 'profile',   label: 'Perfil',       icon: User },
    { id: 'settings',  label: 'Configurações',icon: Settings },
  ];

  // Conteúdo interno da sidebar (reutilizado no desktop e mobile overlay)
  const SidebarContent = ({ expanded, onClose }: { expanded: boolean; onClose?: () => void }) => (
    <>
      {/* Logo + toggle */}
      <div className={`h-16 flex items-center border-b flex-shrink-0 ${expanded ? 'px-4 gap-1' : 'justify-center'}`} style={{ borderColor: dm.border }}>
        {expanded && (
          <div className="flex-1 min-w-0">
            <PetConnectLogo size="sm" />
          </div>
        )}
        <button
          onClick={onClose ?? (() => setSidebarOpen((v) => !v))}
          className="p-1.5 rounded-lg transition-colors flex-shrink-0"
          style={{ color: dm.textSecondary }}
          title={expanded ? 'Recolher menu' : 'Expandir menu'}
        >
          {expanded ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabChange(item.id)}
            title={!expanded ? item.label : undefined}
            className={`w-full flex items-center rounded-xl transition-all ${
              expanded ? 'gap-3 px-4 py-2.5' : 'justify-center px-0 py-2.5'
            }`}
            style={
              activeTab === item.id
                ? { backgroundColor: darkMode ? '#1E3A5F' : '#FFEDD4', color: '#FF6900' }
                : { color: dm.textSecondary }
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {expanded && <span className="font-medium text-sm truncate">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-2 border-t" style={{ borderColor: dm.border }}>
        <button
          onClick={handleLogout}
          title={!expanded ? 'Sair' : undefined}
          className={`w-full flex items-center rounded-xl transition-colors py-2.5 text-red-500 hover:bg-red-50 ${
            expanded ? 'gap-3 px-4' : 'justify-center px-0'
          }`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {expanded && <span className="font-medium text-sm">Sair</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: dm.bg }}>

      {/* Mobile overlay backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar — overlay deslizante */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: dm.sidebar, borderColor: dm.border }}
      >
        <SidebarContent expanded={true} onClose={() => setMobileSidebarOpen(false)} />
      </aside>

      {/* Desktop sidebar — colapsável inline */}
      <aside
        className={`hidden lg:flex flex-col border-r transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}
        style={{ backgroundColor: dm.sidebar, borderColor: dm.border }}
      >
        <SidebarContent expanded={sidebarOpen} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-16 border-b flex items-center justify-between px-4 md:px-6 gap-3" style={{ backgroundColor: dm.card, borderColor: dm.border }}>
          {/* Hamburger — só no mobile */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg transition-colors flex-shrink-0"
            style={{ color: dm.textSecondary }}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative flex-1 max-w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: dm.textSecondary }} />
            <Input
              placeholder="Buscar Cuidadores disponíveis"
              className="pl-10 rounded-full text-sm border-0"
              style={{ backgroundColor: dm.form, color: dm.textPrimary }}
            />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="ghost" size="icon" className="relative rounded-full">
              <Bell className="w-5 h-5" style={{ color: '#717182' }} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </Button>
            <button
              type="button"
              onClick={() => handleTabChange('profile')}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-orange-50 transition-colors"
              title="Ir para o perfil"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold leading-tight" style={{ color: '#1E2939' }}>{fullName || 'Usuário'}</p>
                <p className="text-xs leading-tight capitalize" style={{ color: '#717182' }}>{userRole === 'cuidador' ? 'Cuidador' : 'Tutor'}</p>
              </div>
              {headerFotoUrl ? (
                <img src={headerFotoUrl} alt={fullName ?? ''} className="w-9 h-9 rounded-full object-cover border-2" style={{ borderColor: '#FE9A00' }} />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm border-2" style={{ background: 'linear-gradient(135deg, #FF6900, #FE9A00)', borderColor: '#FE9A00' }}>
                  {initials}
                </div>
              )}
            </button>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8" style={{ backgroundColor: dm.bg }}>
          {/* Página de Perfil */}
          {activeTab === 'profile' && <UserProfilePage />}

          {/* Aba de Reservas */}
          {activeTab === 'bookings' && (
            <div className="space-y-6">
              {/* Header da aba */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    {isCaregiver ? 'Solicitações de Reserva' : 'Minhas Reservas'}
                  </h1>
                  <p className="text-gray-500 text-sm mt-1">
                    {isCaregiver ? 'Gerencie as solicitações dos donos de pets' : 'Acompanhe o status das suas reservas'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setReservasLoading(true);
                    loadReservas()
                      .then(setReservas)
                      .catch(() => toast.error('Erro ao atualizar reservas'))
                      .finally(() => setReservasLoading(false));
                  }}
                  disabled={reservasLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-orange-200 text-orange-500 font-semibold text-sm hover:bg-orange-50 disabled:opacity-40 transition-colors shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${reservasLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Atualizar
                </button>
              </div>

              {/* Filtros */}
              {reservas.length > 0 && (() => {
                const filtros: { label: string; value: Reserva['status'] | 'Todas'; cor: string }[] = [
                  { label: 'Todas', value: 'Todas', cor: reservaFiltro === 'Todas' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border border-gray-200' },
                  { label: 'Em análise', value: 'Em análise', cor: reservaFiltro === 'Em análise' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 border border-amber-200' },
                  { label: 'Aceita', value: 'Aceita', cor: reservaFiltro === 'Aceita' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200' },
                  { label: 'Recusada', value: 'Recusada', cor: reservaFiltro === 'Recusada' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700 border border-red-200' },
                  { label: 'Finalizada', value: 'Finalizada', cor: reservaFiltro === 'Finalizada' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
                ];
                return (
                  <div className="flex items-center gap-2 flex-wrap">
                    {filtros.map((f) => {
                      const count = f.value === 'Todas' ? reservas.length : reservas.filter((r) => r.status === f.value).length;
                      if (f.value !== 'Todas' && count === 0) return null;
                      return (
                        <button
                          key={f.value}
                          onClick={() => setReservaFiltro(f.value)}
                          className={`px-4 py-2 rounded-full font-semibold text-sm transition-colors shadow-sm ${f.cor}`}
                        >
                          {f.label} <span className="opacity-70 ml-1">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {reservasLoading && (
                <div className="flex items-center justify-center py-20 text-gray-400">
                  <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mr-3" />
                  Carregando reservas...
                </div>
              )}

              {!reservasLoading && reservas.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-5">
                    <Calendar className="w-12 h-12 text-orange-300" />
                  </div>
                  <p className="text-xl font-bold text-gray-700">Nenhuma reserva encontrada</p>
                  <p className="text-sm text-gray-400 mt-2 max-w-xs">
                    {isCaregiver
                      ? 'Quando um dono solicitar seus serviços, as reservas aparecerão aqui.'
                      : 'Use o chat para encontrar um cuidador e faça sua primeira reserva.'}
                  </p>
                </div>
              )}

              {/* Ordenação */}
              {reservas.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Ordenar por:</span>
                  {([
                    { label: 'Em análise', value: 'Em análise', ativo: 'bg-amber-500 text-white', inativo: 'bg-white text-amber-600 border border-amber-200 hover:bg-amber-50' },
                    { label: 'Aceita', value: 'Aceita', ativo: 'bg-blue-500 text-white', inativo: 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50' },
                    { label: 'Recusada', value: 'Recusada', ativo: 'bg-red-500 text-white', inativo: 'bg-white text-red-500 border border-red-200 hover:bg-red-50' },
                    { label: 'Finalizada', value: 'Finalizada', ativo: 'bg-emerald-500 text-white', inativo: 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50' },
                    { label: 'Valor ↑', value: 'valor-asc', ativo: 'bg-orange-500 text-white', inativo: 'bg-white text-gray-500 border border-gray-200 hover:bg-orange-50' },
                    { label: 'Valor ↓', value: 'valor-desc', ativo: 'bg-orange-500 text-white', inativo: 'bg-white text-gray-500 border border-gray-200 hover:bg-orange-50' },
                  ] as { label: string; value: typeof reservaOrdem; ativo: string; inativo: string }[]).map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setReservaOrdem(o.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm ${reservaOrdem === o.value ? o.ativo : o.inativo}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}

              {!reservasLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...reservas]
                    .filter((r) => reservaFiltro === 'Todas' || r.status === reservaFiltro)
                    .sort((a, b) => {
                      if (reservaOrdem === 'valor-asc') return a.valorTotal - b.valorTotal;
                      if (reservaOrdem === 'valor-desc') return b.valorTotal - a.valorTotal;
                      if (a.status === reservaOrdem && b.status !== reservaOrdem) return -1;
                      if (b.status === reservaOrdem && a.status !== reservaOrdem) return 1;
                      return 0;
                    })
                    .map((r) => {
                      const entrada = new Date(r.dataEntrada);
                      const saida = new Date(r.dataSaida);
                      const dias = Math.max(1, Math.ceil((saida.getTime() - entrada.getTime()) / (1000 * 60 * 60 * 24)));
                      const fmtShort = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

                      const isPendente = r.status === 'Em análise';
                      const isAceito   = r.status === 'Aceita';
                      const jaCuidadorFinalizou = r.cuidadorConfirmouFinalizacao ?? false;
                      const jaDonoFinalizou     = r.donoConfirmouFinalizacao ?? false;

                      const gradients: Record<string, string> = {
                        'Em análise': 'from-amber-400 to-orange-500',
                        'Aceita':     'from-blue-400 to-indigo-500',
                        'Recusada':   'from-red-400 to-rose-500',
                        'Finalizada': 'from-emerald-400 to-teal-500',
                      };
                      const gradient = gradients[r.status] ?? gradients['Em análise'];
                      const speciesEmoji = r.especie?.toLowerCase().includes('gato') ? '🐱' : '🐶';
                      const pessoa = isCaregiver ? r.donoNome : r.cuidadorNome;

                      return (
                        <div key={r.id} className="rounded-2xl overflow-hidden shadow-md border border-orange-100 bg-white flex flex-col">

                          {/* Header compacto */}
                          <div className={`bg-gradient-to-r ${gradient} px-4 py-3 flex items-center justify-between gap-3`}>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
                                {speciesEmoji}
                              </div>
                              <div className="min-w-0">
                                <p className="text-white font-bold text-base leading-tight truncate">{r.nomePet}</p>
                                <p className="text-white/80 text-xs truncate">{r.especie} · {r.porte}</p>
                              </div>
                            </div>
                            <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold bg-white/20 text-white whitespace-nowrap">
                              {r.status}
                            </span>
                          </div>

                          {/* Corpo compacto */}
                          <div className="px-4 py-3 space-y-3 flex-1 flex flex-col">

                            {/* Período */}
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                              <span className="font-semibold text-gray-700">{fmtShort(entrada)}</span>
                              <span className="text-gray-400">→</span>
                              <span className="font-semibold text-gray-700">{fmtShort(saida)}</span>
                              <span className="ml-auto text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">{dias}d</span>
                            </div>

                            {/* Pessoa */}
                            {pessoa && (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <User className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                                <span className="truncate font-medium">{pessoa}</span>
                              </div>
                            )}

                            <div className="mt-auto space-y-2 pt-2 border-t border-orange-100">
                              {/* Valor */}
                              <div className="flex items-center justify-between">
                                <span className="text-lg font-extrabold text-orange-500">R$ {r.valorTotal.toFixed(2)}</span>
                                <span className="text-xs text-gray-400">{dias}d × R${(r.valorTotal / dias).toFixed(0)}/dia</span>
                              </div>

                              {/* Ações */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={() => setChatReserva({ id: r.id, titulo: `${r.nomePet} — ${pessoa ?? ''}` })}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border font-semibold text-xs transition-colors hover:bg-orange-50"
                                  style={{ borderColor: '#FF6900', color: '#FF6900' }}
                                >
                                  <MessageCircle className="w-3.5 h-3.5" /> Chat
                                </button>

                                {!isCaregiver && r.cuidadorTelefone && (
                                  <a
                                    href={`https://wa.me/55${r.cuidadorTelefone.replace(/\D/g, '')}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold text-xs transition-colors"
                                  >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.852L.057 23.55a.75.75 0 00.921.921l5.696-1.475A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.693-.497-5.241-1.367l-.375-.214-3.882 1.005 1.033-3.772-.234-.389A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                                    </svg>
                                    WhatsApp
                                  </a>
                                )}

                                <div className="flex items-center gap-1.5 ml-auto">
                                  {isCaregiver && isPendente && (
                                    <>
                                      <button onClick={() => handleUpdateStatus(r.id, 'Recusada')} disabled={updatingStatus === r.id} className="px-3 py-1.5 rounded-lg border border-red-300 text-red-500 font-bold text-xs hover:bg-red-50 disabled:opacity-40">
                                        {updatingStatus === r.id ? '...' : '✕'}
                                      </button>
                                      <button onClick={() => handleUpdateStatus(r.id, 'Aceita')} disabled={updatingStatus === r.id} className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold text-xs disabled:opacity-40">
                                        {updatingStatus === r.id ? '...' : '✓ Aceitar'}
                                      </button>
                                    </>
                                  )}
                                  {isCaregiver && isAceito && (
                                    <button
                                      onClick={() => {
                                        if (!jaCuidadorFinalizou) {
                                          setEntregaForm({ condicao: 'Ótima', apetite: 'Normal', comportamento: 'Calmo', peso: '', observacoes: '', confirmou: false });
                                          setEntregaModal({ reservaId: r.id, nomePet: r.nomePet });
                                        }
                                      }}
                                      disabled={updatingStatus === r.id || jaCuidadorFinalizou}
                                      className={`px-3 py-1.5 rounded-lg font-bold text-xs ${jaCuidadorFinalizou ? 'bg-emerald-500 text-white cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-40'}`}
                                    >
                                      {updatingStatus === r.id ? '...' : jaCuidadorFinalizou ? '✓ Entregue' : '🐾 Entregar Pet'}
                                    </button>
                                  )}
                                  {!isCaregiver && isAceito && (
                                    <button
                                      onClick={() => !jaDonoFinalizou && setPagamentoModal({ reservaId: r.id, valor: r.valorTotal, cpf: gerarCpf() })}
                                      disabled={updatingStatus === r.id || jaDonoFinalizou}
                                      className={`px-3 py-1.5 rounded-lg font-bold text-xs ${jaDonoFinalizou ? 'bg-emerald-500 text-white cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-40'}`}
                                    >
                                      {updatingStatus === r.id ? '...' : jaDonoFinalizou ? '✓ Finalizado' : '💳 Finalizar'}
                                    </button>
                                  )}
                                  {!isCaregiver && r.status === 'Finalizada' && (
                                    <button onClick={() => setAvaliacaoModal({ reservaId: r.id, cuidadorId: r.cuidadorId })} className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs">
                                      ⭐ Avaliar
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* ── Aba Mensagens ── */}
          {activeTab === 'messages' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="mb-2">
                <h1 className="text-2xl font-bold" style={{ color: '#1E2939' }}>Mensagens</h1>
                <p className="text-sm mt-0.5" style={{ color: '#717182' }}>Suas conversas de reserva</p>
              </div>

              {reservasLoading && (
                <div className="flex items-center justify-center py-16">
                  <span className="w-8 h-8 border-4 border-orange-300 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!reservasLoading && reservas.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-60">
                  <MessageSquare className="w-14 h-14 mb-4" style={{ color: '#FF6900' }} />
                  <p className="text-base font-semibold" style={{ color: '#717182' }}>Nenhuma conversa ainda</p>
                  <p className="text-sm mt-1" style={{ color: '#717182' }}>Quando você fizer uma reserva, o chat aparecerá aqui.</p>
                </div>
              )}

              {!reservasLoading && reservas.map((r) => {
                const outraPessoa = isCaregiver ? (r.donoNome ?? 'Dono') : (r.cuidadorNome ?? 'Cuidador');
                const statusColor: Record<string, string> = {
                  'Em análise': '#FE9A00',
                  'Aceita': '#22c55e',
                  'Recusada': '#ef4444',
                  'Finalizada': '#717182',
                };
                return (
                  <button
                    key={r.id}
                    onClick={() => setChatReserva({ id: r.id, titulo: `${r.nomePet} — ${outraPessoa}` })}
                    className="w-full flex items-center gap-4 bg-white rounded-2xl px-5 py-4 shadow-sm text-left transition-all hover:shadow-md hover:scale-[1.01]"
                    style={{ border: '1px solid #EEDFD3' }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-lg"
                      style={{ background: 'linear-gradient(135deg, #FF6900, #FE9A00)' }}
                    >
                      {outraPessoa.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: '#1E2939' }}>{outraPessoa}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: '#717182' }}>🐾 {r.nomePet}</p>
                    </div>

                    {/* Status badge */}
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{ backgroundColor: `${statusColor[r.status] ?? '#717182'}18`, color: statusColor[r.status] ?? '#717182' }}
                    >
                      {r.status}
                    </span>

                    {/* Arrow */}
                    <MessageCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#FF6900' }} />
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Aba Saldo (Cuidador) ── */}
          {activeTab === 'saldo' && isCaregiver && (() => {
            const saldoDisponivel = 2847.50;
            const saldoPendente = 680.00;
            const totalRecebido = 12340.00;
            const totalMes = 1340.00;
            const transacoes = [
              ...(reservas.filter(r => r.status === 'Finalizada').slice(0, 6).map((r, i) => ({
                id: r.id,
                tipo: 'entrada' as const,
                descricao: `Hospedagem — ${r.nomePet}`,
                pessoa: r.donoNome ?? 'Tutor',
                valor: r.valorTotal,
                data: new Date(r.dataSaida).toLocaleDateString('pt-BR'),
                status: 'Concluído',
              }))),
              { id: 'saque-1', tipo: 'saida' as const, descricao: 'Transferência PIX', pessoa: 'Sua conta', valor: 500, data: '10/04/2026', status: 'Concluído' },
              { id: 'saque-2', tipo: 'saida' as const, descricao: 'Transferência PIX', pessoa: 'Sua conta', valor: 300, data: '28/03/2026', status: 'Concluído' },
            ];
            const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            return (
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: '#1E2939' }}>Meu Saldo</h1>
                  <p className="text-sm mt-0.5" style={{ color: '#717182' }}>Gerencie seus ganhos e transferências</p>
                </div>

                {/* Main Balance Card */}
                <div className="relative rounded-3xl overflow-hidden p-6 text-white shadow-xl" style={{ background: 'linear-gradient(135deg, #FF6900 0%, #FE9A00 100%)' }}>
                  {/* Decorative circles */}
                  <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10" style={{ background: 'white' }} />
                  <div className="absolute -bottom-12 -left-8 w-40 h-40 rounded-full opacity-10" style={{ background: 'white' }} />

                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet className="w-4 h-4 opacity-80" />
                      <p className="text-sm opacity-80 font-medium">Saldo disponível</p>
                    </div>
                    <p className="text-4xl font-extrabold tracking-tight mb-1">{fmtBRL(saldoDisponivel)}</p>
                    <p className="text-sm opacity-75">{fullName || 'Cuidador'} • PetConnect</p>

                    <div className="flex gap-4 mt-6">
                      <div className="bg-white/20 rounded-2xl px-4 py-3 flex-1 backdrop-blur-sm">
                        <p className="text-xs opacity-80 mb-0.5">Pendente</p>
                        <p className="font-bold">{fmtBRL(saldoPendente)}</p>
                      </div>
                      <div className="bg-white/20 rounded-2xl px-4 py-3 flex-1 backdrop-blur-sm">
                        <p className="text-xs opacity-80 mb-0.5">Este mês</p>
                        <p className="font-bold">{fmtBRL(totalMes)}</p>
                      </div>
                      <div className="bg-white/20 rounded-2xl px-4 py-3 flex-1 backdrop-blur-sm">
                        <p className="text-xs opacity-80 mb-0.5">Total recebido</p>
                        <p className="font-bold">{fmtBRL(totalRecebido)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Retirar', icon: ArrowDownToLine, action: () => { setSaldoRetiradaStep('form'); setSaldoRetiradaValor(''); setSaldoChavePix(''); setSaldoRetiradaModal(true); } },
                    { label: 'Extrato', icon: CreditCard, action: () => {} },
                    { label: 'Relatório', icon: TrendingUp, action: () => {} },
                  ].map(({ label, icon: Icon, action }) => (
                    <button
                      key={label}
                      onClick={action}
                      className="flex flex-col items-center gap-2 bg-white rounded-2xl py-4 px-3 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] active:scale-95"
                      style={{ border: '1px solid #EEDFD3' }}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFEDD4' }}>
                        <Icon className="w-5 h-5" style={{ color: '#FF6900' }} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: '#1E2939' }}>{label}</span>
                    </button>
                  ))}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid #EEDFD3' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-sm font-semibold" style={{ color: '#1E2939' }}>Reservas concluídas</p>
                    </div>
                    <p className="text-3xl font-extrabold" style={{ color: '#1E2939' }}>{reservas.filter(r => r.status === 'Finalizada').length}</p>
                    <p className="text-xs mt-1" style={{ color: '#717182' }}>de {reservas.length} reservas no total</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid #EEDFD3' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                        <Clock3 className="w-4 h-4 text-amber-500" />
                      </div>
                      <p className="text-sm font-semibold" style={{ color: '#1E2939' }}>Valor médio / reserva</p>
                    </div>
                    <p className="text-3xl font-extrabold" style={{ color: '#1E2939' }}>
                      {reservas.length > 0
                        ? fmtBRL(reservas.reduce((s, r) => s + r.valorTotal, 0) / reservas.length)
                        : fmtBRL(0)}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#717182' }}>calculado sobre todas as reservas</p>
                  </div>
                </div>

                {/* Transactions */}
                <div>
                  <h3 className="font-bold text-base mb-3" style={{ color: '#1E2939' }}>Histórico de transações</h3>
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid #EEDFD3' }}>
                    {transacoes.length === 0 ? (
                      <div className="p-8 text-center text-sm" style={{ color: '#717182' }}>
                        <Banknote className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        Nenhuma transação ainda.
                      </div>
                    ) : (
                      transacoes.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between px-5 py-4 border-b last:border-b-0 hover:bg-orange-50/30 transition-colors"
                          style={{ borderColor: '#F3F3F5' }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: tx.tipo === 'entrada' ? '#D1FAE5' : '#FEE2E2' }}
                            >
                              {tx.tipo === 'entrada'
                                ? <ArrowDownToLine className="w-4 h-4 text-emerald-600 rotate-180" />
                                : <ArrowDownToLine className="w-4 h-4 text-red-500" />
                              }
                            </div>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: '#1E2939' }}>{tx.descricao}</p>
                              <p className="text-xs" style={{ color: '#717182' }}>{tx.pessoa} • {tx.data}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold text-sm ${tx.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-500'}`}>
                              {tx.tipo === 'entrada' ? '+' : '-'}{fmtBRL(tx.valor)}
                            </p>
                            <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#717182' }}>
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />{tx.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Info Banner */}
                <div className="rounded-2xl p-4 flex items-start gap-3" style={{ backgroundColor: '#FFF7F0', border: '1px solid #EEDFD3' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: '#FFEDD4' }}>
                    <Wallet className="w-4 h-4" style={{ color: '#FF6900' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#1E2939' }}>Pagamentos seguros pela PetConnect</p>
                    <p className="text-xs mt-0.5" style={{ color: '#717182' }}>Os valores são liberados automaticamente após 48h da confirmação de entrega do pet. Retiradas via PIX em até 1 dia útil.</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Aba Configurações ── */}
          {activeTab === 'settings' && (() => {
            const SettingRow = ({
              icon: Icon,
              iconBg,
              iconColor,
              label,
              description,
              children,
            }: {
              icon: React.ElementType;
              iconBg: string;
              iconColor: string;
              label: string;
              description?: string;
              children?: React.ReactNode;
            }) => (
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${dm.divider}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg }}>
                    <Icon className="w-4 h-4" style={{ color: iconColor }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: dm.textPrimary }}>{label}</p>
                    {description && <p className="text-xs mt-0.5" style={{ color: dm.textSecondary }}>{description}</p>}
                  </div>
                </div>
                {children}
              </div>
            );

            const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
              <button
                onClick={onChange}
                className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none flex-shrink-0"
                style={{ backgroundColor: value ? '#FF6900' : (darkMode ? '#334155' : '#CBD5E1') }}
              >
                <span
                  className="inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300"
                  style={{ transform: value ? 'translateX(22px)' : 'translateX(2px)' }}
                />
              </button>
            );

            const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
              <div className="rounded-2xl overflow-hidden shadow-sm" style={{ backgroundColor: dm.card, border: `1px solid ${dm.border}` }}>
                <div className="px-5 py-3" style={{ borderBottom: `1px solid ${dm.border}`, backgroundColor: darkMode ? '#0F172A' : '#FAFAFA' }}>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#FF6900' }}>{title}</p>
                </div>
                {children}
              </div>
            );

            return (
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: dm.textPrimary }}>Configurações</h1>
                  <p className="text-sm mt-0.5" style={{ color: dm.textSecondary }}>Personalize sua experiência no PetConnect</p>
                </div>

                {/* Aparência */}
                <SectionCard title="Aparência">
                  <SettingRow
                    icon={darkMode ? Moon : Sun}
                    iconBg={darkMode ? '#1E3A5F' : '#FFEDD4'}
                    iconColor={darkMode ? '#60A5FA' : '#FF6900'}
                    label="Modo Escuro"
                    description={darkMode ? 'Interface escura ativada — mais confortável à noite' : 'Ative para reduzir o brilho da tela'}
                  >
                    <Toggle value={darkMode} onChange={() => setDarkMode(v => !v)} />
                  </SettingRow>
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold mb-3" style={{ color: dm.textSecondary }}>Tamanho da fonte</p>
                    <div className="flex gap-2">
                      {['Pequena', 'Média', 'Grande'].map((size, i) => (
                        <button
                          key={size}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors"
                          style={i === 1
                            ? { backgroundColor: '#FF6900', color: '#fff', borderColor: '#FF6900' }
                            : { backgroundColor: dm.form, color: dm.textSecondary, borderColor: dm.border }
                          }
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </SectionCard>

                {/* Notificações */}
                <SectionCard title="Notificações">
                  <SettingRow
                    icon={BellIcon}
                    iconBg={darkMode ? '#1E293B' : '#FEF3C7'}
                    iconColor="#F59E0B"
                    label="Reservas e agendamentos"
                    description="Alertas sobre novas reservas e atualizações de status"
                  >
                    <Toggle value={notifReservas} onChange={() => setNotifReservas(v => !v)} />
                  </SettingRow>
                  <SettingRow
                    icon={MessageSquare}
                    iconBg={darkMode ? '#1E293B' : '#DBEAFE'}
                    iconColor="#3B82F6"
                    label="Mensagens"
                    description="Notificações de novas mensagens no chat"
                  >
                    <Toggle value={notifMensagens} onChange={() => setNotifMensagens(v => !v)} />
                  </SettingRow>
                  <SettingRow
                    icon={BellIcon}
                    iconBg={darkMode ? '#1E293B' : '#D1FAE5'}
                    iconColor="#10B981"
                    label="Promoções e novidades"
                    description="Dicas, ofertas e atualizações da plataforma"
                  >
                    <Toggle value={notifPromos} onChange={() => setNotifPromos(v => !v)} />
                  </SettingRow>
                </SectionCard>

                {/* Privacidade */}
                <SectionCard title="Privacidade e Segurança">
                  <SettingRow
                    icon={Lock}
                    iconBg={darkMode ? '#1E293B' : '#EDE9FE'}
                    iconColor="#8B5CF6"
                    label="Alterar senha"
                    description="Atualize sua senha de acesso"
                  >
                    <button className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors" style={{ backgroundColor: dm.form, color: dm.textSecondary }}>
                      Alterar
                    </button>
                  </SettingRow>
                  <SettingRow
                    icon={Smartphone}
                    iconBg={darkMode ? '#1E293B' : '#DCFCE7'}
                    iconColor="#22C55E"
                    label="Verificação em duas etapas"
                    description="Proteja sua conta com autenticação adicional"
                  >
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: darkMode ? '#1E293B' : '#FEE2E2', color: '#EF4444' }}>Inativo</span>
                  </SettingRow>
                  <SettingRow
                    icon={Globe}
                    iconBg={darkMode ? '#1E293B' : '#F0FDF4'}
                    iconColor="#16A34A"
                    label="Visibilidade do perfil"
                    description="Seu perfil é visível para todos os usuários"
                  >
                    <button className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors" style={{ backgroundColor: dm.form, color: dm.textSecondary }}>
                      Gerenciar
                    </button>
                  </SettingRow>
                </SectionCard>

                {/* Sobre */}
                <SectionCard title="Sobre o App">
                  <div className="px-5 py-4 space-y-3">
                    {[
                      { label: 'Versão', value: '2.4.1' },
                      { label: 'Política de Privacidade', value: '→' },
                      { label: 'Termos de Uso', value: '→' },
                      { label: 'Central de Ajuda', value: '→' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between">
                        <p className="text-sm" style={{ color: dm.textPrimary }}>{label}</p>
                        <p className="text-sm font-semibold" style={{ color: dm.textSecondary }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                {/* Zona de perigo */}
                <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: darkMode ? '#1E293B' : '#FFF5F5', border: `1px solid ${darkMode ? '#7F1D1D40' : '#FECACA'}` }}>
                  <div className="flex items-center gap-3 mb-3">
                    <Trash2 className="w-4 h-4 text-red-500" />
                    <p className="font-bold text-sm text-red-500">Zona de Perigo</p>
                  </div>
                  <p className="text-xs mb-4" style={{ color: dm.textSecondary }}>Estas ações são irreversíveis. Prossiga com cautela.</p>
                  <button className="w-full py-2.5 rounded-xl border-2 border-red-400 text-red-500 font-bold text-sm hover:bg-red-50 transition-colors">
                    Excluir minha conta
                  </button>
                </div>
              </div>
            );
          })()}

          {activeTab !== 'profile' && activeTab !== 'bookings' && activeTab !== 'messages' && activeTab !== 'saldo' && activeTab !== 'settings' && (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Welcome */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#1E2939' }}>
                  Bem-vindo de volta{firstName ? `, ${firstName}` : ''}! 👋
                </h1>
                <p className="text-sm mt-0.5" style={{ color: '#717182' }}>Aqui está o resumo do que está acontecendo hoje.</p>
              </div>
              <button
                onClick={() => setChatOpen(true)}
                className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-semibold text-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#FF6900' }}
              >
                <PlusCircle className="w-4 h-4" />
                Nova agendamento
              </button>
            </div>

            {/* Stats Grid */}
            {(() => {
              const reservasAtivas = reservas.filter(r => r.status === 'Aceita').length;
              const reservasPendentes = reservas.filter(r => r.status === 'Em análise').length;
              const totalReservas = reservas.length;

              // Fallback mockado quando não há dados reais
              const statsCards = isCaregiver ? [
                {
                  label: 'Solicitações Ativas',
                  value: reservasAtivas || (totalReservas === 0 ? 4 : reservasAtivas),
                  sub: reservasPendentes > 0 ? `${reservasPendentes} aguardando resposta` : 'Nenhuma pendente',
                  trend: '+12%',
                  trendUp: true,
                  icon: Calendar,
                  iconBg: darkMode ? '#1E3A5F' : '#DBEAFE',
                  iconColor: '#3B82F6',
                },
                {
                  label: 'Pets Atendidos',
                  value: totalReservas || 18,
                  sub: 'Total histórico',
                  trend: '+3',
                  trendUp: true,
                  icon: PawPrint,
                  iconBg: darkMode ? '#1E3A5F' : '#FFEDD4',
                  iconColor: '#FF6900',
                },
                {
                  label: 'Avaliação Média',
                  value: avaliacaoMedia !== null ? avaliacaoMedia.toFixed(1) : '4.8',
                  sub: `${avaliacaoMedia !== null ? 'avaliação real' : 'média estimada'}`,
                  trend: '★★★★★',
                  trendUp: true,
                  icon: Star,
                  iconBg: darkMode ? '#2D2A1A' : '#FEF9C3',
                  iconColor: '#EAB308',
                },
                {
                  label: 'Taxa de Aceite',
                  value: totalReservas > 0
                    ? `${Math.round((reservasAtivas / totalReservas) * 100)}%`
                    : '94%',
                  sub: 'Reservas confirmadas',
                  trend: '+5%',
                  trendUp: true,
                  icon: TrendingUp,
                  iconBg: darkMode ? '#0D2818' : '#DCFCE7',
                  iconColor: '#22C55E',
                },
              ] : [
                {
                  label: 'Reservas Ativas',
                  value: reservasAtivas || (totalReservas === 0 ? 2 : reservasAtivas),
                  sub: reservasPendentes > 0 ? `${reservasPendentes} em análise` : 'Tudo confirmado ✓',
                  trend: reservasPendentes > 0 ? `${reservasPendentes} pendente${reservasPendentes !== 1 ? 's' : ''}` : 'Atualizado',
                  trendUp: true,
                  icon: Calendar,
                  iconBg: darkMode ? '#1E3A5F' : '#DBEAFE',
                  iconColor: '#3B82F6',
                },
                {
                  label: 'Pets Cadastrados',
                  value: [...new Set(reservas.map(r => r.nomePet))].length || 3,
                  sub: 'No sistema PetConnect',
                  trend: 'Ativo',
                  trendUp: true,
                  icon: PawPrint,
                  iconBg: darkMode ? '#1E3A5F' : '#FFEDD4',
                  iconColor: '#FF6900',
                },
                {
                  label: 'Mensagens Novas',
                  value: reservas.length || 7,
                  sub: 'Conversas abertas',
                  trend: '+2 hoje',
                  trendUp: true,
                  icon: MessageSquare,
                  iconBg: darkMode ? '#1E293B' : '#EDE9FE',
                  iconColor: '#8B5CF6',
                },
                {
                  label: 'Avaliações Dadas',
                  value: reservas.filter(r => r.status === 'Finalizada').length || 5,
                  sub: 'Cuidadores avaliados',
                  trend: '⭐ Média 4.8',
                  trendUp: true,
                  icon: Star,
                  iconBg: darkMode ? '#2D2A1A' : '#FEF9C3',
                  iconColor: '#EAB308',
                },
              ];

              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {statsCards.map((stat, i) => (
                    <div
                      key={i}
                      className="rounded-2xl p-5 shadow-sm flex flex-col gap-3 transition-all hover:shadow-md hover:scale-[1.01]"
                      style={{ backgroundColor: dm.card, border: `1px solid ${dm.border}` }}
                    >
                      {/* Icon + trend */}
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: stat.iconBg }}>
                          <stat.icon className="w-5 h-5" style={{ color: stat.iconColor }} />
                        </div>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: stat.trendUp ? (darkMode ? '#0D2818' : '#DCFCE7') : (darkMode ? '#2D0A0A' : '#FEE2E2'),
                            color: stat.trendUp ? '#16A34A' : '#DC2626',
                          }}
                        >
                          {stat.trend}
                        </span>
                      </div>
                      {/* Value */}
                      <div>
                        <p className="text-3xl font-extrabold leading-none" style={{ color: dm.textPrimary }}>{stat.value}</p>
                        <p className="text-xs mt-1.5 font-medium" style={{ color: dm.textSecondary }}>{stat.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: darkMode ? '#475569' : '#CBD5E1' }}>{stat.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Encontrar Cuidadores - Banner */}
            {!isCaregiver && (
              <div
                onClick={() => onNavigate('caregivers')}
                className="rounded-2xl p-5 cursor-pointer flex items-center justify-between gap-4 transition-opacity hover:opacity-95"
                style={{ backgroundColor: '#FF6900' }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Encontrar Cuidadores</h3>
                    <p className="text-white/80 text-sm">Navegue por nossa lista de cuidadores de confiança e encontre o perfeito para seu pet</p>
                  </div>
                </div>
                <button className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-full bg-white font-semibold text-sm flex-shrink-0" style={{ color: '#FF6900' }}>
                  Ver Cuidadores
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            {/* Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Reservations */}
              <div className="lg:col-span-2 space-y-3">
                <h3 className="font-bold text-base" style={{ color: '#1E2939' }}>Reservas Recentes</h3>
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid #EEDFD3' }}>
                  {(() => {
                    const twoWeeksAgo = new Date();
                    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
                    const recentes = reservas.filter((r) => new Date(r.dataEntrada) >= twoWeeksAgo || new Date(r.dataSaida) >= twoWeeksAgo);
                    if (recentes.length === 0) {
                      return (
                        <div className="p-8 text-center text-sm" style={{ color: '#717182' }}>
                          Nenhuma reserva recente.
                        </div>
                      );
                    }
                    const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
                      'Em análise': { label: 'Em análise', bg: '#FEF3C7', color: '#92400E' },
                      'Aceita':     { label: 'Confirmado', bg: '#D1FAE5', color: '#065F46' },
                      'Recusada':   { label: 'Cancelado',  bg: '#FEE2E2', color: '#991B1B' },
                      'Finalizada': { label: 'Finalizado', bg: '#DBEAFE', color: '#1E40AF' },
                    };
                    return recentes.map((r) => {
                      const sc = statusConfig[r.status] ?? { label: r.status, bg: '#F3F3F5', color: '#717182' };
                      return (
                        <div key={r.id} className="flex items-center justify-between px-5 py-4 border-b last:border-b-0 hover:bg-orange-50/40 transition-colors" style={{ borderColor: '#F3F3F5' }}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: 'linear-gradient(135deg, #FF6900, #FE9A00)' }}>
                              {(isCaregiver ? r.donoNome : r.cuidadorNome)?.[0]?.toUpperCase() ?? '?'}
                            </div>
                            <div>
                              <p className="font-semibold text-sm" style={{ color: '#1E2939' }}>{isCaregiver ? r.donoNome : r.cuidadorNome}</p>
                              <p className="text-xs" style={{ color: '#717182' }}>
                                Pet: {r.nomePet} • {new Date(r.dataEntrada).toLocaleDateString('pt-BR')} – {new Date(r.dataSaida).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0" style={{ backgroundColor: sc.bg, color: sc.color }}>
                            {sc.label}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Tips / Suggestions */}
              <div className="space-y-3">
                <h3 className="font-bold text-base" style={{ color: '#1E2939' }}>
                  {isCaregiver ? 'Seu Desempenho' : 'Dicas para você'}
                </h3>
                {isCaregiver && avaliacaoMedia !== null ? (
                  <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid #EEDFD3' }}>
                    <p className="text-xs font-medium mb-2" style={{ color: '#717182' }}>Avaliação Média</p>
                    <div className="flex items-center gap-3">
                      <span className="text-4xl font-bold" style={{ color: '#FF6900' }}>{avaliacaoMedia.toFixed(1)}</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map((s) => (
                          <Star key={s} className={`w-4 h-4 ${s <= Math.round(avaliacaoMedia) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid #EEDFD3' }}>
                    <h4 className="font-bold text-sm mb-1" style={{ color: '#1E2939' }}>Complete seu perfil!</h4>
                    <p className="text-xs mb-4" style={{ color: '#717182' }}>
                      Perfis completos têm 3x mais chances de encontrar cuidadores ideais.
                    </p>
                    <button
                      onClick={() => handleTabChange('profile')}
                      className="w-full py-2.5 rounded-full text-white font-semibold text-sm transition-opacity hover:opacity-90"
                      style={{ backgroundColor: '#FF6900' }}
                    >
                      Editar Perfil
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
        </div>
      </main>

      {/* Chat de Reserva */}
      {chatReserva && (
        <ReservaChat
          reservaId={chatReserva.id}
          titulo={chatReserva.titulo}
          onClose={() => setChatReserva(null)}
        />
      )}

      {/* Chat Widget e FAB — apenas para tutores (não cuidadores) */}
      {!isCaregiver && (
        <>
          {chatOpen && (
            <div className="fixed inset-0 z-50 pointer-events-none sm:bottom-24 sm:left-6 sm:right-auto sm:top-auto">
              <div className="h-full w-full bg-white border border-gray-100 flex flex-col overflow-hidden pointer-events-auto animate-in slide-in-from-bottom-6 duration-200 sm:h-[min(68vh,640px)] sm:max-w-[420px] sm:rounded-2xl sm:shadow-2xl">
                <ChatWidget onClose={() => setChatOpen(false)} onNavigate={onNavigate} />
              </div>
            </div>
          )}

          {/* FAB button — left, above sidebar bottom */}
          <div className="fixed bottom-20 left-6 z-50">
            {!chatOpen && (
              <button
                onClick={() => setChatOpen(true)}
                className="relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 bg-gradient-to-br from-orange-500 to-amber-500 hover:scale-110 hover:shadow-orange-200 hover:shadow-xl"
              >
                <MessageCircle className="w-6 h-6 text-white" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Modal de Retirada de Saldo (Cuidador) ── */}
      {saldoRetiradaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-center justify-between" style={{ borderBottom: '1px solid #EEDFD3' }}>
              <div>
                <h2 className="text-lg font-extrabold" style={{ color: '#1E2939' }}>
                  {saldoRetiradaStep === 'form' ? 'Retirar Saldo' : 'Solicitação Enviada!'}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: '#717182' }}>
                  {saldoRetiradaStep === 'form' ? 'Transferência via PIX em até 1 dia útil' : 'Sua transferência está em processamento'}
                </p>
              </div>
              <button onClick={() => setSaldoRetiradaModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {saldoRetiradaStep === 'form' ? (
              <div className="px-6 py-5 space-y-4">
                {/* Saldo disponível */}
                <div className="rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(135deg,#FF6900,#FE9A00)' }}>
                  <p className="text-white/80 text-xs mb-1">Saldo disponível para retirada</p>
                  <p className="text-white text-2xl font-extrabold">R$ 2.847,50</p>
                </div>

                {/* Valor a retirar */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#FF6900' }}>Valor a retirar (R$)</label>
                  <input
                    type="number"
                    min="1"
                    max="2847.50"
                    placeholder="Ex: 500,00"
                    value={saldoRetiradaValor}
                    onChange={(e) => setSaldoRetiradaValor(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2"
                    style={{ borderColor: '#EEDFD3', backgroundColor: '#F3F3F5', color: '#1E2939' }}
                  />
                </div>

                {/* Chave PIX */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#FF6900' }}>Chave PIX</label>
                  <input
                    type="text"
                    placeholder="CPF, e-mail, telefone ou chave aleatória"
                    value={saldoChavePix}
                    onChange={(e) => setSaldoChavePix(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: '#EEDFD3', backgroundColor: '#F3F3F5', color: '#1E2939' }}
                  />
                </div>

                {/* Info */}
                <div className="rounded-xl p-3 flex items-start gap-2 text-xs" style={{ backgroundColor: '#FFF7F0', border: '1px solid #EEDFD3', color: '#717182' }}>
                  <Clock3 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#FF6900' }} />
                  Transferências são processadas em até 1 dia útil após confirmação.
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setSaldoRetiradaModal(false)}
                    className="flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-colors hover:bg-gray-50"
                    style={{ borderColor: '#EEDFD3', color: '#717182' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setSaldoRetiradaStep('success')}
                    disabled={!saldoRetiradaValor || !saldoChavePix || Number(saldoRetiradaValor) <= 0}
                    className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#FF6900,#FE9A00)' }}
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-6 py-8 flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <div>
                  <p className="text-lg font-extrabold" style={{ color: '#1E2939' }}>Solicitação enviada!</p>
                  <p className="text-sm mt-1" style={{ color: '#717182' }}>
                    A transferência de <span className="font-bold" style={{ color: '#FF6900' }}>R$ {Number(saldoRetiradaValor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> para a chave{' '}
                    <span className="font-semibold">{saldoChavePix}</span> será processada em até 1 dia útil.
                  </p>
                </div>
                <button
                  onClick={() => setSaldoRetiradaModal(false)}
                  className="w-full py-2.5 rounded-xl text-white font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg,#FF6900,#FE9A00)' }}
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal de Entrega (Cuidador) ── */}
      {entregaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-center justify-between" style={{ borderBottom: '1px solid #EEDFD3' }}>
              <div>
                <h2 className="text-lg font-extrabold" style={{ color: '#1E2939' }}>Relatório de Entrega</h2>
                <p className="text-xs mt-0.5" style={{ color: '#717182' }}>🐾 {entregaModal.nomePet}</p>
              </div>
              <button onClick={() => setEntregaModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Linha: Condição + Apetite */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#717182' }}>Condição geral</label>
                  <select
                    value={entregaForm.condicao}
                    onChange={(e) => setEntregaForm((f) => ({ ...f, condicao: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2"
                    style={{ borderColor: '#EEDFD3', color: '#1E2939', focusRingColor: '#FF6900' }}
                  >
                    <option>Ótima</option>
                    <option>Boa</option>
                    <option>Regular</option>
                    <option>Precisou de atenção</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#717182' }}>Apetite</label>
                  <select
                    value={entregaForm.apetite}
                    onChange={(e) => setEntregaForm((f) => ({ ...f, apetite: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2"
                    style={{ borderColor: '#EEDFD3', color: '#1E2939' }}
                  >
                    <option>Normal</option>
                    <option>Aumentado</option>
                    <option>Reduzido</option>
                    <option>Não se alimentou</option>
                  </select>
                </div>
              </div>

              {/* Linha: Comportamento + Peso */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#717182' }}>Comportamento</label>
                  <select
                    value={entregaForm.comportamento}
                    onChange={(e) => setEntregaForm((f) => ({ ...f, comportamento: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2"
                    style={{ borderColor: '#EEDFD3', color: '#1E2939' }}
                  >
                    <option>Calmo</option>
                    <option>Agitado</option>
                    <option>Normal</option>
                    <option>Tímido</option>
                    <option>Brincalhão</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#717182' }}>Peso estimado (kg)</label>
                  <input
                    type="number"
                    placeholder="ex: 8.5"
                    value={entregaForm.peso}
                    onChange={(e) => setEntregaForm((f) => ({ ...f, peso: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2"
                    style={{ borderColor: '#EEDFD3', color: '#1E2939' }}
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#717182' }}>Observações da estadia</label>
                <textarea
                  rows={3}
                  placeholder="Conte como foi a estadia, atividades, passeios, comportamentos especiais..."
                  value={entregaForm.observacoes}
                  onChange={(e) => setEntregaForm((f) => ({ ...f, observacoes: e.target.value }))}
                  className="w-full rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2"
                  style={{ borderColor: '#EEDFD3', color: '#1E2939' }}
                />
              </div>

              {/* Checkbox de confirmação */}
              <label className="flex items-start gap-3 cursor-pointer rounded-2xl p-3" style={{ background: '#FFF7F0', border: '1px solid #EEDFD3' }}>
                <input
                  type="checkbox"
                  checked={entregaForm.confirmou}
                  onChange={(e) => setEntregaForm((f) => ({ ...f, confirmou: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 accent-orange-500 flex-shrink-0"
                />
                <span className="text-xs font-medium leading-relaxed" style={{ color: '#1E2939' }}>
                  Confirmo que o pet <strong>{entregaModal.nomePet}</strong> foi entregue pessoalmente ao dono em boas condições de saúde e bem-estar.
                </span>
              </label>

              {/* Botões */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setEntregaModal(null)}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm border"
                  style={{ borderColor: '#EEDFD3', color: '#717182' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    const id = entregaModal.reservaId;
                    setEntregaModal(null);
                    await handleFinalizar(id);
                  }}
                  disabled={!entregaForm.confirmou || updatingStatus === entregaModal.reservaId}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg,#FF6900,#FE9A00)' }}
                >
                  {updatingStatus === entregaModal.reservaId ? 'Salvando...' : '🐾 Confirmar Entrega'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Pagamento PIX ── */}
      {pagamentoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-center justify-between" style={{ borderBottom: '1px solid #EEDFD3' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg,#FF6900,#FE9A00)' }}>
                  P
                </div>
                <h2 className="text-lg font-extrabold" style={{ color: '#1E2939' }}>Pagamento PIX</h2>
              </div>
              <button onClick={() => setPagamentoModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Valor */}
              <div className="rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(135deg,#FF6900,#FE9A00)' }}>
                <p className="text-sm text-white/80 font-medium mb-0.5">Valor total</p>
                <p className="text-3xl font-extrabold text-white">R$ {pagamentoModal.valor.toFixed(2)}</p>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#717182' }}>Escaneie o QR Code</p>
                <div className="p-3 rounded-2xl border-2 border-orange-200 bg-white shadow-sm">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=00020126360014br.gov.bcb.pix0114${pagamentoModal.cpf.replace(/\D/g, '')}5204000053039865802BR5913PetConnect6009SAOPAULO62070503***6304${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}&bgcolor=ffffff&color=000000&margin=2`}
                    alt="QR Code PIX"
                    className="w-40 h-40 rounded-lg"
                  />
                </div>
                <p className="text-[10px] text-gray-400 text-center">QR Code válido por 30 minutos</p>
              </div>

              {/* Chave PIX */}
              <div className="rounded-xl p-3 flex items-center justify-between gap-3" style={{ background: '#FFF7F0', border: '1px solid #EEDFD3' }}>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#FE9A00' }}>Chave PIX (CPF)</p>
                  <p className="text-sm font-bold font-mono" style={{ color: '#1E2939' }}>{pagamentoModal.cpf}</p>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(pagamentoModal.cpf); toast.success('CPF copiado!'); }}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold flex-shrink-0"
                  style={{ background: '#FF6900', color: '#fff' }}
                >
                  Copiar
                </button>
              </div>

              {/* Beneficiário */}
              <div className="flex items-center justify-between text-xs" style={{ color: '#717182' }}>
                <span>Beneficiário</span>
                <span className="font-semibold" style={{ color: '#1E2939' }}>PetConnect Serviços Ltda.</span>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setPagamentoModal(null)}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm border"
                  style={{ borderColor: '#EEDFD3', color: '#717182' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    const id = pagamentoModal.reservaId;
                    setPagamentoModal(null);
                    await handleFinalizar(id);
                  }}
                  disabled={updatingStatus === pagamentoModal.reservaId}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#FF6900,#FE9A00)' }}
                >
                  {updatingStatus === pagamentoModal.reservaId ? 'Processando...' : '✓ Confirmar Pagamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Avaliação */}
      {avaliacaoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-gray-800">Avaliar Cuidador</h2>
              <button onClick={() => setAvaliacaoModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Estrelas */}
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-2">Nota</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setAvaliacaoNota(n)}>
                    <Star
                      className={`w-8 h-8 transition-colors ${n <= avaliacaoNota ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comentário */}
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-2">Comentário</p>
              <textarea
                value={avaliacaoComentario}
                onChange={(e) => setAvaliacaoComentario(e.target.value)}
                rows={3}
                placeholder="Como foi a experiência?"
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            {/* Foto opcional */}
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-2">Foto (opcional)</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvaliacaoFoto(e.target.files?.[0] ?? null)}
                className="text-sm text-gray-500"
              />
            </div>

            <button
              onClick={handleSubmitAvaliacao}
              disabled={avaliacaoLoading}
              className="w-full py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm disabled:opacity-40 transition-colors shadow-md"
            >
              {avaliacaoLoading ? 'Enviando...' : 'Enviar Avaliação'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
