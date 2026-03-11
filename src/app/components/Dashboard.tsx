import { useState } from 'react';
import { 
  PawPrint, 
  LayoutDashboard, 
  Calendar, 
  MessageSquare, 
  Settings, 
  LogOut, 
  User,
  Search,
  PlusCircle,
  Bell,
  Users
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { toast } from 'sonner';

interface DashboardProps {
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export function Dashboard({ onLogout, onNavigate }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogout = () => {
    localStorage.removeItem('token');
    toast.info('Sessão encerrada');
    onLogout();
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pets', label: 'Meus Pets', icon: PawPrint },
    { id: 'bookings', label: 'Reservas', icon: Calendar },
    { id: 'messages', label: 'Mensagens', icon: MessageSquare },
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-6 flex items-center gap-2 border-b">
          <PawPrint className="w-8 h-8 text-orange-500" />
          <span className="text-xl font-bold text-gray-800">PetConnect</span>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === item.id
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-8">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Buscar cuidadores, serviços..." 
              className="pl-10 bg-gray-50 border-none"
            />
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </Button>
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold border-2 border-orange-200">
              U
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Bem-vindo de volta!</h1>
                <p className="text-gray-500 mt-1">Aqui está o resumo do que está acontecendo hoje.</p>
              </div>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white flex gap-2">
                <PlusCircle className="w-5 h-5" />
                Novo Agendamento
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Reservas Ativas', value: '3', color: 'blue' },
                { label: 'Pets Cadastrados', value: '2', color: 'orange' },
                { label: 'Mensagens Novas', value: '12', color: 'green' },
                { label: 'Avaliações', value: '4.9', color: 'yellow' },
              ].map((stat, i) => (
                <Card key={i} className="p-6 border-none shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</p>
                </Card>
              ))}
            </div>

            {/* Encontrar Cuidadores - Card Destacado */}
            <div
              onClick={() => onNavigate('caregivers')}
              className="block cursor-pointer"
            >
              <Card className="p-8 border-none shadow-md hover:shadow-xl transition-all bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 text-white transform hover:scale-[1.02] duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-2">Encontrar Cuidadores</h3>
                      <p className="text-orange-50 text-sm max-w-lg">
                        Navegue por nossa lista de cuidadores de confiança e encontre o perfeito para seu pet
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-2 px-6 py-3 bg-white text-orange-600 rounded-lg font-bold shadow-lg">
                    Ver Cuidadores
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Card>
            </div>

            {/* Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Activity */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xl font-bold text-gray-800">Reservas Recentes</h3>
                <Card className="divide-y border-none shadow-sm">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                          <PawPrint className="w-6 h-6 text-orange-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">Max (Golden Retriever)</p>
                          <p className="text-sm text-gray-500">Cuidadora: Ana Silva • 15 Out - 18 Out</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Confirmado</span>
                    </div>
                  ))}
                </Card>
              </div>

              {/* Tips / Suggestions */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800">Dicas para você</h3>
                <Card className="p-6 bg-gradient-to-br from-orange-500 to-amber-500 text-white border-none">
                  <h4 className="font-bold text-lg mb-2">Complete seu perfil!</h4>
                  <p className="text-orange-50 text-sm mb-4">
                    Perfis completos têm 3x mais chances de encontrar cuidadores ideais.
                  </p>
                  <Button variant="secondary" className="w-full text-orange-600 font-bold">
                    Editar Perfil
                  </Button>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}