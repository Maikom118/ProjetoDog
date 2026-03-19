import { useState, useEffect } from 'react';
import { Cuidador } from '../../lib/api';
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

export function CaregiverProfile({ cuidador, onBack }: CaregiverProfileProps) {
  const [mapError, setMapError] = useState(false);

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

  const whatsappUrl = `https://wa.me/55${cuidador.telefone?.replace(/\D/g, '')}`;
  const mapUrl = cuidador.endereco ? buildMapUrl(cuidador.endereco) : null;
  const mapsLink = cuidador.endereco ? buildGoogleMapsLink(cuidador.endereco) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Voltar aos Cuidadores</span>
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 text-gray-600 hover:text-orange-500 transition-colors text-sm"
        >
          <Share2 className="w-4 h-4" />
          Compartilhar
        </button>
      </div>

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-amber-500 text-white overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-white/10 rounded-full" />

        <div className="relative max-w-4xl mx-auto px-4 py-12">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            {/* Avatar */}
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-6xl border-4 border-white/40 shadow-2xl flex-shrink-0">
              {cuidador.nome?.charAt(0).toUpperCase() || 'C'}
            </div>

            <div className="text-center sm:text-left flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <Shield className="w-5 h-5 text-orange-200" />
                <span className="text-orange-100 text-sm">Cuidador Verificado</span>
              </div>
              <h1 className="text-4xl font-bold mb-2">{cuidador.nome}</h1>
              <div className="flex items-center justify-center sm:justify-start gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-300 text-yellow-300" />
                ))}
                <span className="text-orange-100 text-sm ml-1">5.0 (47 avaliações)</span>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-orange-50">
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
              <button className="px-6 py-3 bg-white text-orange-600 rounded-xl font-semibold shadow-lg hover:bg-orange-50 transition-colors">
                Solicitar Orçamento
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {MOCK_STATS.map((stat, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
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
              <section className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800 mb-4">
                  <Award className="w-5 h-5 text-orange-500" />
                  Sobre o Cuidador
                </h2>
                <p className="text-gray-600 leading-relaxed">{cuidador.bio}</p>
              </section>
            )}

            {/* O que está incluído */}
            <section className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800 mb-4">
                <CheckCircle className="w-5 h-5 text-orange-500" />
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
              <section className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800 mb-4">
                  <Heart className="w-5 h-5 text-orange-500" />
                  Especialidades
                </h2>
                <div className="flex flex-wrap gap-3">
                  {cuidador.especialidades.map((esp, idx) => (
                    <span
                      key={idx}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-xl text-sm font-medium border border-orange-100"
                    >
                      <span>{getSpecialtyIcon(esp)}</span>
                      {esp}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Avaliações */}
            <section className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800 mb-2">
                <Star className="w-5 h-5 text-orange-500" />
                Avaliações
              </h2>
              <div className="flex items-center gap-3 mb-6 p-4 bg-orange-50 rounded-xl">
                <div className="text-5xl font-bold text-orange-500">5.0</div>
                <div>
                  <div className="flex gap-0.5 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">47 avaliações verificadas</p>
                </div>
              </div>
              <div className="space-y-4">
                {MOCK_REVIEWS.map((review, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white font-bold text-sm">
                          {review.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{review.name}</p>
                          <p className="text-xs text-gray-400">{review.pet} • {review.date}</p>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[...Array(review.rating)].map((_, s) => (
                          <Star key={s} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{review.text}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Mapa */}
            {mapUrl && (
              <section className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
                    <MapPin className="w-5 h-5 text-orange-500" />
                    Localização
                  </h2>
                  {mapsLink && (
                    <a
                      href={mapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 transition-colors"
                    >
                      Abrir no Maps
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* Endereço formatado */}
                <div className="p-3 bg-gray-50 rounded-xl mb-4 text-sm text-gray-600">
                  <p className="font-medium text-gray-800">
                    {cuidador.endereco.logradouro}, {cuidador.endereco.numero}
                    {cuidador.endereco.complemento && ` - ${cuidador.endereco.complemento}`}
                  </p>
                  <p>{cuidador.endereco.bairro} · {cuidador.endereco.cidade}, {cuidador.endereco.uf}</p>
                  <p className="text-gray-400">CEP {cuidador.endereco.cep}</p>
                </div>

                {/* Mapa embutido */}
                {!mapError ? (
                  <div className="rounded-xl overflow-hidden border border-gray-200 h-64 sm:h-80">
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
                        className="text-sm text-orange-500 hover:underline"
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
            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-20">
              <div className="text-center mb-5">
                <p className="text-3xl font-bold text-orange-500">
                  R$ {cuidador.valorDiaria?.toFixed(2)}
                </p>
                <p className="text-gray-500 text-sm">por dia</p>
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
                <button className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-colors shadow-md">
                  <Calendar className="w-5 h-5" />
                  Solicitar Orçamento
                </button>
              </div>

              <p className="text-center text-xs text-gray-400">
                Sem compromisso. Resposta geralmente em menos de 1 hora.
              </p>
            </div>

            {/* Contato */}
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
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
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-bold text-gray-800 mb-4">Garantias</h3>
              <div className="space-y-3">
                {[
                  { icon: Shield, label: 'Perfil Verificado', color: 'text-blue-600 bg-blue-50' },
                  { icon: Star, label: 'Avaliações Reais', color: 'text-yellow-600 bg-yellow-50' },
                  { icon: Heart, label: 'Amor pelos Animais', color: 'text-red-500 bg-red-50' },
                  { icon: Clock, label: 'Respostas Rápidas', color: 'text-green-600 bg-green-50' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-gray-600">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CTA mobile fixo */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg flex gap-3">
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
          <button className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-semibold text-sm">
            Orçamento
          </button>
        </div>
        <div className="sm:hidden h-20" />
      </div>
    </div>
  );
}
