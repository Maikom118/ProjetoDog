import { useState, useEffect, useRef } from 'react';
import { Avaliacao, Cuidador, UpdateCuidadorRequest, avaliacoesApi, cuidadoresApi, reservasApi } from '../../lib/api';
import { Edit2, Upload } from 'lucide-react';
import { getPetData, StoredPetData } from '../../lib/chatStorage';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Award,
  MessageCircle,
  Star,
  Clock,
  Shield,
  Heart,
  CheckCircle,
  DollarSign,
  Share2,
  Calendar,
  PawPrint,
  Smile,
  ExternalLink,
  X,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

interface CaregiverProfileProps {
  cuidador: Cuidador;
  onBack: () => void;
}

const SPECIALTY_ICONS: Record<string, string> = {
  'Cão': '🐕',
  'Gato': '🐈',
  'Pássaro': '🦜',
  'Peixe': '🐠',
  'Roedor': '🐹',
  'Réptil': '🦎',
  'Banho': '🛁',
  'Tosa': '✂️',
  'Adestramento': '🎓',
  'Veterinário': '💉',
  'Passeio': '🦮',
  'Hospedagem': '🏠',
};

function getSpecialtyIcon(specialty: string): string {
  const key = Object.keys(SPECIALTY_ICONS).find((k) =>
    specialty.toLowerCase().includes(k.toLowerCase())
  );
  return key ? SPECIALTY_ICONS[key] : '⭐';
}

function buildMapUrl(endereco: Cuidador['endereco']): string {
  const parts = [
    endereco.logradouro,
    endereco.numero,
    endereco.bairro,
    endereco.cidade,
    endereco.uf,
    'Brasil',
  ]
    .filter(Boolean)
    .join(', ');
  return `https://maps.google.com/maps?q=${encodeURIComponent(parts)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}

function buildGoogleMapsLink(endereco: Cuidador['endereco']): string {
  const parts = [
    endereco.logradouro,
    endereco.numero,
    endereco.bairro,
    endereco.cidade,
    endereco.uf,
  ]
    .filter(Boolean)
    .join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts)}`;
}

const MOCK_STATS = [
  { label: 'Anos de exp.', value: '3+', icon: Clock },
  { label: 'Pets cuidados', value: '120+', icon: PawPrint },
  { label: 'Avaliações', value: '98%', icon: Smile },
  { label: 'Resposta', value: '< 1h', icon: MessageCircle },
];

const MOCK_REVIEWS = [
  {
    name: 'Camila R.',
    rating: 5,
    date: 'Fevereiro 2025',
    text: 'Excelente cuidador! Meu cachorro ficou super bem cuidado, recebi fotos e atualizações o tempo todo.',
    pet: 'Golden Retriever',
  },
  {
    name: 'Pedro A.',
    rating: 5,
    date: 'Janeiro 2025',
    text: 'Muito atencioso e profissional. Recomendo a todos que precisam de alguém de confiança.',
    pet: 'Bulldog Francês',
  },
  {
    name: 'Mariana S.',
    rating: 4,
    date: 'Dezembro 2024',
    text: 'Ótima experiência! O pet voltou feliz e saudável. Com certeza voltarei a contratar.',
    pet: 'Gato Persa',
  },
];

const WHAT_INCLUDED = [
  'Alimentação conforme rotina do pet',
  'Passeios diários',
  'Fotos e atualizações pelo WhatsApp',
  'Atendimento a emergências veterinárias',
  'Ambiente seguro e confortável',
  'Relatório diário do pet',
];

function getCurrentUserId(): string | null {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export function CaregiverProfile({ cuidador, onBack }: CaregiverProfileProps) {
  const dark = localStorage.getItem('petconnect-dark') === 'true';
  const dm = {
    bg:          dark ? '#0F172A' : '#FFFBEB',
    card:        dark ? '#1E293B' : '#FFFFFF',
    border:      dark ? '#334155' : '#EEDFD3',
    textPrimary: dark ? '#E2E8F0' : '#1E2939',
    textSec:     dark ? '#94A3B8' : '#717182',
    form:        dark ? '#0F172A' : '#F3F3F5',
    accent:      dark ? '#1E3A5F' : '#FFEDD4',
    topbar:      dark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.90)',
  };

  const [mapError, setMapError] = useState(false);
  const [showVerifiedTooltip, setShowVerifiedTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const verifiedBtnRef = useRef<HTMLButtonElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [petData, setPetData] = useState<StoredPetData | null>(null);
  const [editData, setEditData] = useState<StoredPetData | null>(null);

  // Edit profile
  const isOwnProfile = getCurrentUserId() === cuidador.id;
  const [showEditModal, setShowEditModal] = useState(false);
  const [profileData, setProfileData] = useState<UpdateCuidadorRequest>({
    nome: cuidador.nome ?? '',
    telefone: cuidador.telefone ?? '',
    bio: cuidador.bio ?? '',
    hourlyRate: cuidador.valorDiaria ?? 0,
    especialidades: cuidador.especialidades ?? [],
  });
  const [especialidadesInput, setEspecialidadesInput] = useState(
    (cuidador.especialidades ?? []).join(', ')
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [currentCuidador, setCurrentCuidador] = useState(cuidador);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);

  useEffect(() => {
    avaliacoesApi.getByCuidador(cuidador.id).then(setAvaliacoes).catch(() => {});
  }, [cuidador.id]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const esp = especialidadesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const updated = await cuidadoresApi.updateProfile({ ...profileData, especialidades: esp });
      setCurrentCuidador((prev) => ({ ...prev, ...updated }));
      toast.success('Perfil atualizado com sucesso!');
      setShowEditModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUploadFoto = async (file: File) => {
    setUploadingFoto(true);
    try {
      const res = await cuidadoresApi.uploadFoto(file);
      if (res.fotoUrl) setCurrentCuidador((prev) => ({ ...prev, fotoUrl: res.fotoUrl }));
      toast.success('Foto atualizada!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar foto');
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleSolicitarOrcamento = () => {
    const data = getPetData();
    setPetData(data);
    setEditData(data ? { ...data } : {
      petName: '',
      petType: 'Cachorro',
      petSize: 'Médio',
      specialCareDesc: '',
      petBehavior: '',
      dataEntrada: null,
      dataSaida: null,
    });
    setShowModal(true);
  };

  const updateEdit = (field: keyof StoredPetData, value: string | null) =>
    setEditData((prev) => prev ? { ...prev, [field]: value } : prev);

  const calcDays = (entrada: string, saida: string) =>
    Math.max(1, Math.ceil((new Date(saida).getTime() - new Date(entrada).getTime()) / (1000 * 60 * 60 * 24)));

  const handleConfirmar = async () => {
    if (!editData?.dataEntrada || !editData?.dataSaida) return;
    const dias = calcDays(editData.dataEntrada, editData.dataSaida);
    const valorTotal = dias * cuidador.valorDiaria;
    setSubmitting(true);
    try {
      await reservasApi.create({
        cuidadorId: cuidador.id,
        nomePet: editData.petName,
        especie: editData.petType,
        porte: editData.petSize,
        cuidadosEspeciais: editData.specialCareDesc,
        descricaoPet: editData.petBehavior,
        dataEntrada: editData.dataEntrada,
        dataSaida: editData.dataSaida,
        valorTotal,
      });
      setShowModal(false);
      setShowSuccess(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar reserva');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    window.history.pushState({}, '', `/cuidador/${cuidador.id}`);
    window.scrollTo(0, 0);
    return () => {
      window.history.pushState({}, '', '/');
    };
  }, [cuidador.id]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: `Perfil de ${cuidador.nome}`, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado para a área de transferência!');
    }
  };

  const whatsappUrl = `https://wa.me/55${currentCuidador.telefone?.replace(/\D/g, '')}`;
  const mapUrl = currentCuidador.endereco ? buildMapUrl(currentCuidador.endereco) : null;
  const mapsLink = currentCuidador.endereco ? buildGoogleMapsLink(currentCuidador.endereco) : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: dm.bg }}>
      {/* Sticky top bar */}
      <div className="sticky top-0 z-50 backdrop-blur border-b px-4 py-3 flex items-center justify-between" style={{ backgroundColor: dm.topbar, borderColor: dm.border }}>
        <button
          onClick={onBack}
          className="flex items-center gap-2 transition-colors"
          style={{ color: dm.textSec }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Voltar aos Cuidadores</span>
        </button>
        <div className="flex items-center gap-3">
          {isOwnProfile && (
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
              style={{ backgroundColor: '#FF6900' }}
            >
              <Edit2 className="w-4 h-4" />
              Editar Perfil
            </button>
          )}
          <button
            onClick={handleShare}
            className="flex items-center gap-2 transition-colors text-sm"
            style={{ color: dm.textSec }}
          >
            <Share2 className="w-4 h-4" />
            Compartilhar
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="relative text-white overflow-hidden" style={{ background: 'linear-gradient(135deg, #FF6900 0%, #FE9A00 100%)' }}>
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-white/10 rounded-full" />

        <div className="relative max-w-4xl mx-auto px-4 py-12">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            {/* Avatar */}
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 flex-shrink-0">
              {currentCuidador.fotoUrl ? (
                <img
                  src={currentCuidador.fotoUrl}
                  alt={currentCuidador.nome}
                  className="w-full h-full rounded-2xl object-cover border-4 border-white/40 shadow-2xl"
                />
              ) : (
                <div className="w-full h-full rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-6xl border-4 border-white/40 shadow-2xl">
                  {currentCuidador.nome?.charAt(0).toUpperCase() || 'C'}
                </div>
              )}
              {isOwnProfile && (
                <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-md transition-colors">
                  {uploadingFoto ? (
                    <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#FF6900', borderTopColor: 'transparent' }} />
                  ) : (
                    <Upload className="w-4 h-4" style={{ color: '#FF6900' }} />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadFoto(file);
                    }}
                  />
                </label>
              )}
            </div>

            <div className="text-center sm:text-left flex-1">
              {/* Cuidador Verificado — clicável com tooltip fixed */}
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <button
                  ref={verifiedBtnRef}
                  type="button"
                  onClick={() => {
                    const rect = verifiedBtnRef.current?.getBoundingClientRect();
                    if (rect) {
                      setTooltipPos({
                        top: rect.bottom + 10,
                        left: Math.min(rect.left, window.innerWidth - 328),
                      });
                    }
                    setShowVerifiedTooltip(v => !v);
                  }}
                  onBlur={() => setTimeout(() => setShowVerifiedTooltip(false), 150)}
                  className="flex items-center gap-1.5 group focus:outline-none"
                >
                  <Shield className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
                  <span className="text-white/80 text-sm group-hover:text-white transition-colors underline decoration-dotted underline-offset-2 cursor-pointer">
                    Cuidador Verificado
                  </span>
                  <svg className="w-3 h-3 text-white/60 group-hover:text-white transition-colors mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
                  </svg>
                </button>
              </div>
              <h1 className="text-4xl font-bold mb-2">{cuidador.nome}</h1>
              <div className="flex items-center justify-center sm:justify-start gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-300 text-yellow-300" />
                ))}
                <span className="text-white/80 text-sm ml-1">
                  {avaliacoes.length > 0
                    ? `${(avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length).toFixed(1)} (${avaliacoes.length} avaliação${avaliacoes.length !== 1 ? 'ões' : ''})`
                    : 'Sem avaliações'}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-white/90">
                {cuidador.endereco?.cidade && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {cuidador.endereco.cidade}, {cuidador.endereco.uf}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  R$ {cuidador.valorDiaria?.toFixed(2)}/dia
                </span>
              </div>
            </div>

            {/* CTA desktop */}
            <div className="hidden sm:flex flex-col gap-2 flex-shrink-0">
              {cuidador.telefone && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold shadow-lg transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp
                </a>
              )}
              <button onClick={handleSolicitarOrcamento} className="px-6 py-3 bg-white rounded-xl font-semibold shadow-lg transition-colors" style={{ color: '#FF6900' }}>
                Solicitar Orçamento
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-b shadow-sm" style={{ backgroundColor: dm.card, borderColor: dm.border }}>
        <div className="max-w-4xl mx-auto px-4 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {MOCK_STATS.map((stat, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: dm.accent }}>
                <stat.icon className="w-5 h-5" style={{ color: '#FF6900' }} />
              </div>
              <div>
                <p className="text-xl font-bold" style={{ color: dm.textPrimary }}>{stat.value}</p>
                <p className="text-xs" style={{ color: dm.textSec }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna principal */}
          <div className="lg:col-span-2 space-y-8">
            {/* Sobre */}
            {cuidador.bio && (
              <section className="rounded-2xl shadow-sm p-6" style={{ backgroundColor: dm.card, border: `1px solid ${dm.border}` }}>
                <h2 className="flex items-center gap-2 text-xl font-bold mb-4" style={{ color: dm.textPrimary }}>
                  <Award className="w-5 h-5" style={{ color: '#FF6900' }} />
                  Sobre o Cuidador
                </h2>
                <p className="leading-relaxed" style={{ color: dm.textSec }}>{cuidador.bio}</p>
              </section>
            )}

            {/* O que está incluído */}
            <section className="rounded-2xl shadow-sm p-6" style={{ backgroundColor: dm.card, border: `1px solid ${dm.border}` }}>
              <h2 className="flex items-center gap-2 text-xl font-bold mb-4" style={{ color: dm.textPrimary }}>
                <CheckCircle className="w-5 h-5" style={{ color: '#FF6900' }} />
                O que está incluído
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {WHAT_INCLUDED.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Especialidades */}
            {cuidador.especialidades && cuidador.especialidades.length > 0 && (
              <section className="rounded-2xl shadow-sm p-6" style={{ backgroundColor: dm.card, border: `1px solid ${dm.border}` }}>
                <h2 className="flex items-center gap-2 text-xl font-bold mb-4" style={{ color: dm.textPrimary }}>
                  <Heart className="w-5 h-5" style={{ color: '#FF6900' }} />
                  Especialidades
                </h2>
                <div className="flex flex-wrap gap-3">
                  {cuidador.especialidades.map((esp, idx) => (
                    <span
                      key={idx}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border"
                      style={{ backgroundColor: dm.accent, color: '#FF6900', borderColor: dm.border }}
                    >
                      <span>{getSpecialtyIcon(esp)}</span>
                      {esp}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Avaliações */}
            <section className="rounded-2xl shadow-sm p-6" style={{ backgroundColor: dm.card, border: `1px solid ${dm.border}` }}>
              <h2 className="flex items-center gap-2 text-xl font-bold mb-2" style={{ color: dm.textPrimary }}>
                <Star className="w-5 h-5" style={{ color: '#FF6900' }} />
                Avaliações
              </h2>
              {avaliacoes.length > 0 && (
                <div className="flex items-center gap-3 mb-6 p-4 rounded-xl" style={{ backgroundColor: dm.accent }}>
                  <div className="text-5xl font-bold" style={{ color: '#FF6900' }}>
                    {(avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length).toFixed(1)}
                  </div>
                  <div>
                    <div className="flex gap-0.5 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm text-gray-500">{avaliacoes.length} avaliação{avaliacoes.length !== 1 ? 'ões' : ''} verificada{avaliacoes.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              )}
              <div className="space-y-4">
                {avaliacoes.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Nenhuma avaliação ainda.</p>
                ) : (
                  avaliacoes.map((review) => (
                    <div key={review.id} className="p-4 rounded-xl" style={{ backgroundColor: dm.bg }}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg, #FF6900, #FE9A00)' }}>
                            {review.nomeDono.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: dm.textPrimary }}>{review.nomeDono}</p>
                            <p className="text-xs" style={{ color: dm.textSec }}>
                              {new Date(review.dataCriacao).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[...Array(review.nota)].map((_, s) => (
                            <Star key={s} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: dm.textSec }}>{review.comentario}</p>
                      {review.fotoUrl && (
                        <img
                          src={review.fotoUrl}
                          alt="Foto da avaliação"
                          className="mt-3 rounded-xl max-h-48 object-cover"
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Mapa */}
            {mapUrl && (
              <section className="rounded-2xl shadow-sm p-6" style={{ backgroundColor: dm.card, border: `1px solid ${dm.border}` }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="flex items-center gap-2 text-xl font-bold" style={{ color: dm.textPrimary }}>
                    <MapPin className="w-5 h-5" style={{ color: '#FF6900' }} />
                    Localização
                  </h2>
                  {mapsLink && (
                    <a
                      href={mapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm transition-colors"
                      style={{ color: '#FF6900' }}
                    >
                      Abrir no Maps
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* Endereço formatado */}
                <div className="p-3 rounded-xl mb-4 text-sm" style={{ backgroundColor: '#FFEDD4', color: '#717182' }}>
                  <p className="font-medium" style={{ color: dm.textPrimary }}>
                    {cuidador.endereco.logradouro}, {cuidador.endereco.numero}
                    {cuidador.endereco.complemento && ` - ${cuidador.endereco.complemento}`}
                  </p>
                  <p>{cuidador.endereco.bairro} · {cuidador.endereco.cidade}, {cuidador.endereco.uf}</p>
                  <p className="text-gray-400">CEP {cuidador.endereco.cep}</p>
                </div>

                {/* Mapa embutido */}
                {!mapError ? (
                  <div className="rounded-xl overflow-hidden border h-64 sm:h-80" style={{ borderColor: dm.border }}>
                    <iframe
                      title="Localização do cuidador"
                      src={mapUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      onError={() => setMapError(true)}
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 h-48 flex flex-col items-center justify-center gap-3 text-gray-400">
                    <MapPin className="w-8 h-8" />
                    <p className="text-sm">Mapa não disponível</p>
                    {mapsLink && (
                      <a
                        href={mapsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm hover:underline"
                      style={{ color: '#FF6900' }}
                      >
                        Ver no Google Maps →
                      </a>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Card de Preço */}
            <div className="rounded-2xl shadow-sm p-6 sticky top-20" style={{ backgroundColor: dm.card, border: `1px solid ${dm.border}` }}>
              <div className="text-center mb-5">
                <p className="text-3xl font-bold" style={{ color: '#FF6900' }}>
                  R$ {cuidador.valorDiaria?.toFixed(2)}
                </p>
                <p className="text-sm" style={{ color: dm.textSec }}>por dia</p>
              </div>

              <div className="space-y-3 mb-5">
                {cuidador.telefone && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors shadow-md"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Chamar no WhatsApp
                  </a>
                )}
                <button onClick={handleSolicitarOrcamento} className="w-full flex items-center justify-center gap-2 py-3 text-white rounded-xl font-semibold transition-colors shadow-md" style={{ backgroundColor: '#FF6900' }}>
                  <Calendar className="w-5 h-5" />
                  Solicitar Orçamento
                </button>
              </div>

              <p className="text-center text-xs" style={{ color: dm.textSec }}>
                Sem compromisso. Resposta geralmente em menos de 1 hora.
              </p>
            </div>

            {/* Contato */}
            <div className="rounded-2xl shadow-sm p-6 space-y-4" style={{ backgroundColor: dm.card, border: `1px solid ${dm.border}` }}>
              <h3 className="font-bold text-gray-800">Contato</h3>
              {cuidador.telefone && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Phone className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Telefone</p>
                    <p className="text-gray-700 text-sm font-medium">{cuidador.telefone}</p>
                  </div>
                </div>
              )}
              {cuidador.email && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Mail className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">E-mail</p>
                    <p className="text-gray-700 text-sm font-medium break-all">{cuidador.email}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Selos de confiança */}
            <div className="rounded-2xl shadow-sm p-5" style={{ backgroundColor: dm.card, border: `1px solid ${dm.border}` }}>
              {/* Título com badge */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm" style={{ color: dm.textPrimary }}>Garantias & Verificação</h3>
                <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}>
                  <Shield className="w-3 h-3" /> PetConnect
                </span>
              </div>

              <div className="space-y-3">
                {[
                  {
                    icon: Shield,
                    label: 'Identidade Verificada',
                    desc: 'CPF, documento e endereço validados pela plataforma',
                    iconBg: '#DBEAFE', iconColor: '#2563EB',
                  },
                  {
                    icon: Star,
                    label: 'Avaliações Autênticas',
                    desc: `Apenas donos com reserva concluída podem avaliar${avaliacoes.length > 0 ? ` · ${(avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length).toFixed(1)}★ média` : ''}`,
                    iconBg: '#FEF9C3', iconColor: '#CA8A04',
                  },
                  {
                    icon: Heart,
                    label: 'Experiência Comprovada',
                    desc: 'Histórico de atendimentos revisado antes da aprovação',
                    iconBg: '#FFE4E6', iconColor: '#E11D48',
                  },
                  {
                    icon: Clock,
                    label: 'Resposta Rápida',
                    desc: 'Tempo médio de resposta inferior a 1 hora',
                    iconBg: '#DCFCE7', iconColor: '#16A34A',
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl transition-colors hover:opacity-90" style={{ backgroundColor: dm.bg }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: item.iconBg }}>
                      <item.icon className="w-4 h-4" style={{ color: item.iconColor }} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: dm.textPrimary }}>{item.label}</p>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: dm.textSec }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer disclaimer */}
              <p className="text-xs mt-4 pt-3 leading-relaxed" style={{ color: dm.textSec, borderTop: `1px solid ${dm.border}` }}>
                🔒 A verificação PetConnect garante que os dados e o histórico do cuidador foram revisados pela nossa equipe antes da publicação do perfil.
              </p>
            </div>
          </div>
        </div>

        {/* CTA mobile fixo */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 border-t shadow-lg flex gap-3" style={{ backgroundColor: dm.card, borderColor: dm.border }}>
          {cuidador.telefone && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-xl font-semibold text-sm"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          )}
          <button onClick={handleSolicitarOrcamento} className="flex-1 py-3 text-white rounded-xl font-semibold text-sm" style={{ backgroundColor: '#FF6900' }}>
            Orçamento
          </button>
        </div>
        <div className="sm:hidden h-20" />
      </div>

      {/* Modal de revisão de reserva */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[95vh] overflow-y-auto" style={{ backgroundColor: dm.card }}>

            {/* Header gradiente */}
            <div className="relative rounded-t-3xl sm:rounded-t-3xl px-6 pt-6 pb-8 overflow-hidden" style={{ background: 'linear-gradient(to right, #FF6900, #FE9A00)' }}>
              <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full" />
              <div className="absolute -bottom-4 right-16 w-16 h-16 bg-white/10 rounded-full" />
              <div className="flex items-start justify-between relative">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-2xl">
                    🐾
                  </div>
                  <div>
                    <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Revisar &amp; Editar</p>
                    <h2 className="text-white text-xl font-extrabold leading-tight">Solicitar Orçamento</h2>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              {/* Cuidador pill */}
              <div className="mt-4 flex items-center gap-2 bg-white/20 backdrop-blur rounded-2xl px-4 py-2 w-fit relative">
                <div className="w-7 h-7 bg-white/30 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {cuidador.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">{cuidador.nome}</p>
                  {cuidador.endereco?.cidade && (
                    <p className="text-white/70 text-xs">{cuidador.endereco.cidade}, {cuidador.endereco.uf}</p>
                  )}
                </div>
              </div>
            </div>

            {editData && (() => {
              const dias = editData.dataEntrada && editData.dataSaida
                ? calcDays(editData.dataEntrada, editData.dataSaida)
                : 0;
              const valorTotal = dias * cuidador.valorDiaria;
              const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm font-semibold focus:outline-none transition-all border";
              const inputStyle = { backgroundColor: dm.accent, borderColor: dm.border, color: dm.textPrimary };
              const labelCls = "block text-xs font-bold uppercase tracking-wider mb-1.5";
              const labelStyle = { color: '#FF6900' };
              return (
                <div className="px-6 pb-6 pt-5 space-y-5">

                  {/* Dados do Pet */}
                  <div>
                    <p className="flex items-center gap-2 text-sm font-extrabold text-gray-700 mb-3">
                      <span className="w-5 h-5 rounded-lg flex items-center justify-center text-xs" style={{ backgroundColor: dm.accent }}>🐶</span>
                      Dados do Pet
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className={labelCls} style={labelStyle}>Nome do pet</label>
                        <input
                          className={inputCls} style={inputStyle}
                          value={editData.petName}
                          onChange={(e) => updateEdit('petName', e.target.value)}
                          placeholder="Ex: Rex"
                        />
                      </div>
                      <div className="relative">
                        <label className={labelCls} style={labelStyle}>Espécie</label>
                        <select
                          className={inputCls + ' appearance-none pr-8'} style={inputStyle}
                          value={editData.petType}
                          onChange={(e) => updateEdit('petType', e.target.value)}
                        >
                          {['Cachorro', 'Gato', 'Pássaro', 'Roedor', 'Réptil', 'Peixe'].map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 bottom-3 w-3.5 h-3.5 text-orange-400 pointer-events-none" />
                      </div>
                      <div className="relative">
                        <label className={labelCls} style={labelStyle}>Porte</label>
                        <select
                          className={inputCls + ' appearance-none pr-8'} style={inputStyle}
                          value={editData.petSize}
                          onChange={(e) => updateEdit('petSize', e.target.value)}
                        >
                          {['Pequeno', 'Médio', 'Grande'].map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 bottom-3 w-3.5 h-3.5 text-orange-400 pointer-events-none" />
                      </div>
                      <div className="col-span-2">
                        <label className={labelCls} style={labelStyle}>Cuidados especiais</label>
                        <textarea
                          className={inputCls + ' resize-none'} style={inputStyle}
                          rows={2}
                          value={editData.specialCareDesc}
                          onChange={(e) => updateEdit('specialCareDesc', e.target.value)}
                          placeholder="Ex: toma remédio às 8h..."
                        />
                      </div>
                      <div className="col-span-2">
                        <label className={labelCls} style={labelStyle}>Comportamento</label>
                        <textarea
                          className={inputCls + ' resize-none'} style={inputStyle}
                          rows={2}
                          value={editData.petBehavior}
                          onChange={(e) => updateEdit('petBehavior', e.target.value)}
                          placeholder="Ex: brincalhão, dócil..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Período */}
                  <div>
                    <p className="flex items-center gap-2 text-sm font-extrabold mb-3" style={{ color: dm.textPrimary }}>
                      <span className="w-5 h-5 rounded-lg flex items-center justify-center text-xs" style={{ backgroundColor: dm.accent }}>📅</span>
                      Período da Estadia
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls} style={labelStyle}>Entrada</label>
                        <input
                          type="date"
                          className={inputCls} style={inputStyle}
                          value={editData.dataEntrada?.slice(0, 10) ?? ''}
                          onChange={(e) => updateEdit('dataEntrada', e.target.value ? new Date(e.target.value).toISOString() : null)}
                        />
                      </div>
                      <div>
                        <label className={labelCls} style={labelStyle}>Saída</label>
                        <input
                          type="date"
                          className={inputCls} style={inputStyle}
                          value={editData.dataSaida?.slice(0, 10) ?? ''}
                          onChange={(e) => updateEdit('dataSaida', e.target.value ? new Date(e.target.value).toISOString() : null)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Previsão de valor */}
                  {dias > 0 && (
                    <div className="rounded-2xl p-4 border" style={{ backgroundColor: dm.accent, borderColor: dm.border }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold" style={{ color: dm.textSec }}>{dias} dia{dias !== 1 ? 's' : ''} × R$ {cuidador.valorDiaria.toFixed(2)}/dia</span>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-sm font-bold" style={{ color: dm.textSec }}>Total estimado</span>
                        <span className="text-3xl font-extrabold" style={{ color: '#FF6900' }}>R$ {valorTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Botões */}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => setShowModal(false)}
                      className="flex-1 py-3.5 rounded-2xl font-bold transition-colors"
                      style={{ backgroundColor: dm.form, color: dm.textSec }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConfirmar}
                      disabled={submitting || !editData.dataEntrada || !editData.dataSaida || !editData.petName}
                      className="flex-2 px-8 py-3.5 disabled:opacity-40 text-white rounded-2xl font-bold shadow-lg transition-all"
                      style={{ background: 'linear-gradient(to right, #FF6900, #FE9A00)' }}
                    >
                      {submitting ? 'Enviando...' : '✓ Enviar Orçamento'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal de edição de perfil */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" style={{ backgroundColor: dm.card }}>
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: dm.border }}>
              <h2 className="text-lg font-bold" style={{ color: dm.textPrimary }}>Editar Perfil</h2>
              <button onClick={() => setShowEditModal(false)} style={{ color: dm.textSec }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#FF6900' }}>Nome</label>
                <input
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none border"
                  style={{ backgroundColor: dm.accent, borderColor: dm.border, color: dm.textPrimary }}
                  value={profileData.nome}
                  onChange={(e) => setProfileData((p) => ({ ...p, nome: e.target.value }))}
                />
              </div>
              {/* Telefone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#FF6900' }}>Telefone</label>
                <input
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none border"
                  style={{ backgroundColor: dm.accent, borderColor: dm.border, color: dm.textPrimary }}
                  value={profileData.telefone}
                  onChange={(e) => setProfileData((p) => ({ ...p, telefone: e.target.value }))}
                />
              </div>
              {/* Valor diária */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#FF6900' }}>Valor por dia (R$)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none border"
                  style={{ backgroundColor: dm.accent, borderColor: dm.border, color: dm.textPrimary }}
                  value={profileData.hourlyRate}
                  onChange={(e) => setProfileData((p) => ({ ...p, hourlyRate: Number(e.target.value) }))}
                />
              </div>
              {/* Bio */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#FF6900' }}>Bio</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none resize-none border"
                  style={{ backgroundColor: dm.accent, borderColor: dm.border, color: dm.textPrimary }}
                  value={profileData.bio}
                  onChange={(e) => setProfileData((p) => ({ ...p, bio: e.target.value }))}
                />
              </div>
              {/* Especialidades */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#FF6900' }}>Especialidades (separadas por vírgula)</label>
                <input
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none border"
                  style={{ backgroundColor: dm.accent, borderColor: dm.border, color: dm.textPrimary }}
                  value={especialidadesInput}
                  onChange={(e) => setEspecialidadesInput(e.target.value)}
                  placeholder="Ex: Banho, Tosa, Adestramento"
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-3 rounded-2xl font-bold transition-colors"
                style={{ backgroundColor: dm.form, color: dm.textSec }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="flex-1 py-3 disabled:opacity-40 text-white rounded-2xl font-bold transition-colors"
                style={{ backgroundColor: '#FF6900' }}
              >
                {savingProfile ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tooltip Verificação — fixed, fora de qualquer overflow ── */}
      {showVerifiedTooltip && (
        <>
          {/* Backdrop invisível para fechar ao clicar fora */}
          <div
            className="fixed inset-0 z-[59]"
            onClick={() => setShowVerifiedTooltip(false)}
          />
          <div
            className="fixed z-[60] w-80 rounded-2xl shadow-2xl"
            style={{ top: tooltipPos.top, left: tooltipPos.left, backgroundColor: '#FFFFFF', border: '1px solid #EEDFD3' }}
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3 flex items-center gap-2" style={{ borderBottom: '1px solid #EEDFD3' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#DBEAFE' }}>
                <Shield className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: '#1E2939' }}>Verificação PetConnect</p>
                <p className="text-xs" style={{ color: '#717182' }}>O que checamos antes de aprovar o perfil</p>
              </div>
              <button
                onClick={() => setShowVerifiedTooltip(false)}
                className="ml-auto p-1 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                style={{ color: '#717182' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Itens verificados */}
            <div className="px-4 py-3 space-y-2.5">
              {[
                { icon: '🪪', label: 'Identidade confirmada', desc: 'CPF e documento oficial validados pela equipe' },
                { icon: '📍', label: 'Endereço verificado', desc: 'Localização real checada antes da aprovação' },
                { icon: '📸', label: 'Foto autêntica', desc: 'Imagem de perfil confirmada como real' },
                { icon: '🧾', label: 'Histórico analisado', desc: 'Atendimentos anteriores revisados internamente' },
                { icon: '⭐', label: 'Avaliações reais', desc: 'Somente donos com reserva concluída podem avaliar' },
              ].map(({ icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="text-base leading-none mt-0.5 flex-shrink-0">{icon}</span>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#1E2939' }}>{label}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#717182' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer — nota média real */}
            {avaliacoes.length > 0 ? (
              <div className="mx-4 mb-4 mt-1 rounded-xl px-3 py-2.5 flex items-center gap-3" style={{ backgroundColor: '#FEF9C3' }}>
                <span className="text-xl">⭐</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: '#713F12' }}>
                    {(avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length).toFixed(1)} de 5.0
                  </p>
                  <p className="text-xs" style={{ color: '#92400E' }}>
                    {avaliacoes.length} avaliação{avaliacoes.length !== 1 ? 'ões' : ''} verificada{avaliacoes.length !== 1 ? 's' : ''} de clientes reais
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-4 mb-4 mt-1 rounded-xl px-3 py-2" style={{ backgroundColor: '#F3F3F5' }}>
                <p className="text-xs" style={{ color: '#717182' }}>🔒 Perfil aprovado pela PetConnect — avaliações aparecem após a primeira reserva concluída.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Popup de sucesso */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center" style={{ backgroundColor: dm.card }}>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Orçamento Enviado!</h2>
            <p className="text-gray-500 text-sm mb-6">O cuidador irá analisar seu orçamento e entrará em contato em breve. Acompanhe o status na aba de Reservas.</p>
            <button
              onClick={() => setShowSuccess(false)}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-colors"
            >
              Ok, entendi!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
