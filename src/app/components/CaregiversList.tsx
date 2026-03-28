import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Loader2,
  MapPin,
  Navigation,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { cuidadoresApi, Cuidador } from '../../lib/api';
import { CaregiverFilters } from '../App';
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from './ui/carousel';

interface CaregiversListProps {
  onBack?: () => void;
  onViewProfile?: (cuidador: Cuidador) => void;
  initialFilters?: CaregiverFilters;
}

const SORT_OPTIONS = [
  { value: 'name', label: 'Nome (A-Z)' },
  { value: 'price_asc', label: 'Menor preco' },
  { value: 'price_desc', label: 'Maior preco' },
];

export function CaregiversList({
  onBack,
  onViewProfile,
  initialFilters,
}: CaregiversListProps) {
  const [cuidadores, setCuidadores] = useState<Cuidador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialFilters?.name ?? '');
  const [filterCity, setFilterCity] = useState(initialFilters?.city ?? '');
  const [filterMaxPrice, setFilterMaxPrice] = useState(initialFilters?.maxPrice ?? '');
  const [filterSpecialty, setFilterSpecialty] = useState(initialFilters?.specialty ?? '');
  const [sortBy, setSortBy] = useState('name');
  const bestMatchId = initialFilters?.bestMatchId;
  const petName = initialFilters?.petName;

  const distanciaMap = new Map<string, number>(
    (initialFilters?.preloadedCuidadores ?? [])
      .filter((c) => c.id != null && c.distanciaKm != null)
      .map((c) => [c.id as string, c.distanciaKm as number]),
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
  const hasActiveFilters = Boolean(searchTerm || filterCity || filterMaxPrice || filterSpecialty);

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
      if (bestMatchId) {
        if (a.id === bestMatchId) return -1;
        if (b.id === bestMatchId) return 1;
      }

      if (sortBy === 'price_asc') return (a.valorDiaria ?? 0) - (b.valorDiaria ?? 0);
      if (sortBy === 'price_desc') return (b.valorDiaria ?? 0) - (a.valorDiaria ?? 0);
      return (a.nome ?? '').localeCompare(b.nome ?? '');
    });

  useEffect(() => {
    if (!carouselApi) return;

    const syncButtons = () => {
      setCanScrollPrev(carouselApi.canScrollPrev());
      setCanScrollNext(carouselApi.canScrollNext());
    };

    syncButtons();
    carouselApi.on('select', syncButtons);
    carouselApi.on('reInit', syncButtons);

    return () => {
      carouselApi.off('select', syncButtons);
      carouselApi.off('reInit', syncButtons);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (!carouselApi) return;
    carouselApi.scrollTo(0);
  }, [carouselApi, filteredCuidadores.length, searchTerm, filterCity, filterMaxPrice, filterSpecialty, sortBy]);

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
          <button
            onClick={loadCuidadores}
            className="px-5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-amber-500">
        <div className="absolute -top-10 -right-10 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10 py-8">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1.5 text-sm text-white/80 transition-colors hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-white">Cuidadores</h1>
                <p className="text-sm text-orange-100">Encontre o cuidador ideal para seu pet</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-3xl font-bold text-white">{filteredCuidadores.length}</p>
              <p className="text-sm text-orange-100">{hasActiveFilters ? 'encontrado(s)' : 'disponiveis'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-10 border-b bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-[1400px] space-y-3 px-4 py-4 sm:px-6 lg:px-10">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cuidador por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm transition-colors focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-gray-400" />

            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors focus:outline-none ${
                filterCity ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 bg-gray-50 text-gray-600'
              }`}
            >
              <option value="">Todas as cidades</option>
              {uniqueCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <select
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors focus:outline-none ${
                filterSpecialty ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 bg-gray-50 text-gray-600'
              }`}
            >
              <option value="">Especialidade</option>
              {uniqueSpecialties.map((esp) => (
                <option key={esp} value={esp}>
                  {esp}
                </option>
              ))}
            </select>

            <div
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                filterMaxPrice ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <span className="text-xs text-gray-400">R$</span>
              <input
                type="number"
                min="0"
                placeholder="Preco max."
                value={filterMaxPrice}
                onChange={(e) => setFilterMaxPrice(e.target.value)}
                className="w-24 bg-transparent text-sm text-gray-600 placeholder-gray-400 focus:outline-none"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600 focus:outline-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-100"
              >
                <X className="h-3.5 w-3.5" />
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {!!bestMatchId && (
        <div className="mx-auto max-w-[1400px] px-4 pt-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
            <span className="text-xl">🏆</span>
            <span>
              Resultados personalizados para <strong>{petName ?? 'seu pet'}</strong>. O primeiro perfil foi destacado como
              <strong> Best Match</strong> e a distancia aparece no cartao.
            </span>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
        {filteredCuidadores.length === 0 ? (
          <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
            <p className="mb-4 text-5xl">🐾</p>
            <p className="font-medium text-gray-500">Nenhum cuidador encontrado</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-3 text-sm text-orange-500 hover:underline">
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-[36px] px-1 py-2 sm:px-2 lg:px-4">
            <div className="pointer-events-none absolute inset-x-10 top-10 h-28 rounded-full bg-gradient-to-r from-orange-100 via-white to-amber-100 blur-3xl opacity-90" />
            <div className="pointer-events-none absolute -left-10 top-20 h-36 w-36 rounded-full bg-orange-200/30 blur-3xl" />
            <div className="pointer-events-none absolute -right-12 bottom-8 h-40 w-40 rounded-full bg-amber-200/35 blur-3xl" />

            <div className="relative mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-500/80">
                  Selecao em destaque
                </p>
                <h2 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
                  Encontre um cuidador com o estilo certo para a rotina do seu pet
                </h2>
                <p className="mt-2 text-sm text-gray-500 sm:text-base">
                  A area de resultados agora acompanha melhor a largura da tela, com mais respiro, elementos fluidos e navegacao lateral integrada ao carrossel.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-orange-100 backdrop-blur">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
                  {filteredCuidadores.length} perfis ativos
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-orange-100 backdrop-blur">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  {uniqueCities.length || 1} cidades atendidas
                </div>
                {bestMatchId && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm">
                    <span>🏆</span>
                    Melhor match destacado
                  </div>
                )}
              </div>
            </div>

            <div className="relative sm:px-16 lg:px-20">
              <button
                type="button"
                onClick={() => carouselApi?.scrollPrev()}
                disabled={!canScrollPrev}
                className="absolute left-1 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-orange-200 bg-white/95 text-orange-500 shadow-lg backdrop-blur transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40 md:inline-flex lg:left-3"
                aria-label="Ver cuidadores anteriores"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <Carousel
                setApi={setCarouselApi}
                opts={{
                  align: 'start',
                  loop: filteredCuidadores.length > 1,
                }}
                className="w-full"
              >
                <CarouselContent className="touch-pan-y select-none cursor-grab pt-5 pb-6 active:cursor-grabbing">
                  {filteredCuidadores.map((cuidador, index) => {
                    const isBestMatch = Boolean(bestMatchId && cuidador.id === bestMatchId);
                    const distancia = cuidador.id ? distanciaMap.get(cuidador.id) : undefined;

                    return (
                      <CarouselItem
                        key={cuidador.id ?? `${cuidador.nome}-${index}`}
                        className="basis-[88%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 24 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
                          className={`relative h-full ${isBestMatch ? 'rounded-[20px] bg-gradient-to-br from-orange-400 via-amber-400 to-orange-500 p-[3px]' : ''}`}
                        >
                          {isBestMatch && (
                            <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-1.5 text-xs font-bold text-white shadow-lg">
                              🏆 MELHOR MATCH
                            </div>
                          )}

                          <div
                            className={`group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:shadow-xl ${
                              isBestMatch ? 'rounded-[18px] shadow-xl shadow-orange-200' : ''
                            }`}
                          >
                            <div
                              className={`relative h-20 flex-shrink-0 bg-gradient-to-br ${
                                isBestMatch ? 'from-orange-500 to-amber-400' : 'from-orange-400 to-amber-500'
                              }`}
                            >
                              <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2">
                                <div className="h-16 w-16 rounded-full bg-white p-1 shadow-md">
                                  <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-2xl font-bold text-white">
                                    {cuidador.nome?.charAt(0).toUpperCase() || 'C'}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-1 flex-col px-5 pb-5 pt-10">
                              <div className="mb-4 text-center">
                                <h3 className="text-base font-bold leading-tight text-gray-900">{cuidador.nome}</h3>

                                <div className="mt-1 flex items-center justify-center gap-0.5">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  ))}
                                  <span className="ml-1 text-xs text-gray-400">5.0</span>
                                </div>

                                <div className="mt-2 flex items-center justify-center gap-1 text-sm text-gray-500">
                                  <MapPin className="h-3.5 w-3.5 text-orange-400" />
                                  <span>
                                    {cuidador.endereco?.cidade
                                      ? `${cuidador.endereco.cidade}, ${cuidador.endereco.uf}`
                                      : 'Nao informado'}
                                  </span>
                                </div>

                                {distancia != null && (
                                  <div
                                    className={`mt-1.5 inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                      isBestMatch ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-600'
                                    }`}
                                  >
                                    <Navigation className="h-3 w-3" />
                                    {distancia < 1
                                      ? `${Math.round(distancia * 1000)} m de distancia`
                                      : `${distancia.toFixed(1)} km de distancia`}
                                  </div>
                                )}
                              </div>

                              {cuidador.especialidades && cuidador.especialidades.length > 0 && (
                                <div className="mb-4 flex flex-wrap justify-center gap-1">
                                  {cuidador.especialidades.slice(0, 3).map((esp, idx) => (
                                    <span
                                      key={`${esp}-${idx}`}
                                      className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600"
                                    >
                                      {esp}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="mt-auto space-y-3">
                                <div className="flex items-center justify-center gap-1">
                                  <DollarSign className="h-4 w-4 text-orange-500" />
                                  <span className="text-lg font-bold text-orange-500">
                                    {cuidador.valorDiaria != null ? `R$ ${cuidador.valorDiaria.toFixed(2)}` : 'Sob consulta'}
                                  </span>
                                  {cuidador.valorDiaria != null && <span className="text-xs text-gray-400">/dia</span>}
                                </div>

                                <button
                                  onClick={() => onViewProfile?.(cuidador)}
                                  className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600 active:scale-95"
                                >
                                  Ver perfil
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
              </Carousel>

              <button
                type="button"
                onClick={() => carouselApi?.scrollNext()}
                disabled={!canScrollNext}
                className="absolute right-1 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-orange-200 bg-white/95 text-orange-500 shadow-lg backdrop-blur transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40 md:inline-flex lg:right-3"
                aria-label="Ver proximos cuidadores"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
