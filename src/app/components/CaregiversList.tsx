import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cuidadoresApi, Cuidador } from '../../lib/api';
import { CaregiverFilters } from '../App';
import {
  MapPin,
  DollarSign,
  Loader2,
  ArrowLeft,
  Search,
  Star,
  X,
  SlidersHorizontal,
  Navigation,
} from 'lucide-react';
import { toast } from 'sonner';

interface CaregiversListProps {
  onBack?: () => void;
  onViewProfile?: (cuidador: Cuidador) => void;
  initialFilters?: CaregiverFilters;
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

const SORT_OPTIONS = [
  { value: 'name', label: 'Nome (A-Z)' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
];

export function CaregiversList({ onBack, onViewProfile, initialFilters }: CaregiversListProps) {
  const dark = localStorage.getItem('petconnect-dark') === 'true';
  const dm = {
    bg:          dark ? '#0F172A' : '#FFFBEB',
    card:        dark ? '#1E293B' : '#FFFFFF',
    border:      dark ? '#334155' : '#EEDFD3',
    textPrimary: dark ? '#E2E8F0' : '#1E2939',
    textSec:     dark ? '#94A3B8' : '#717182',
    form:        dark ? '#0F172A' : '#F3F3F5',
    accent:      dark ? '#1E3A5F' : '#FFEDD4',
  };

  const [cuidadores, setCuidadores] = useState<Cuidador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(initialFilters?.name ?? '');
  const [filterCity, setFilterCity] = useState(initialFilters?.city ?? '');
  const [filterMaxPrice, setFilterMaxPrice] = useState(initialFilters?.maxPrice ?? '');
  const [filterSpecialty, setFilterSpecialty] = useState(initialFilters?.specialty ?? '');
  const [sortBy, setSortBy] = useState('name');
  const [hoveredMapId, setHoveredMapId] = useState<string | null>(null);
  const bestMatchId = initialFilters?.bestMatchId;
  const petName = initialFilters?.petName;

  // Mapa id → distanciaKm vindo do resultado do match
  const distanciaMap = new Map<string, number>(
    (initialFilters?.preloadedCuidadores ?? [])
      .filter((c) => c.id != null && c.distanciaKm != null)
      .map((c) => [c.id as string, c.distanciaKm as number])
  );

  useEffect(() => {
    loadCuidadores();
  }, []);

  const loadCuidadores = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cuidadoresApi.getAll();
      setCuidadores(data);
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao carregar cuidadores';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const uniqueCities = [...new Set(cuidadores.map((c) => c.endereco?.cidade).filter(Boolean))] as string[];
  const uniqueSpecialties = [...new Set(cuidadores.flatMap((c) => c.especialidades ?? []).filter(Boolean))];

  const hasActiveFilters = searchTerm || filterCity || filterMaxPrice || filterSpecialty;

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCity('');
    setFilterMaxPrice('');
    setFilterSpecialty('');
  };

  const filteredCuidadores = cuidadores
    .filter((c) => {
      if (searchTerm && !c.nome?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterCity && !c.endereco?.cidade?.toLowerCase().includes(filterCity.toLowerCase())) return false;
      if (filterMaxPrice && c.valorDiaria != null && c.valorDiaria > Number(filterMaxPrice)) return false;
      if (filterSpecialty && !c.especialidades?.some((e) => e.toLowerCase().includes(filterSpecialty.toLowerCase()))) return false;
      return true;
    })
    .sort((a, b) => {
      // Best match sempre primeiro
      if (bestMatchId) {
        if (a.id === bestMatchId) return -1;
        if (b.id === bestMatchId) return 1;
      }
      if (sortBy === 'price_asc') return (a.valorDiaria ?? 0) - (b.valorDiaria ?? 0);
      if (sortBy === 'price_desc') return (b.valorDiaria ?? 0) - (a.valorDiaria ?? 0);
      return (a.nome ?? '').localeCompare(b.nome ?? '');
    });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: dm.bg }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#FF6900' }} />
          <p style={{ color: dm.textSec }}>Carregando cuidadores...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: dm.bg }}>
        <div className="p-8 rounded-xl shadow-md max-w-md text-center" style={{ backgroundColor: dm.card, border: `1px solid ${dm.border}` }}>
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={loadCuidadores} className="px-5 py-2 text-white rounded-lg transition-colors" style={{ backgroundColor: '#FF6900' }}>
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: dm.bg }}>

      {/* Header */}
      <div className="px-6 pt-6 pb-2 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold transition-colors" style={{ color: dm.textPrimary }}>
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <h1 className="text-2xl font-bold" style={{ color: '#FF6900' }}>Cuidadores Disponíveis</h1>
        </div>
      </div>

      {/* Filters bar */}
      <div className="border-b sticky top-0 z-10" style={{ backgroundColor: dm.card, borderColor: dm.border }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: dm.textSec }} />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-full text-sm focus:outline-none border"
              style={{ backgroundColor: dm.form, borderColor: 'transparent', color: dm.textPrimary }}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium border cursor-default" style={{ backgroundColor: dm.form, borderColor: 'transparent', color: dm.textSec }}>
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filtrar
            </span>

            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="px-3 py-2 rounded-full text-sm border cursor-pointer focus:outline-none"
              style={filterCity ? { backgroundColor: dm.accent, borderColor: '#FE9A00', color: '#FF6900' } : { backgroundColor: dm.form, borderColor: 'transparent', color: dm.textSec }}
            >
              <option value="">Cidade ↓</option>
              {uniqueCities.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>

            <div className="flex items-center gap-1 px-3 py-2 rounded-full text-sm border" style={filterMaxPrice ? { backgroundColor: dm.accent, borderColor: '#FE9A00' } : { backgroundColor: dm.form, borderColor: 'transparent' }}>
              <span className="text-xs" style={{ color: dm.textSec }}>Valor R$</span>
              <input
                type="number" min="0" placeholder="máx"
                value={filterMaxPrice}
                onChange={(e) => setFilterMaxPrice(e.target.value)}
                className="w-16 bg-transparent text-sm focus:outline-none"
                style={{ color: dm.textPrimary }}
              />
            </div>

            {/* Especialidade checkboxes */}
            <div className="flex items-center gap-2">
              {uniqueSpecialties.map((esp) => {
                const active = filterSpecialty === esp;
                return (
                  <label key={esp} className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border cursor-pointer select-none transition-colors"
                    style={active ? { backgroundColor: dm.accent, borderColor: '#FE9A00', color: '#FF6900' } : { backgroundColor: dm.form, borderColor: 'transparent', color: dm.textSec }}
                  >
                    <input type="checkbox" className="w-3.5 h-3.5" style={{ accentColor: '#FF6900' }} checked={active}
                      onChange={() => setFilterSpecialty(active ? '' : esp)} />
                    {esp === 'Cachorro' ? '🐶 Cães' : esp === 'Gato' ? '🐱 Gatos' : esp}
                  </label>
                );
              })}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-full text-sm border cursor-pointer focus:outline-none"
              style={{ backgroundColor: dm.form, borderColor: 'transparent', color: dm.textSec }}
            >
              {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>↕ {opt.label}</option>)}
            </select>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 rounded-full text-sm border transition-colors" style={{ backgroundColor: '#FEE2E2', borderColor: 'transparent', color: '#991B1B' }}>
                <X className="w-3.5 h-3.5" /> Limpar
              </button>
            )}
          </div>
        </div>

        {/* Count */}
        <div className="max-w-7xl mx-auto px-6 pb-2">
          <p className="text-sm" style={{ color: dm.textSec }}>
            Total: <strong style={{ color: dm.textPrimary }}>{filteredCuidadores.length} Cuidadores encontrados</strong>
          </p>
        </div>
      </div>

      {/* Best Match banner */}
      {!!bestMatchId && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm" style={{ backgroundColor: '#FFEDD4', color: '#FF6900' }}>
            <span className="text-xl">🏆</span>
            <span>
              Resultados personalizados para <strong>{petName ?? 'seu pet'}</strong> — ordenados por compatibilidade.
              O primeiro é o <strong>Best Match</strong> com distância indicada no cartão!
            </span>
          </div>
        </div>
      )}

      {/* Cards Grid */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {filteredCuidadores.length === 0 ? (
          <div className="p-16 rounded-2xl shadow-sm text-center" style={{ backgroundColor: dm.card, border: `1px solid ${dm.border}` }}>
            <p className="text-5xl mb-4">🐾</p>
            <p className="font-medium" style={{ color: dm.textSec }}>Nenhum cuidador encontrado</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-3 hover:underline text-sm" style={{ color: '#FF6900' }}>
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-start">
            {filteredCuidadores.map((cuidador, index) => {
              const isBestMatch = !!(bestMatchId && cuidador.id === bestMatchId);
              const distancia = cuidador.id ? distanciaMap.get(cuidador.id) : undefined;
              return (
                <motion.div
                  key={cuidador.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
                  className="relative"
                  onMouseEnter={() => cuidador.endereco && setHoveredMapId(cuidador.id ?? null)}
                  onMouseLeave={() => setHoveredMapId(null)}
                >
                  {/* Map popover */}
                  {hoveredMapId === cuidador.id && cuidador.endereco && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 rounded-2xl overflow-hidden shadow-2xl border bg-white" style={{ borderColor: '#EEDFD3' }}>
                      <iframe src={buildMapUrl(cuidador.endereco)} width="100%" height="160" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={`Mapa - ${cuidador.nome}`} />
                      <div className="px-3 py-1.5 text-xs text-center truncate" style={{ backgroundColor: '#F3F3F5', color: '#717182' }}>
                        {[cuidador.endereco.cidade, cuidador.endereco.uf].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  )}

                  {isBestMatch && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-3 py-1 text-white text-xs font-bold rounded-full shadow-md whitespace-nowrap" style={{ background: 'linear-gradient(to right, #FF6900, #FE9A00)' }}>
                      🏆 MELHOR MATCH
                    </div>
                  )}

                  {/* Card */}
                  <div className={`rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow ${isBestMatch ? 'ring-2 ring-orange-400' : ''}`} style={{ backgroundColor: dm.card, border: `1px solid ${dm.border}` }}>

                    {/* Top photo area */}
                    <div className="relative flex-shrink-0 overflow-hidden" style={{ height: '140px', backgroundColor: '#FFEDD4' }}>
                      {cuidador.fotoUrl ? (
                        <img src={cuidador.fotoUrl} alt={cuidador.nome} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #FFEDD4, #FE9A00 80%)' }} />
                      )}

                      {/* Nav arrows */}
                      <button className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center shadow-sm text-gray-500 hover:bg-white transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <button className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center shadow-sm text-gray-500 hover:bg-white transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>

                    {/* Avatar overlapping */}
                    <div className="flex justify-center -mt-9 mb-2 relative z-10">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-white shadow-md overflow-hidden" style={{ backgroundColor: '#FFEDD4' }}>
                          {cuidador.fotoUrl ? (
                            <img src={cuidador.fotoUrl} alt={cuidador.nome} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #FF6900, #FE9A00)' }}>
                              {cuidador.nome?.charAt(0).toUpperCase() || 'C'}
                            </div>
                          )}
                        </div>
                        {/* Heart badge */}
                        <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white" style={{ backgroundColor: '#FF6900' }}>
                          <svg className="w-3 h-3" fill="white" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="px-4 pb-4 flex flex-col items-center text-center">
                      <h3 className="font-bold text-sm mb-2" style={{ color: dm.textPrimary }}>{cuidador.nome}</h3>

                      {/* Stars + rating badge */}
                      <div className="flex items-center gap-1 mb-3">
                        {[1,2,3,4,5].map((i) => (
                          <Star key={i} className={`w-4 h-4 ${i <= 4 ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
                        ))}
                        <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-bold text-white" style={{ backgroundColor: '#FF6900' }}>4.0</span>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-1 mb-1.5 text-xs" style={{ color: dm.textSec }}>
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#FF6900' }} />
                        <span>{cuidador.endereco?.cidade ? `${cuidador.endereco.cidade}, ${cuidador.endereco.uf}` : 'Não informado'}</span>
                      </div>

                      {/* Price */}
                      <div className="flex items-center gap-1 mb-2 text-sm font-semibold" style={{ color: dm.textPrimary }}>
                        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#FF6900" strokeWidth={2}>
                          <circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h4.5a1.5 1.5 0 010 3H10.5a1.5 1.5 0 010 3H15"/>
                        </svg>
                        <span>{cuidador.valorDiaria != null ? `R$ ${cuidador.valorDiaria.toFixed(2)}/dia` : 'Sob consulta'}</span>
                      </div>

                      {/* Distance */}
                      {distancia != null && (
                        <div className="flex items-center gap-1 mb-2 text-xs font-medium" style={{ color: isBestMatch ? '#FF6900' : '#0369a1' }}>
                          <Navigation className="w-3 h-3" />
                          {distancia < 1 ? `${Math.round(distancia * 1000)} m` : `${distancia.toFixed(1)} km`}
                        </div>
                      )}

                      {/* Specialty tags */}
                      {cuidador.especialidades && cuidador.especialidades.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-center mb-3">
                          {cuidador.especialidades.slice(0, 2).map((esp, idx) => (
                            <span key={idx} className="px-3 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: dm.form, color: dm.textSec }}>
                              {esp}
                            </span>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => onViewProfile?.(cuidador)}
                        className="w-full py-2.5 rounded-full text-white text-sm font-bold transition-opacity hover:opacity-90"
                        style={{ backgroundColor: '#FF6900' }}
                      >
                        Ver Perfil
                      </button>
                    </div>
                  </div>

                  {/* Hover: map popover acima */}
                  {hoveredMapId === cuidador.id && cuidador.fotoUrl && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-48 rounded-2xl overflow-hidden shadow-xl border" style={{ borderColor: '#EEDFD3' }}>
                      <img src={cuidador.fotoUrl} alt={cuidador.nome} className="w-full h-32 object-cover" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
