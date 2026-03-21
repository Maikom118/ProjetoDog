import { useState } from 'react';
import { PawPrint, Mail, Lock, ArrowLeft, HandHeart, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { authApi } from '../../lib/api';
import { RegisterPage } from './RegisterPage';

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

  // Decodifica o payload do JWT sem biblioteca externa
  const decodeTokenRole = (token: string): string | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // O backend pode usar diferentes claim names para role
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

      // Valida se a role do token bate com o tipo de conta escolhido
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
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <PawPrint className="w-12 h-12 text-orange-500" />
              <h1 className="text-4xl font-bold text-gray-800">PetConnect</h1>
            </div>
            <p className="text-gray-600 text-lg">
              Pets em lares reais com cuidadores especiais
            </p>
          </div>

          {/* Hero Image */}
          <div className="mb-10 rounded-2xl overflow-hidden shadow-lg aspect-[2/1] md:aspect-[6/2]">
            <img
              src="https://images.unsplash.com/photo-1509205477838-a534e43a849f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGRvZyUyMGNhdCUyMHRvZ2V0aGVyfGVufDF8fHx8MTc3MjEwMTYyMnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Pets felizes"
              className="w-full h-full object-cover"
            />
          </div>

          {/* User Type Selection */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Tutor de Pet */}
            <Card
              className="p-8 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-orange-300 bg-white"
              onClick={() => handleUserTypeSelect('owner')}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
                  <PawPrint className="w-10 h-10 text-orange-500" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-800">
                  Sou tutor de pet
                </h2>
                <p className="text-gray-600">
                  Encontre cuidadores confiáveis para cuidar do seu pet enquanto você viaja ou tem compromissos
                </p>
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                  Entrar como tutor
                </Button>
              </div>
            </Card>

            {/* Cuidador */}
            <Card
              className="p-8 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-amber-300 bg-white"
              onClick={() => handleUserTypeSelect('caregiver')}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
                  <HandHeart className="w-10 h-10 text-amber-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-800">
                  Sou cuidador
                </h2>
                <p className="text-gray-600">
                  Ofereça cuidados com amor e segurança para pets de quem confia em você
                </p>
                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                  Entrar como cuidador
                </Button>
              </div>
            </Card>
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
  const primaryColor = isOwner ? 'orange' : 'amber';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4">
      <Card className="w-full max-w-md p-8 bg-white shadow-xl">
        {/* Back Button */}
        <button
          onClick={resetSelection}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div
              className={`w-16 h-16 bg-${primaryColor}-100 rounded-full flex items-center justify-center`}
              style={{
                backgroundColor: isOwner ? '#fed7aa' : '#fde68a',
              }}
            >
              {isOwner ? (
                <PawPrint className="w-8 h-8" style={{ color: '#f97316' }} />
              ) : (
                <HandHeart className="w-8 h-8" style={{ color: '#d97706' }} />
              )}
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {isOwner ? 'Login - Tutor de Pet' : 'Login - Cuidador'}
          </h2>
          <p className="text-gray-600">
            {isOwner
              ? 'Entre para encontrar cuidadores'
              : 'Entre para oferecer cuidados'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-700">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-700">
              Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full text-white"
            style={{
              backgroundColor: isOwner ? '#f97316' : '#d97706',
            }}
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>

          <div className="text-center text-sm text-gray-600">
            Não tem uma conta?{' '}
            <button
              type="button"
              onClick={() => setViewMode('register')}
              className="font-semibold hover:underline"
              style={{ color: isOwner ? '#f97316' : '#d97706' }}
            >
              Cadastre-se
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
