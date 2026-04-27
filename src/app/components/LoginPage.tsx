import { useState } from 'react';
import { PawPrint, Mail, KeyRound, ArrowLeft, HandHeart, Eye, EyeOff } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { authApi } from '../../lib/api';
import { RegisterPage } from './RegisterPage';
import { PetConnectLogo } from './PetConnectLogo';

type ViewMode = 'selection' | 'login' | 'register';
type UserType = 'owner' | 'caregiver' | null;

interface LoginPageProps {
  onLogin: () => void;
}


export function LoginPage({ onLogin }: LoginPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('selection');
  const [userType, setUserType] = useState<UserType>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const decodeTokenRole = (token: string): string | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const role: string =
        payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
        payload.role ??
        payload.Role ??
        '';
      return role.toLowerCase();
    } catch {
      return null;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authApi.login({ email, password });

      const tokenRole = decodeTokenRole(response.token);
      const isCaregiverRole = tokenRole === 'cuidador' || tokenRole === 'caregiver';
      const isOwnerRole = tokenRole === 'dono' || tokenRole === 'owner' || tokenRole === 'tutor';

      if ((userType === 'owner' && isCaregiverRole) || (userType === 'caregiver' && isOwnerRole)) {
        toast.error('Credenciais inválidas.');
        return;
      }

      localStorage.setItem('token', response.token);
      toast.success('Login realizado com sucesso!');
      onLogin();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  const resetSelection = () => {
    setViewMode('selection');
    setUserType(null);
    setEmail('');
    setPassword('');
    setShowPassword(false);
  };

  const handleUserTypeSelect = (type: UserType) => {
    setUserType(type);
    setViewMode('login');
  };

  if (viewMode === 'selection') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6" style={{ backgroundColor: '#FFFBEB' }}>
        <div className="w-full max-w-2xl space-y-8">
          {/* Logo */}
          <div className="text-center">
            <PetConnectLogo size="lg" />
          </div>

          {/* Hero Image */}
          <div className="rounded-2xl overflow-hidden shadow-md" style={{ height: '320px' }}>
            <img
              src="/hero-home.png"
              alt="Tutor com seu pet"
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Tutor */}
            <div
              className="bg-white rounded-2xl p-7 shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
              style={{ borderColor: '#EEDFD3' }}
              onClick={() => handleUserTypeSelect('owner')}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-1" style={{ backgroundColor: '#FFEDD4' }}>
                  <PawPrint className="w-7 h-7" style={{ color: '#FF6900' }} />
                </div>
                <h2 className="text-lg font-bold" style={{ color: '#1E2939' }}>Sou Tutor de Pet</h2>
                <p className="text-sm leading-relaxed" style={{ color: '#717182' }}>
                  Encontre cuidadores confiáveis para cuidar do seu pet enquanto você viaja ou tem compromissos
                </p>
                <button
                  className="w-full py-3 rounded-full font-semibold text-white text-sm transition-opacity hover:opacity-90 mt-1"
                  style={{ backgroundColor: '#FF6900' }}
                >
                  Entrar como Tutor
                </button>
              </div>
            </div>

            {/* Cuidador */}
            <div
              className="bg-white rounded-2xl p-7 shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
              style={{ borderColor: '#EEDFD3' }}
              onClick={() => handleUserTypeSelect('caregiver')}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-1" style={{ backgroundColor: '#FFEDD4' }}>
                  <HandHeart className="w-7 h-7" style={{ color: '#FE9A00' }} />
                </div>
                <h2 className="text-lg font-bold" style={{ color: '#1E2939' }}>Sou Cuidador</h2>
                <p className="text-sm leading-relaxed" style={{ color: '#717182' }}>
                  Ofereça cuidados com amor e segurança para pets de quem confia em você
                </p>
                <button
                  className="w-full py-3 rounded-full font-semibold text-white text-sm transition-opacity hover:opacity-90 mt-1"
                  style={{ backgroundColor: '#FE9A00' }}
                >
                  Entrar como Cuidador
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'register' && userType) {
    return (
      <RegisterPage
        userType={userType}
        onBack={() => setViewMode('login')}
        onSuccess={() => setViewMode('login')}
      />
    );
  }

  // Login Form
  const isOwner = userType === 'owner';
  const brandColor = isOwner ? '#FF6900' : '#FE9A00';

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6" style={{ backgroundColor: '#FFFBEB' }}>
      {/* Logo */}
      <div className="mb-8">
        <PetConnectLogo size="md" />
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8" style={{ borderColor: '#EEDFD3', border: '1px solid #EEDFD3' }}>
        {/* Back */}
        <button
          onClick={resetSelection}
          className="flex items-center gap-1.5 text-sm font-semibold mb-6 transition-colors"
          style={{ color: '#1E2939' }}
        >
          <ArrowLeft className="w-4 h-4" />
          VOLTAR
        </button>

        {/* Icon + Title */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#FFEDD4' }}>
            {isOwner
              ? <PawPrint className="w-8 h-8" style={{ color: '#FF6900' }} />
              : <HandHeart className="w-8 h-8" style={{ color: '#FE9A00' }} />
            }
          </div>
          <h2 className="text-2xl font-bold mb-1" style={{ color: '#1E2939' }}>
            {isOwner ? 'Login: Tutor de Pet' : 'Login: Cuidador de Pet'}
          </h2>
          <p className="text-sm" style={{ color: '#717182' }}>
            {isOwner ? 'Entre para encontrar Cuidadores' : 'Entre para oferecer cuidados'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="font-semibold text-sm" style={{ color: '#1E2939' }}>
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#717182' }} />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 border-0 text-sm"
                style={{ backgroundColor: '#F3F3F5', color: '#1E2939' }}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="font-semibold text-sm" style={{ color: '#1E2939' }}>
              Senha
            </Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#717182' }} />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-10 border-0 text-sm"
                style={{ backgroundColor: '#F3F3F5', color: '#1E2939' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: '#717182' }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full font-bold text-white text-base transition-opacity hover:opacity-90 disabled:opacity-60 mt-2"
            style={{ backgroundColor: brandColor }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="text-center text-sm" style={{ color: '#1E2939' }}>
            Não tem uma conta?{' '}
            <button
              type="button"
              onClick={() => setViewMode('register')}
              className="font-semibold hover:underline"
              style={{ color: brandColor }}
            >
              Cadastra-se
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
