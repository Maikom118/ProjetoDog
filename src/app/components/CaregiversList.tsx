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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-gray-500">Carregando cuidadores...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-md text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={loadCuidadores} className="px-5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-amber-500 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-56 h-56 bg-white/10 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="relative max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-white">Cuidadores</h1>
                <p className="text-orange-100 text-sm">Encontre o cuidador ideal para seu pet</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{filteredCuidadores.length}</p>
              <p className="text-orange-100 text-sm">
                {hasActiveFilters ? 'encontrado(s)' : 'disponíveis'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Filters sempre visíveis */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 space-y-3">

          {/* Busca por nome */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cuidador por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-colors"
            />
          </div>

          {/* Filtros em linha */}
          <div className="flex flex-wrap gap-2 items-center">
            <SlidersHorizontal className="w-4 h-4 text-gray-400 flex-shrink-0" />

            {/* Cidade */}
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors cursor-pointer focus:outline-none ${
                filterCity ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}
            >
              <option value="">📍 Todas as cidades</option>
              {uniqueCities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>

            {/* Especialidade */}
            <select
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors cursor-pointer focus:outline-none ${
                filterSpecialty ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}
            >
              <option value="">⭐ Especialidade</option>
              {uniqueSpecialties.map((esp) => (
                <option key={esp} value={esp}>{esp}</option>
              ))}
            </select>

            {/* Preço máximo */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
              filterMaxPrice ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-200'
            }`}>
              <span className="text-gray-400 text-xs">R$</span>
              <input
                type="number"
                min="0"
                placeholder="Preço máx."
                value={filterMaxPrice}
                onChange={(e) => setFilterMaxPrice(e.target.value)}
                className="w-24 bg-transparent text-sm focus:outline-none text-gray-600 placeholder-gray-400"
              />
            </div>

            {/* Ordenar */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-full text-sm border bg-gray-50 border-gray-200 text-gray-600 cursor-pointer focus:outline-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>↕ {opt.label}</option>
              ))}
            </select>

            {/* Limpar filtros */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Banner de resultado do chat */}
      {!!bestMatchId && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700">
            <span className="text-xl">🏆</span>
            <span>
              Resultados personalizados para <strong>{petName ?? 'seu pet'}</strong> — ordenados por compatibilidade pelo Toby.
              O primeiro da lista é o <strong>Best Match</strong> e a distância de cada cuidador está indicada no cartão!
            </span>
          </div>
        </div>
      )}

      {/* Grid de Cuidadores */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {filteredCuidadores.length === 0 ? (
          <div className="bg-white p-16 rounded-2xl shadow-sm text-center">
            <p className="text-5xl mb-4">🐾</p>
            <p className="text-gray-500 font-medium">Nenhum cuidador encontrado</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-3 text-orange-500 hover:underline text-sm">
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mt-2">
            {filteredCuidadores.map((cuidador, index) => {
              const isBestMatch = !!(bestMatchId && cuidador.id === bestMatchId);
              const distancia = cuidador.id ? distanciaMap.get(cuidador.id) : undefined;
              return (
              <motion.div
                key={cuidador.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
                className={`relative ${isBestMatch ? 'p-[3px] rounded-[20px] bg-gradient-to-br from-orange-400 via-amber-400 to-orange-500' : ''}`}
                onMouseEnter={() => cuidador.endereco && setHoveredMapId(cuidador.id ?? null)}
                onMouseLeave={() => setHoveredMapId(null)}
              >
                {/* Minimap popover */}
                {hoveredMapId === cuidador.id && cuidador.endereco && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 rounded-2xl overflow-hidden shadow-2xl border border-gray-100 bg-white">
                    <iframe
                      src={buildMapUrl(cuidador.endereco)}
                      width="100%"
                      height="160"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={`Mapa - ${cuidador.nome}`}
                    />
                    <div className="px-3 py-1.5 text-xs text-gray-500 text-center truncate bg-gray-50 border-t border-gray-100">
                      {[cuidador.endereco.cidade, cuidador.endereco.uf].filter(Boolean).join(', ')}
                    </div>
                  </div>
                )}

                {/* Badge flutuante acima do card */}
                {isBestMatch && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold rounded-full shadow-lg whitespace-nowrap">
                    🏆 MELHOR MATCH
                  </div>
                )}
              <div
                className={`group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col ${
                  isBestMatch ? 'rounded-[18px] shadow-orange-200 shadow-xl' : ''
                }`}
              >
                {/* Topo colorido */}
                <div className={`bg-gradient-to-br ${isBestMatch ? 'from-orange-500 to-amber-400' : 'from-orange-400 to-amber-500'} h-20 relative flex-shrink-0`}>
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                    <div className="w-16 h-16 rounded-full bg-white p-1 shadow-md">
                      {cuidador.fotoUrl ? (
                        <img src={cuidador.fotoUrl} alt={cuidador.nome} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-bold">
                          {cuidador.nome?.charAt(0).toUpperCase() || 'C'}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Badge verificado no canto do card */}
                  {cuidador.fotoUrl && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-md">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Verificado
                    </div>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="pt-10 px-5 pb-5 flex flex-col flex-1">
                  <div className="text-center mb-4">
                    <h3 className="font-bold text-gray-900 text-base leading-tight">{cuidador.nome}</h3>

                    {/* Estrelas mock */}
                    <div className="flex items-center justify-center gap-0.5 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      ))}
                      <span className="text-xs text-gray-400 ml-1">5.0</span>
                    </div>

                    <div className="flex items-center justify-center gap-1 mt-2 text-gray-500 text-sm">
                      <MapPin className="w-3.5 h-3.5 text-orange-400" />
                      <span>
                        {cuidador.endereco?.cidade
                          ? `${cuidador.endereco.cidade}, ${cuidador.endereco.uf}`
                          : 'Não informado'}
                      </span>
                    </div>

                    {/* Distância do match */}
                    {distancia != null && (
                      <div className={`inline-flex items-center justify-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        isBestMatch ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        <Navigation className="w-3 h-3" />
                        {distancia < 1
                          ? `${Math.round(distancia * 1000)} m de distância`
                          : `${distancia.toFixed(1)} km de distância`}
                      </div>
                    )}
                  </div>

                  {/* Especialidades */}
                  {cuidador.especialidades && cuidador.especialidades.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center mb-4">
                      {cuidador.especialidades.slice(0, 3).map((esp, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full text-xs font-medium">
                          {esp}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto space-y-3">
                    <div className="flex items-center justify-center gap-1">
                      <DollarSign className="w-4 h-4 text-orange-500" />
                      <span className="text-lg font-bold text-orange-500">
                        {cuidador.valorDiaria != null ? `R$ ${cuidador.valorDiaria.toFixed(2)}` : 'Sob consulta'}
                      </span>
                      {cuidador.valorDiaria != null && <span className="text-xs text-gray-400">/dia</span>}
                    </div>

                    <button
                      onClick={() => onViewProfile?.(cuidador)}
                      className="w-full py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 active:scale-95 transition-all text-sm font-semibold shadow-sm"
                    >
                      Ver Perfil
                    </button>
                  </div>
                </div>
              </div>

              {/* Foto ampliada no hover — abaixo do card */}
              {hoveredMapId === cuidador.id && cuidador.fotoUrl && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-56 rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
                  <img src={cuidador.fotoUrl} alt={cuidador.nome} className="w-full h-40 object-cover" />
                  <div className="px-3 py-1.5 text-xs text-gray-500 text-center bg-white border-t border-gray-100 truncate">
                    {cuidador.nome}
                  </div>
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
