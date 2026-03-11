import { useState } from 'react';
import { PawPrint, Mail, Lock, ArrowLeft, HandHeart, User, Phone, MapPin, Calendar, CreditCard, ClipboardList } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { authApi } from '../../lib/api';

type UserType = 'owner' | 'caregiver';

interface RegisterPageProps {
  userType: UserType;
  onBack: () => void;
  onSuccess: () => void;
}

export function RegisterPage({ userType, onBack, onSuccess }: RegisterPageProps) {
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const isOwner = userType === 'owner';
  const primaryColor = isOwner ? 'orange' : 'amber';

  const [formData, setFormData] = useState({
    email: '',
    senha: '',
    nome: '',
    cpf: '',
    dataNascimento: '',
    telefone: '',
    endereco: {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
    },
    // Dono fields
    contatoEmergenciaNome: '',
    contatoEmergenciaTelefone: '',
    // Cuidador fields
    bio: '',
    valorDiaria: 0,
    especialidades: [] as string[],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev: any) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === 'valorDiaria' ? Math.max(0, parseFloat(value) || 0) : value,
      }));
    }
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setFormData((prev) => ({
      ...prev,
      endereco: { ...prev.endereco, cep: rawValue },
    }));

    const digits = rawValue.replace(/\D/g, '');
    if (digits.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setFormData((prev) => ({
            ...prev,
            endereco: {
              ...prev.endereco,
              logradouro: data.logradouro || '',
              bairro: data.bairro || '',
              cidade: data.localidade || '',
              uf: data.uf || '',
              complemento: data.complemento || prev.endereco.complemento,
            },
          }));
        } else {
          toast.error('CEP não encontrado.');
        }
      } catch {
        toast.error('Erro ao buscar CEP.');
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isOwner) {
        const { bio, valorDiaria, especialidades, ...donoData } = formData;
        await authApi.registerDono(donoData);
      } else {
        const { contatoEmergenciaNome, contatoEmergenciaTelefone, ...cuidadorData } = formData;
        await authApi.registerCuidador(cuidadorData);
      }
      toast.success('Cadastro realizado com sucesso!');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao realizar cadastro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4 py-12">
      <Card className="w-full max-w-2xl p-8 bg-white shadow-xl">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {isOwner ? 'Cadastro - Tutor de Pet' : 'Cadastro - Cuidador'}
          </h2>
          <p className="text-gray-600">
            Preencha seus dados para começar
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Informações Pessoais</h3>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input id="nome" name="nome" value={formData.nome} onChange={handleInputChange} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input id="senha" name="senha" type="password" value={formData.senha} onChange={handleInputChange} className="pl-10" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input id="cpf" name="cpf" value={formData.cpf} onChange={handleInputChange} placeholder="000.000.000-00" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataNascimento">Nascimento</Label>
                  <Input id="dataNascimento" name="dataNascimento" type="date" value={formData.dataNascimento} onChange={handleInputChange} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input id="telefone" name="telefone" value={formData.telefone} onChange={handleInputChange} className="pl-10" placeholder="(00) 00000-0000" required />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Endereço</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="endereco.cep">CEP</Label>
                  <Input id="endereco.cep" name="endereco.cep" value={formData.endereco.cep} onChange={handleCepChange} placeholder="00000-000" required />
                  {cepLoading && <p className="text-xs text-orange-500">Buscando endereço...</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco.uf">UF</Label>
                  <Input id="endereco.uf" name="endereco.uf" value={formData.endereco.uf} onChange={handleInputChange} maxLength={2} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endereco.logradouro">Logradouro</Label>
                <Input id="endereco.logradouro" name="endereco.logradouro" value={formData.endereco.logradouro} onChange={handleInputChange} required />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="endereco.numero">Nº</Label>
                  <Input id="endereco.numero" name="endereco.numero" value={formData.endereco.numero} onChange={handleInputChange} required />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="endereco.bairro">Bairro</Label>
                  <Input id="endereco.bairro" name="endereco.bairro" value={formData.endereco.bairro} onChange={handleInputChange} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endereco.cidade">Cidade</Label>
                <Input id="endereco.cidade" name="endereco.cidade" value={formData.endereco.cidade} onChange={handleInputChange} required />
              </div>
            </div>
          </div>

          {/* Dados Específicos */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-semibold text-lg">
              {isOwner ? 'Contato de Emergência' : 'Informações Profissionais'}
            </h3>
            {isOwner ? (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contatoEmergenciaNome">Nome do Contato</Label>
                  <Input id="contatoEmergenciaNome" name="contatoEmergenciaNome" value={formData.contatoEmergenciaNome} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contatoEmergenciaTelefone">Telefone do Contato</Label>
                  <Input id="contatoEmergenciaTelefone" name="contatoEmergenciaTelefone" value={formData.contatoEmergenciaTelefone} onChange={handleInputChange} required />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valorDiaria">Valor da Diária (R$)</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <Input id="valorDiaria" name="valorDiaria" type="number" step="0.01" min="0" value={formData.valorDiaria} onChange={handleInputChange} className="pl-10" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="especialidades">Especialidades (separadas por vírgula)</Label>
                    <div className="relative">
                      <ClipboardList className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <Input
                        id="especialidades"
                        name="especialidades"
                        placeholder="Cachorros, Gatos, Idosos..."
                        onChange={(e) => setFormData(prev => ({ ...prev, especialidades: e.target.value.split(',').map(s => s.trim()) }))}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio / Descrição</Label>
                  <Textarea id="bio" name="bio" value={formData.bio} onChange={handleInputChange} placeholder="Conte um pouco sobre sua experiência com pets..." className="min-h-[100px]" required />
                </div>
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full text-white h-12 text-lg"
            style={{ backgroundColor: isOwner ? '#f97316' : '#d97706' }}
            disabled={loading}
          >
            {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
          </Button>
        </form>
      </Card>
    </div>
  );
}