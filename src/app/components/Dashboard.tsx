import { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { CaregiverFilters } from '../App';
import { cuidadoresApi, matchApi, reservasApi, avaliacoesApi, Reserva, UpdateCuidadorRequest } from '../../lib/api';
import { getChatStorageKey, savePetDataSnapshot } from '../../lib/chatStorage';

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
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center relative">
            <Dog className="w-4 h-4 text-white" />
            <MessageCircle className="w-3 h-3 text-white absolute -bottom-0.5 -right-0.5 drop-shadow" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">Toby</p>
            <span className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-green-300 rounded-full inline-block"></span>
              <span className="text-orange-100 text-xs">Online</span>
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.from === 'bot' && (
              <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                <PawPrint className="w-3.5 h-3.5 text-orange-500" />
              </div>
            )}
            <div className={`max-w-[78%] ${msg.from === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
              <div
                className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.from === 'user'
                    ? 'bg-orange-500 text-white rounded-br-sm'
                    : 'bg-white text-gray-700 shadow-sm rounded-bl-sm'
                }`}
              >
                {renderText(msg.text)}
              </div>
              <span className="text-xs text-gray-400 px-1">{msg.time}</span>
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center mr-2 flex-shrink-0">
              <PawPrint className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <div className="bg-white shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies — shown when idle */}
      {!flow && !postAction && (
        <div className="px-3 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-2 px-1">Escolha uma opção:</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply.key}
                onClick={() => handleQuickReply(reply.key)}
                className="px-3 py-2 bg-white border border-orange-200 text-orange-600 rounded-xl text-xs font-medium hover:bg-orange-50 transition-colors text-left"
              >
                {reply.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Post "Como funciona?" CTA */}
      {!flow && postAction === 'find_caregiver' && (
        <div className="px-3 py-3 bg-gray-50 border-t border-gray-100 space-y-2">
          <button
            onClick={() => handleQuickReply('encontrar')}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            🔍 Encontrar cuidador agora
          </button>
          <button
            onClick={() => setPostAction(null)}
            className="w-full py-2 bg-white border border-gray-200 text-gray-500 rounded-xl text-xs hover:bg-gray-50 transition-colors"
          >
            ↩️ Voltar ao menu
          </button>
        </div>
      )}

      {/* Button choices — shown for pet_type, pet_size, special_care */}
      {flow && BUTTON_STEPS.includes(flow.step) && !typing && (
        <div className="px-3 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {(STEP_BUTTONS[flow.step] ?? []).map((btn) => (
              <button
                key={btn}
                onClick={() => handleButtonChoice(btn)}
                className="px-4 py-2 bg-white border border-orange-300 text-orange-600 rounded-full text-sm font-semibold hover:bg-orange-50 transition-colors"
              >
                {btn}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Text input — shown for pet_name, special_care_desc, pet_behavior */}
      {flow && INPUT_STEPS.includes(flow.step) && (
        <div className="px-3 pb-3 pt-2 bg-white rounded-b-2xl border-t border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              maxLength={currentMaxLength}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Escreva sua resposta..."
              className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-8 h-8 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          {currentMaxLength && (
            <p className="text-xs text-gray-400 text-right mt-1 pr-1">
              {input.length}/{currentMaxLength}
            </p>
          )}
        </div>
      )}

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

function UserProfilePage() {
  const profile = getFullUserProfile();
  const [showEditModal, setShowEditModal] = useState(false);
  const [profileData, setProfileData] = useState<UpdateCuidadorRequest | null>(null);
  const [especialidadesInput, setEspecialidadesInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [overrideName, setOverrideName] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    const r = profile.role?.toLowerCase();
    if (r !== 'cuidador' && r !== 'caregiver') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    cuidadoresApi.getAll()
      .then((lista) => {
        const meu = lista.find((c) => c.id === payload.sub);
        if (meu?.fotoUrl) setFotoUrl(meu.fotoUrl);
      })
      .catch(() => {});
  }, []);

  if (!profile) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      Não foi possível carregar os dados do perfil.
    </div>
  );

  const { fullName, initials, email, role, sessionExpires } = profile;
  const isCaregiver = role?.toLowerCase() === 'cuidador' || role?.toLowerCase() === 'caregiver';

  const openEditModal = async () => {
    try {
      const token = localStorage.getItem('token');
      const payload = JSON.parse(atob(token!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const todos = await cuidadoresApi.getAll();
      const cuidador = todos.find((c) => c.id === payload.sub);
      if (!cuidador) throw new Error('Perfil não encontrado');
      setProfileData({
        nome: cuidador.nome ?? '',
        telefone: cuidador.telefone ?? '',
        bio: cuidador.bio ?? '',
        hourlyRate: cuidador.valorDiaria ?? 0,
        especialidades: cuidador.especialidades ?? [],
      });
      setEspecialidadesInput((cuidador.especialidades ?? []).join(', '));
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

  const infoCards = [
    { icon: User,   label: 'Nome completo',   value: overrideName ?? fullName ?? '—',  accent: 'bg-blue-50 text-blue-500' },
    { icon: Mail,   label: 'E-mail',           value: email   || '—',  accent: 'bg-purple-50 text-purple-500' },
    { icon: Shield, label: 'Tipo de conta',    value: role    || '—',  accent: 'bg-orange-50 text-orange-500' },
    {
      icon: Clock,
      label: 'Sessão válida até',
      value: sessionExpires
        ? sessionExpires.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
        : '—',
      accent: 'bg-green-50 text-green-500',
    },
  ];

  const stats = [
    { label: 'Reservas', value: '3', icon: Calendar },
    { label: 'Pets',     value: '2', icon: PawPrint  },
    { label: 'Avaliação',value: '5.0', icon: Star    },
  ];

  return (
    <div className="max-w-3xl mx-auto pb-10">

      {/* Hero banner */}
      <div className="relative h-44 rounded-3xl bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 overflow-hidden shadow-lg">
        <div className="absolute -top-10 -right-10 w-52 h-52 bg-white/10 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-white/10 rounded-full" />
        <div className="absolute top-6 right-24 w-20 h-20 bg-white/10 rounded-full" />
        <div className="absolute bottom-3 right-8 w-10 h-10 bg-white/15 rounded-full" />
        <div className="absolute inset-0 flex items-center px-8">
          <div>
            <p className="text-white/70 text-sm font-medium">Meu Perfil</p>
            <p className="text-white text-2xl font-bold mt-0.5">PetConnect</p>
          </div>
          <PawPrint className="absolute right-8 bottom-5 w-20 h-20 text-white/10" />
        </div>
      </div>

      {/* Avatar sobreposto */}
      <div className="flex flex-col items-center -mt-14 mb-8 relative z-10">
        <div className="relative">
          {fotoUrl ? (
            <img src={fotoUrl} alt={overrideName ?? fullName ?? ''} className="w-28 h-28 rounded-full object-cover shadow-xl border-4 border-white ring-4 ring-orange-200" />
          ) : (
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-4xl font-bold shadow-xl border-4 border-white ring-4 ring-orange-200">
              {initials}
            </div>
          )}
          {isCaregiver && (
            <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-orange-50 transition-colors border border-orange-100">
              {uploadingFoto ? (
                <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4 text-orange-500" />
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFoto(f); }} />
            </label>
          )}
        </div>
        <h2 className="mt-4 text-2xl font-bold text-gray-800">{overrideName ?? fullName ?? 'Usuário'}</h2>
        <span className="mt-2 inline-flex items-center gap-1.5 px-4 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full text-sm font-semibold shadow-sm capitalize">
          <Shield className="w-3.5 h-3.5" />
          {role || 'Membro'}
        </span>
        {isCaregiver && (
          <button
            onClick={openEditModal}
            className="mt-4 flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Edit2 className="w-4 h-4" />
            Editar Perfil
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-5 border-none shadow-sm text-center hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-2">
              <Icon className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">{label}</p>
          </Card>
        ))}
      </div>

      {/* Info cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mb-4">
          Informações da conta
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {infoCards.map(({ icon: Icon, label, value, accent }) => (
            <Card key={label} className="p-5 border-none shadow-sm hover:shadow-md transition-all flex items-center gap-4">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${accent}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Modal editar perfil */}
      {showEditModal && profileData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Editar Perfil</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-orange-500 uppercase tracking-wider mb-1.5">Nome</label>
                <input className="w-full px-3 py-2.5 bg-orange-50 border border-orange-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" value={profileData.nome} onChange={(e) => setProfileData((p) => p ? { ...p, nome: e.target.value } : p)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-orange-500 uppercase tracking-wider mb-1.5">Telefone</label>
                <input className="w-full px-3 py-2.5 bg-orange-50 border border-orange-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" value={profileData.telefone} onChange={(e) => setProfileData((p) => p ? { ...p, telefone: e.target.value } : p)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-orange-500 uppercase tracking-wider mb-1.5">Valor por dia (R$)</label>
                <input type="number" min="0" className="w-full px-3 py-2.5 bg-orange-50 border border-orange-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" value={profileData.hourlyRate} onChange={(e) => setProfileData((p) => p ? { ...p, hourlyRate: Number(e.target.value) } : p)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-orange-500 uppercase tracking-wider mb-1.5">Bio</label>
                <textarea rows={3} className="w-full px-3 py-2.5 bg-orange-50 border border-orange-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" value={profileData.bio} onChange={(e) => setProfileData((p) => p ? { ...p, bio: e.target.value } : p)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-orange-500 uppercase tracking-wider mb-1.5">Especialidades (separadas por vírgula)</label>
                <input className="w-full px-3 py-2.5 bg-orange-50 border border-orange-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" value={especialidadesInput} onChange={(e) => setEspecialidadesInput(e.target.value)} placeholder="Ex: Banho, Tosa, Adestramento" />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-2xl font-bold transition-colors">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
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
  const [avaliacaoModal, setAvaliacaoModal] = useState<{ reservaId: string; cuidadorId: string } | null>(null);
  const [avaliacaoNota, setAvaliacaoNota] = useState(5);
  const [avaliacaoComentario, setAvaliacaoComentario] = useState('');
  const [avaliacaoFoto, setAvaliacaoFoto] = useState<File | null>(null);
  const [avaliacaoLoading, setAvaliacaoLoading] = useState(false);

  const { firstName, fullName, initials } = getUserInfo();
  const isCaregiver = userRole?.toLowerCase() === 'cuidador' || userRole?.toLowerCase() === 'caregiver';
  const [headerFotoUrl, setHeaderFotoUrl] = useState<string | null>(null);

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

  useEffect(() => {
    if (activeTab === 'bookings') {
      setReservasLoading(true);
      reservasApi.getAll()
        .then(setReservas)
        .catch(() => toast.error('Erro ao carregar reservas'))
        .finally(() => setReservasLoading(false));
    }
  }, [activeTab]);

  const handleUpdateStatus = async (id: string, status: Reserva['status']) => {
    setUpdatingStatus(id);
    try {
      await reservasApi.updateStatus(id, status);
      setReservas((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
      const msg = status === 'Aceita' ? 'Reserva aceita!' : status === 'Concluida' ? 'Reserva concluída!' : 'Reserva recusada.';
      toast.success(msg);
    } catch {
      toast.error('Erro ao atualizar status da reserva');
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
    { id: 'pets',      label: 'Meus Pets',    icon: PawPrint },
    { id: 'bookings',  label: 'Reservas',     icon: Calendar },
    { id: 'messages',  label: 'Mensagens',    icon: MessageSquare },
    { id: 'profile',   label: 'Perfil',       icon: User },
    { id: 'settings',  label: 'Configurações',icon: Settings },
  ];

  // Conteúdo interno da sidebar (reutilizado no desktop e mobile overlay)
  const SidebarContent = ({ expanded, onClose }: { expanded: boolean; onClose?: () => void }) => (
    <>
      {/* Logo + toggle */}
      <div className={`h-16 flex items-center border-b flex-shrink-0 ${expanded ? 'px-5 gap-2' : 'justify-center'}`}>
        {expanded && (
          <>
            <PawPrint className="w-7 h-7 text-orange-500 flex-shrink-0" />
            <span className="text-lg font-bold text-gray-800 flex-1 truncate">PetConnect</span>
          </>
        )}
        <button
          onClick={onClose ?? (() => setSidebarOpen((v) => !v))}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
          title={expanded ? 'Recolher menu' : 'Expandir menu'}
        >
          {expanded ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabChange(item.id)}
            title={!expanded ? item.label : undefined}
            className={`w-full flex items-center rounded-lg transition-colors ${
              expanded ? 'gap-3 px-4 py-3' : 'justify-center px-0 py-3'
            } ${
              activeTab === item.id
                ? 'bg-orange-50 text-orange-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {expanded && <span className="font-medium truncate">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-2 border-t">
        <button
          onClick={handleLogout}
          title={!expanded ? 'Sair' : undefined}
          className={`w-full flex items-center rounded-lg text-red-600 hover:bg-red-50 transition-colors py-3 ${
            expanded ? 'gap-3 px-4' : 'justify-center px-0'
          }`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {expanded && <span className="font-medium">Sair</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Mobile overlay backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar — overlay deslizante */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent expanded={true} onClose={() => setMobileSidebarOpen(false)} />
      </aside>

      {/* Desktop sidebar — colapsável inline */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        <SidebarContent expanded={sidebarOpen} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-8 gap-3">
          {/* Hamburger — só no mobile */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative flex-1 max-w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar cuidadores, serviços..."
              className="pl-10 bg-gray-50 border-none"
            />
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </Button>
            <button
              type="button"
              onClick={() => handleTabChange('profile')}
              className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-gray-100 transition-colors"
              title="Ir para o perfil"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-800 leading-tight">{fullName || 'Usuário'}</p>
                <p className="text-xs text-gray-400 leading-tight capitalize">{userRole ?? 'Membro'}</p>
              </div>
              {headerFotoUrl ? (
                <img src={headerFotoUrl} alt={fullName ?? ''} className="w-10 h-10 rounded-full object-cover border-2 border-orange-200 shadow-sm" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-sm border-2 border-orange-200 shadow-sm">
                  {initials}
                </div>
              )}
            </button>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-orange-50">
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
                {!reservasLoading && reservas.length > 0 && (
                  <span className="bg-orange-100 text-orange-600 font-bold text-sm px-4 py-2 rounded-full">
                    {reservas.length} reserva{reservas.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

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

              {!reservasLoading && reservas.map((r) => {
                const entrada = new Date(r.dataEntrada);
                const saida = new Date(r.dataSaida);
                const dias = Math.max(1, Math.ceil((saida.getTime() - entrada.getTime()) / (1000 * 60 * 60 * 24)));
                const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
                const fmtShort = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

                const isPendente = r.status === 'Em análise';
                const isAceito   = r.status === 'Aceita';

                const gradients = {
                  'Em análise': 'from-amber-400 via-orange-400 to-amber-500',
                  Aceita:    'from-emerald-500 via-green-500 to-teal-500',
                  Recusada:  'from-red-400 via-rose-500 to-red-500',
                  Concluida: 'from-blue-500 via-indigo-500 to-purple-500',
                };
                const gradient = gradients[r.status] ?? gradients['Em análise'];

                const speciesEmoji = r.especie?.toLowerCase().includes('gato') ? '🐱' : '🐶';
                const porteLabel = r.porte === 'Pequeno' ? 'Pequeno porte' : r.porte === 'Médio' ? 'Médio porte' : r.porte === 'Grande' ? 'Grande porte' : r.porte;

                return (
                  <div key={r.id} className="rounded-3xl overflow-hidden shadow-lg border border-orange-200 bg-white">

                    {/* ── Hero do card ── */}
                    <div className={`relative bg-gradient-to-r ${gradient} px-8 py-7 overflow-hidden`}>
                      {/* Decoração de fundo */}
                      <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
                      <div className="absolute -bottom-6 right-24 w-24 h-24 bg-white/10 rounded-full" />

                      <div className="relative flex items-center justify-between gap-4">
                        {/* Avatar + identidade */}
                        <div className="flex items-center gap-5">
                          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-5xl shadow-md flex-shrink-0">
                            {speciesEmoji}
                          </div>
                          <div>
                            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Pet</p>
                            <p className="text-white text-3xl font-extrabold leading-tight">{r.nomePet}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">{r.especie}</span>
                              <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">{porteLabel}</span>
                            </div>
                          </div>
                        </div>

                        {/* Badge de status */}
                        <div className="flex-shrink-0 text-center">
                          <div className="bg-white/20 backdrop-blur rounded-2xl px-5 py-3">
                            <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Status</p>
                            <p className="text-white font-extrabold text-lg">{r.status}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Corpo ── */}
                    <div className="bg-orange-50/60 px-8 py-6 space-y-5">

                      {/* Período visual */}
                      <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-orange-100">
                        <div className="flex-1 text-center">
                          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Entrada</p>
                          <p className="text-base font-extrabold text-gray-800">{fmtShort(entrada)}</p>
                          <p className="text-xs text-gray-500">{entrada.getFullYear()}</p>
                        </div>
                        <div className="flex flex-col items-center gap-1 px-2">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(dias, 7) }).map((_, i) => (
                              <div key={i} className="w-2 h-2 rounded-full bg-orange-300" />
                            ))}
                            {dias > 7 && <span className="text-orange-400 text-xs font-bold">+{dias - 7}</span>}
                          </div>
                          <span className="text-orange-500 font-extrabold text-sm">{dias} dia{dias !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex-1 text-center">
                          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Saída</p>
                          <p className="text-base font-extrabold text-gray-800">{fmtShort(saida)}</p>
                          <p className="text-xs text-gray-500">{saida.getFullYear()}</p>
                        </div>
                      </div>

                      {/* Pessoa relacionada */}
                      {!isCaregiver && r.cuidadorNome && (
                        <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0 shadow-sm">
                            {r.cuidadorNome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs text-orange-500 font-bold uppercase tracking-wider">Cuidador responsável</p>
                            <p className="text-base font-extrabold text-gray-800 mt-0.5">{r.cuidadorNome}</p>
                          </div>
                        </div>
                      )}
                      {isCaregiver && r.donoNome && (
                        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0 shadow-sm">
                            {r.donoNome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs text-blue-500 font-bold uppercase tracking-wider">Solicitante</p>
                            <p className="text-base font-extrabold text-gray-800 mt-0.5">{r.donoNome}</p>
                          </div>
                        </div>
                      )}

                      {/* Detalhes extras */}
                      {(r.cuidadosEspeciais || r.descricaoPet) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {r.cuidadosEspeciais && (
                            <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
                              <p className="text-xs text-yellow-600 font-bold uppercase tracking-wider mb-2">⚕️ Cuidados especiais</p>
                              <p className="text-sm text-gray-700 leading-relaxed">{r.cuidadosEspeciais}</p>
                            </div>
                          )}
                          {r.descricaoPet && (
                            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                              <p className="text-xs text-purple-500 font-bold uppercase tracking-wider mb-2">🐾 Comportamento</p>
                              <p className="text-sm text-gray-700 leading-relaxed">{r.descricaoPet}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rodapé: valor + ações */}
                      <div className="flex items-center justify-between pt-4 border-t-2 border-dashed border-orange-200">
                        <div>
                          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Valor total estimado</p>
                          <p className="text-3xl font-extrabold text-orange-500 mt-1">R$ {r.valorTotal.toFixed(2)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{dias} dia{dias !== 1 ? 's' : ''} × R$ {(r.valorTotal / dias).toFixed(2)}/dia</p>
                        </div>

                        {isCaregiver && isPendente && (
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleUpdateStatus(r.id, 'Recusada')}
                              disabled={updatingStatus === r.id}
                              className="px-6 py-3 rounded-2xl border-2 border-red-300 text-red-500 font-bold text-sm hover:bg-red-50 disabled:opacity-40 transition-colors"
                            >
                              {updatingStatus === r.id ? '...' : '✕ Recusar'}
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(r.id, 'Aceita')}
                              disabled={updatingStatus === r.id}
                              className="px-6 py-3 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm disabled:opacity-40 transition-colors shadow-md"
                            >
                              {updatingStatus === r.id ? '...' : '✓ Aceitar'}
                            </button>
                          </div>
                        )}
                        {!isCaregiver && isAceito && (
                          <button
                            onClick={() => handleUpdateStatus(r.id, 'Concluida')}
                            disabled={updatingStatus === r.id}
                            className="px-6 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm disabled:opacity-40 transition-colors shadow-md"
                          >
                            {updatingStatus === r.id ? '...' : '✓ Concluir'}
                          </button>
                        )}
                        {!isCaregiver && (r.status === 'Concluida' || r.status === 'Aceita') && (
                          <button
                            onClick={() => setAvaliacaoModal({ reservaId: r.id, cuidadorId: r.cuidadorId })}
                            className="px-6 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors shadow-md"
                          >
                            ⭐ Avaliar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab !== 'profile' && activeTab !== 'bookings' && (
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  Bem-vindo de volta{firstName ? `, ${firstName}` : ''}! 👋
                </h1>
                <p className="text-gray-500 mt-1">Aqui está o resumo do que está acontecendo hoje.</p>
              </div>
              <Button
                onClick={() => setChatOpen(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white flex gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                Novo Agendamento
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Reservas Ativas', value: '3', color: 'blue' },
                { label: 'Pets Cadastrados', value: '2', color: 'orange' },
                { label: 'Mensagens Novas', value: '12', color: 'green' },
                { label: 'Avaliações', value: '4.9', color: 'yellow' },
              ].map((stat, i) => (
                <Card key={i} className="p-6 border-none shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</p>
                </Card>
              ))}
            </div>

            {/* Encontrar Cuidadores - Card Destacado */}
            {!isCaregiver && (
            <div
              onClick={() => onNavigate('caregivers')}
              className="block cursor-pointer"
            >
              <Card className="p-8 border-none shadow-md hover:shadow-xl transition-all bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 text-white transform hover:scale-[1.02] duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-2">Encontrar Cuidadores</h3>
                      <p className="text-orange-50 text-sm max-w-lg">
                        Navegue por nossa lista de cuidadores de confiança e encontre o perfeito para seu pet
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-2 px-6 py-3 bg-white text-orange-600 rounded-lg font-bold shadow-lg">
                    Ver Cuidadores
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Card>
            </div>
            )}

            {/* Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Activity */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xl font-bold text-gray-800">Reservas Recentes</h3>
                <Card className="divide-y border-none shadow-sm">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                          <PawPrint className="w-6 h-6 text-orange-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">Max (Golden Retriever)</p>
                          <p className="text-sm text-gray-500">Cuidadora: Ana Silva • 15 Out - 18 Out</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Confirmado</span>
                    </div>
                  ))}
                </Card>
              </div>

              {/* Tips / Suggestions */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800">Dicas para você</h3>
                <Card className="p-6 bg-gradient-to-br from-orange-500 to-amber-500 text-white border-none">
                  <h4 className="font-bold text-lg mb-2">Complete seu perfil!</h4>
                  <p className="text-orange-50 text-sm mb-4">
                    Perfis completos têm 3x mais chances de encontrar cuidadores ideais.
                  </p>
                  <Button variant="secondary" className="w-full text-orange-600 font-bold">
                    Editar Perfil
                  </Button>
                </Card>
              </div>
            </div>
          </div>
          )}
        </div>
      </main>

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
