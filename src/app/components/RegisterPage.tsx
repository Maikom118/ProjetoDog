import { useState } from 'react';
import { Mail, KeyRound, ArrowLeft, User, Phone, Calendar, DollarSign, Eye, EyeOff, Home } from 'lucide-react';
import { PetConnectLogo } from './PetConnectLogo';
import { Input } from './ui/input';
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


function FieldInput({ id, name, label, type = 'text', value, onChange, placeholder, required, disabled, maxLength, icon: Icon, iconColor }: any) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-semibold" style={{ color: '#1E2939' }}>{label}</Label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: iconColor ?? '#717182' }} />}
        <Input
          id={id}
          name={name ?? id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          className={`${Icon ? 'pl-9' : ''} border-0 text-sm`}
          style={{ backgroundColor: disabled ? '#E8E8EC' : '#F3F3F5', color: '#1E2939' }}
        />
      </div>
    </div>
  );
}

export function RegisterPage({ userType, onBack, onSuccess }: RegisterPageProps) {
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const isOwner = userType === 'owner';
  const brandColor = isOwner ? '#FF6900' : '#FE9A00';
  const [enderecoTravado, setEnderecoTravado] = useState(false);

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
    contatoEmergenciaNome: '',
    contatoEmergenciaTelefone: '',
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
        [parent]: { ...prev[parent], [child]: value },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === 'valorDiaria' ? Math.max(0, parseFloat(value) || 0) : value,
      }));
    }
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setFormData((prev) => ({ ...prev, endereco: { ...prev.endereco, cep: rawValue } }));
    const digits = rawValue.replace(/\D/g, '');
    if (digits.length < 8) setEnderecoTravado(false);
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
          setEnderecoTravado(true);
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
    <div className="min-h-screen w-full flex flex-col items-center justify-start p-6 py-10" style={{ backgroundColor: '#FFFBEB' }}>
      {/* Logo */}
      <div className="mb-8">
        <PetConnectLogo />
      </div>

      {/* Card */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-md p-8" style={{ border: '1px solid #EEDFD3' }}>
        {/* Back */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold mb-6 transition-colors"
          style={{ color: '#1E2939' }}
        >
          <ArrowLeft className="w-4 h-4" />
          VOLTAR
        </button>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-1" style={{ color: '#1E2939' }}>
            {isOwner ? 'Cadastro: Tutor de Pet' : 'Cadastro: Cuidador de Pet'}
          </h2>
          <p className="text-sm" style={{ color: '#717182' }}>
            {isOwner ? 'Preencha seus dados para começar a encontrar Cuidadores' : 'Preencha seus dados para começar a cuidar de Pets'}
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-8">
          {/* Two-column: Informações Pessoais + Endereço */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Informações Pessoais */}
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-base mb-2" style={{ color: '#1E2939' }}>Informações Pessoais</h3>
                <hr style={{ borderColor: '#EEDFD3' }} />
              </div>

              <FieldInput id="nome" label="Nome Completo" value={formData.nome} onChange={handleInputChange} required icon={User} />
              <FieldInput id="email" label="Email" type="email" value={formData.email} onChange={handleInputChange} placeholder="seu@email.com.br" required icon={Mail} />

              {/* Senha */}
              <div className="space-y-1.5">
                <Label htmlFor="senha" className="text-sm font-semibold" style={{ color: '#1E2939' }}>Senha</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#717182' }} />
                  <Input
                    id="senha" name="senha"
                    type={showSenha ? 'text' : 'password'}
                    value={formData.senha} onChange={handleSenhaChange}
                    placeholder="••••••••" required
                    className="pl-9 pr-10 border-0 text-sm"
                    style={{ backgroundColor: '#F3F3F5', color: '#1E2939' }}
                  />
                  <button type="button" onClick={() => setShowSenha(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#717182' }}>
                    {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar Senha */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmarSenha" className="text-sm font-semibold" style={{ color: '#1E2939' }}>Repetir Senha</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#717182' }} />
                  <Input
                    id="confirmarSenha" name="confirmarSenha"
                    type={showConfirmarSenha ? 'text' : 'password'}
                    value={formData.confirmarSenha} onChange={handleConfirmarSenhaChange}
                    placeholder="••••••••" required
                    className="pl-9 pr-10 border-0 text-sm"
                    style={{ backgroundColor: '#F3F3F5', color: '#1E2939' }}
                  />
                  <button type="button" onClick={() => setShowConfirmarSenha(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#717182' }}>
                    {showConfirmarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {senhaError && <p className="text-xs text-red-500">{senhaError}</p>}
              </div>

              {/* CPF + Nascimento */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cpf" className="text-sm font-semibold" style={{ color: '#1E2939' }}>CPF</Label>
                  <Input
                    id="cpf" name="cpf"
                    value={formData.cpf} onChange={handleCpfChange}
                    placeholder="000.000.000-00" maxLength={14} required
                    className="border-0 text-sm"
                    style={{ backgroundColor: '#F3F3F5', color: '#1E2939' }}
                  />
                  {cpfError && <p className="text-xs text-red-500">{cpfError}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dataNascimento" className="text-sm font-semibold" style={{ color: '#1E2939' }}>Nascimento</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: brandColor }} />
                    <Input
                      id="dataNascimento" name="dataNascimento"
                      type="date" value={formData.dataNascimento} onChange={handleInputChange} required
                      className="pl-9 border-0 text-sm"
                      style={{ backgroundColor: '#F3F3F5', color: '#1E2939' }}
                    />
                  </div>
                </div>
              </div>

              <FieldInput id="telefone" label="Telefone" value={formData.telefone} onChange={handleInputChange} placeholder="(00) 00000-0000" required icon={Phone} />
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-base mb-2" style={{ color: '#1E2939' }}>Endereço</h3>
                <hr style={{ borderColor: '#EEDFD3' }} />
              </div>

              {/* CEP + Estado */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="endereco.cep" className="text-sm font-semibold" style={{ color: '#1E2939' }}>CEP</Label>
                  <Input
                    id="endereco.cep" name="endereco.cep"
                    value={formData.endereco.cep} onChange={handleCepChange}
                    placeholder="00000-000" required maxLength={8}
                    className="border-0 text-sm"
                    style={{ backgroundColor: '#F3F3F5', color: '#1E2939' }}
                  />
                  {cepLoading && <p className="text-xs" style={{ color: brandColor }}>Buscando...</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endereco.uf" className="text-sm font-semibold" style={{ color: '#1E2939' }}>Estado</Label>
                  <Input
                    id="endereco.uf" name="endereco.uf"
                    value={formData.endereco.uf} onChange={handleInputChange}
                    disabled={enderecoTravado} maxLength={2} required
                    className="border-0 text-sm"
                    style={{ backgroundColor: enderecoTravado ? '#E8E8EC' : '#F3F3F5', color: '#1E2939' }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endereco.logradouro" className="text-sm font-semibold" style={{ color: '#1E2939' }}>Logradouro</Label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#717182' }} />
                  <Input
                    id="endereco.logradouro" name="endereco.logradouro"
                    value={formData.endereco.logradouro} onChange={handleInputChange}
                    required disabled={enderecoTravado}
                    className="pl-9 border-0 text-sm"
                    style={{ backgroundColor: enderecoTravado ? '#E8E8EC' : '#F3F3F5', color: '#1E2939' }}
                  />
                </div>
              </div>

              {/* Número + Bairro */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="endereco.numero" className="text-sm font-semibold" style={{ color: '#1E2939' }}>Número</Label>
                  <Input
                    id="endereco.numero" name="endereco.numero"
                    value={formData.endereco.numero} onChange={handleInputChange} required
                    className="border-0 text-sm"
                    style={{ backgroundColor: '#F3F3F5', color: '#1E2939' }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endereco.bairro" className="text-sm font-semibold" style={{ color: '#1E2939' }}>Bairro</Label>
                  <Input
                    id="endereco.bairro" name="endereco.bairro"
                    value={formData.endereco.bairro} onChange={handleInputChange}
                    required disabled={enderecoTravado}
                    className="border-0 text-sm"
                    style={{ backgroundColor: enderecoTravado ? '#E8E8EC' : '#F3F3F5', color: '#1E2939' }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endereco.cidade" className="text-sm font-semibold" style={{ color: '#1E2939' }}>Cidade</Label>
                <Input
                  id="endereco.cidade" name="endereco.cidade"
                  value={formData.endereco.cidade} onChange={handleInputChange}
                  required disabled={enderecoTravado}
                  className="border-0 text-sm"
                  style={{ backgroundColor: enderecoTravado ? '#E8E8EC' : '#F3F3F5', color: '#1E2939' }}
                />
              </div>
            </div>
          </div>

          {/* Third section */}
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-base mb-2" style={{ color: '#1E2939' }}>
                {isOwner ? 'Contato de Emergência' : 'Informações de Cuidador'}
              </h3>
              <hr style={{ borderColor: '#EEDFD3' }} />
            </div>

            {isOwner ? (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="contatoEmergenciaNome" className="text-sm font-semibold" style={{ color: '#1E2939' }}>Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#717182' }} />
                    <Input
                      id="contatoEmergenciaNome" name="contatoEmergenciaNome"
                      value={formData.contatoEmergenciaNome} onChange={handleInputChange} required
                      className="pl-9 border-0 text-sm"
                      style={{ backgroundColor: '#F3F3F5', color: '#1E2939' }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contatoEmergenciaTelefone" className="text-sm font-semibold" style={{ color: '#1E2939' }}>Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#717182' }} />
                    <Input
                      id="contatoEmergenciaTelefone" name="contatoEmergenciaTelefone"
                      value={formData.contatoEmergenciaTelefone} onChange={handleInputChange} required
                      placeholder="(00) 00000-0000"
                      className="pl-9 border-0 text-sm"
                      style={{ backgroundColor: '#F3F3F5', color: '#1E2939' }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="valorDiaria" className="text-sm font-semibold" style={{ color: '#1E2939' }}>Valor da Diária (R$)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#717182' }} />
                      <Input
                        id="valorDiaria" name="valorDiaria"
                        type="number" step="0.01" min="0"
                        value={formData.valorDiaria} onChange={handleInputChange} required
                        className="pl-9 border-0 text-sm"
                        style={{ backgroundColor: '#F3F3F5', color: '#1E2939' }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold" style={{ color: '#1E2939' }}>Especialidade</Label>
                    <div className="flex gap-3 pt-1">
                      {[{ value: 'Cachorro', label: '🐶 Cães' }, { value: 'Gato', label: '🐱 Gatos' }].map(({ value, label }) => {
                        const checked = formData.especialidades.includes(value);
                        return (
                          <label
                            key={value}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all select-none text-sm font-medium"
                            style={{
                              borderColor: checked ? brandColor : '#EEDFD3',
                              backgroundColor: checked ? '#FFEDD4' : '#FFFFFF',
                              color: checked ? '#1E2939' : '#717182',
                            }}
                          >
                            <input
                              type="checkbox"
                              className="w-4 h-4"
                              style={{ accentColor: brandColor }}
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
                            {label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bio" className="text-sm font-semibold" style={{ color: '#1E2939' }}>Descrição e Biografia</Label>
                  <Textarea
                    id="bio" name="bio"
                    value={formData.bio} onChange={handleInputChange}
                    placeholder="Conte um pouco sobre você e sua experiência com pets..."
                    required
                    className="min-h-[120px] border-0 text-sm resize-none"
                    style={{ backgroundColor: '#F3F3F5', color: '#1E2939' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 rounded-full font-bold text-white text-lg transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: brandColor }}
          >
            {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
          </button>
        </form>
      </div>
    </div>
  );
}
