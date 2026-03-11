import { useState, useEffect } from 'react';
import { cuidadoresApi, Cuidador } from '../../lib/api';
import { MapPin, DollarSign, Loader2, Phone, Mail, Award, X, MessageCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

interface CaregiversListProps {
  onBack?: () => void;
}

export function CaregiversList({ onBack }: CaregiversListProps) {
  const [cuidadores, setCuidadores] = useState<Cuidador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCuidador, setSelectedCuidador] = useState<Cuidador | null>(null);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-gray-600">Carregando cuidadores...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadCuidadores}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar ao Dashboard
            </button>
          )}
          <h1 className="text-3xl text-gray-900 mb-2">
            Cuidadores Disponíveis
          </h1>
          <p className="text-gray-600">
            Encontre o cuidador perfeito para seu pet
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Total: {cuidadores.length} cuidador(es) encontrado(s)
          </p>
        </div>

        {/* Lista de Cuidadores */}
        {cuidadores.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow-sm text-center">
            <p className="text-gray-500">Nenhum cuidador encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cuidadores.map((cuidador) => (
              <div
                key={cuidador.id}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all p-6 flex flex-col"
              >
                {/* Avatar e Nome */}
                <div className="flex flex-col items-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-3xl mb-3 shadow-md">
                    {cuidador.nome?.charAt(0).toUpperCase() || 'C'}
                  </div>
                  <h3 className="text-lg text-gray-900 text-center">
                    {cuidador.nome}
                  </h3>
                </div>

                {/* Cidade / UF */}
                <div className="flex items-center justify-center gap-2 mb-3 text-gray-700">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  <span className="text-base">
                    {cuidador.endereco?.cidade
                      ? `${cuidador.endereco.cidade}, ${cuidador.endereco.uf}`
                      : cuidador.endereco?.uf || 'Não informado'}
                  </span>
                </div>

                {/* Valor da Diária */}
                <div className="flex items-center justify-center gap-2 mb-6 text-orange-600">
                  <DollarSign className="w-5 h-5" />
                  <span className="text-xl">
                    {cuidador.valorDiaria != null
                      ? `R$ ${cuidador.valorDiaria.toFixed(2)}/dia`
                      : 'Sob consulta'}
                  </span>
                </div>

                {/* Especialidades */}
                {cuidador.especialidades && cuidador.especialidades.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center mb-4">
                    {cuidador.especialidades.slice(0, 3).map((esp, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-orange-50 text-orange-600 rounded-full text-xs"
                      >
                        {esp}
                      </span>
                    ))}
                  </div>
                )}

                {/* Botão Ver Perfil */}
                <button
                  onClick={() => setSelectedCuidador(cuidador)}
                  className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-center mt-auto cursor-pointer"
                >
                  Ver Perfil
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal do Perfil do Cuidador */}
      <Dialog
        open={!!selectedCuidador}
        onOpenChange={(open) => {
          if (!open) setSelectedCuidador(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {selectedCuidador && (
            <>
              {/* Header com gradiente */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-8 rounded-t-lg">
                <div className="flex flex-col sm:flex-row items-center gap-5 text-white">
                  <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-4xl border-4 border-white/30 shadow-xl flex-shrink-0">
                    {selectedCuidador.nome?.charAt(0).toUpperCase() || 'C'}
                  </div>
                  <div className="text-center sm:text-left">
                    <DialogHeader>
                      <DialogTitle className="text-3xl text-white">
                        {selectedCuidador.nome}
                      </DialogTitle>
                      <DialogDescription className="text-orange-100 mt-1">
                        Cuidador de Pets
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-2 inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full backdrop-blur-sm">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-lg">
                        R$ {selectedCuidador.valorDiaria.toFixed(2)}/dia
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="px-6 py-6 space-y-6">
                {/* Bio */}
                {selectedCuidador.bio && (
                  <div>
                    <h3 className="flex items-center gap-2 text-gray-900 mb-2">
                      <Award className="w-5 h-5 text-orange-500" />
                      Sobre o Cuidador
                    </h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                      {selectedCuidador.bio}
                    </p>
                  </div>
                )}

                {/* Informações de Contato */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Telefone */}
                  {selectedCuidador.telefone && (
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Telefone</p>
                        <p className="text-gray-800">{selectedCuidador.telefone}</p>
                      </div>
                    </div>
                  )}

                  {/* Email */}
                  {selectedCuidador.email && (
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="text-gray-800 break-all text-sm">{selectedCuidador.email}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Localização Completa */}
                {selectedCuidador.endereco && (
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Localização</p>
                      <p className="text-gray-800">
                        {selectedCuidador.endereco.logradouro}, {selectedCuidador.endereco.numero}
                        {selectedCuidador.endereco.complemento && ` - ${selectedCuidador.endereco.complemento}`}
                      </p>
                      <p className="text-gray-600 text-sm">
                        {selectedCuidador.endereco.bairro} - {selectedCuidador.endereco.cidade}, {selectedCuidador.endereco.uf}
                      </p>
                      <p className="text-gray-500 text-sm">
                        CEP: {selectedCuidador.endereco.cep}
                      </p>
                    </div>
                  </div>
                )}

                {/* Especialidades */}
                {selectedCuidador.especialidades && selectedCuidador.especialidades.length > 0 && (
                  <div>
                    <h3 className="text-gray-900 mb-3">Especialidades</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCuidador.especialidades.map((esp, idx) => (
                        <span
                          key={idx}
                          className="px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm"
                        >
                          {esp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botões de Ação */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  {selectedCuidador.telefone && (
                    <a
                      href={`https://wa.me/55${selectedCuidador.telefone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-lg shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Chamar no WhatsApp
                    </a>
                  )}
                  <button className="flex-1 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-lg shadow-md hover:shadow-lg cursor-pointer">
                    Solicitar Orçamento
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}