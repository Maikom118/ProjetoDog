import { useState } from 'react';
import { PawPrint, Mail, Lock, ArrowLeft, HandHeart, User, Phone, MapPin, Calendar, CreditCard, ClipboardList, Eye, EyeOff } from 'lucide-react';
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
    confirmarSenha: '',
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

  const [cpfError, setCpfError] = useState('');
  const [senhaError, setSenhaError] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);

  const formatCpf = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const validateCpf = (cpf: string): boolean => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
    let remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    if (remainder !== parseInt(digits[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    return remainder === parseInt(digits[10]);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCpf(e.target.value);
    setFormData((prev) => ({ ...prev, cpf: formatted }));
    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 11) {
      setCpfError(validateCpf(formatted) ? '' : 'CPF inválido');
    } else {
      setCpfError('');
    }
  };

  const handleConfirmarSenhaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, confirmarSenha: value }));
    setSenhaError(value && value !== formData.senha ? 'As senhas não coincidem' : '');
  };

  const handleSenhaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, senha: value }));
    if (formData.confirmarSenha && value !== formData.confirmarSenha) {
      setSenhaError('As senhas não coincidem');
    } else {
      setSenhaError('');
    }
  };

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

    if (!validateCpf(formData.cpf)) {
      toast.error('CPF inválido. Verifique e tente novamente.');
      return;
    }

    if (formData.senha !== formData.confirmarSenha) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      if (isOwner) {
        const { bio, valorDiaria, especialidades, confirmarSenha, ...donoData } = formData;
        await authApi.registerDono(donoData);
      } else {
        const { contatoEmergenciaNome, contatoEmergenciaTelefone, confirmarSenha, ...cuidadorData } = formData;
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
                  <Input id="senha" name="senha" type={showSenha ? 'text' : 'password'} value={formData.senha} onChange={handleSenhaChange} className="pl-10 pr-10" required />
                  <button
                    type="button"
                    onClick={() => setShowSenha((prev) => !prev)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input id="confirmarSenha" name="confirmarSenha" type={showConfirmarSenha ? 'text' : 'password'} value={formData.confirmarSenha} onChange={handleConfirmarSenhaChange} className="pl-10 pr-10" required />
                  <button
                    type="button"
                    onClick={() => setShowConfirmarSenha((prev) => !prev)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showConfirmarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showConfirmarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {senhaError && <p className="text-xs text-red-500">{senhaError}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input id="cpf" name="cpf" value={formData.cpf} onChange={handleCpfChange} placeholder="000.000.000-00" maxLength={14} required />
                  {cpfError && <p className="text-xs text-red-500">{cpfError}</p>}
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
                    <Label>Especialidades</Label>
                    <div className="flex flex-col gap-2 pt-1">
                      {[
                        { value: 'Cachorro', label: '🐶 Cachorro' },
                        { value: 'Gato',     label: '🐱 Gato'     },
                      ].map(({ value, label }) => {
                        const checked = formData.especialidades.includes(value);
                        return (
                          <label
                            key={value}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
                              checked
                                ? 'border-amber-400 bg-amber-50 text-amber-800'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-amber-200 hover:bg-amber-50/40'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="accent-amber-500 w-4 h-4"
                              checked={checked}
                              onChange={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  especialidades: checked
                                    ? prev.especialidades.filter((s) => s !== value)
                                    : [...prev.especialidades, value],
                                }))
                              }
                            />
                            <span className="font-medium">{label}</span>
                          </label>
                        );
                      })}
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
