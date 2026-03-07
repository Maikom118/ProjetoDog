import { useState } from 'react';
import { PawPrint, LogOut, Search, Calendar, Heart, MessageSquare, Bell, User } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';

interface DashboardProps {
  user: {
    name: string;
    email: string;
    userType: 'owner' | 'caregiver';
  };
  onLogout: () => void;
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const isOwner = user.userType === 'owner';
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation Header */}
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <PawPrint className="w-8 h-8 text-orange-500" />
              <span className="text-xl font-bold text-gray-800">PetConnect</span>
            </div>

            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={isOwner ? "Procurar cuidadores..." : "Procurar pets..."}
                  className="pl-10 w-full bg-gray-100 border-none focus-visible:ring-orange-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </Button>
              <Button variant="ghost" size="icon">
                <MessageSquare className="w-5 h-5 text-gray-600" />
              </Button>
              <div className="h-8 w-px bg-gray-200 mx-1"></div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {isOwner ? 'Tutor' : 'Cuidador'}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isOwner ? 'bg-orange-100' : 'bg-amber-100'}`}>
                  <User className={`w-6 h-6 ${isOwner ? 'text-orange-600' : 'text-amber-600'}`} />
                </div>
                <Button variant="ghost" size="icon" onClick={onLogout}>
                  <LogOut className="w-5 h-5 text-gray-400 hover:text-red-500 transition-colors" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Olá, {user.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            {isOwner 
              ? 'Temos ótimos cuidadores prontos para cuidar do seu pet.' 
              : 'Há novos tutores procurando seus serviços hoje.'}
          </p>
        </div>

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="p-6 bg-white hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Agendamentos</h3>
                <p className="text-sm text-gray-500">Próximas datas</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">0</p>
            <p className="text-xs text-gray-400 mt-2">Nenhum agendamento pendente</p>
          </Card>

          <Card className="p-6 bg-white hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <Heart className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Favoritos</h3>
                <p className="text-sm text-gray-500">Perfis salvos</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">0</p>
            <p className="text-xs text-gray-400 mt-2">Explore e salve favoritos</p>
          </Card>

          <Card className="p-6 bg-white hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <PawPrint className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">
                  {isOwner ? 'Meus Pets' : 'Meus Clientes'}
                </h3>
                <p className="text-sm text-gray-500">Total cadastrado</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">0</p>
            <p className="text-xs text-gray-400 mt-2">Nenhum registro encontrado</p>
          </Card>
        </div>

        {/* Placeholder for Dynamic Content */}
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center">
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${isOwner ? 'bg-orange-50' : 'bg-amber-50'}`}>
            <PawPrint className={`w-10 h-10 ${isOwner ? 'text-orange-500' : 'text-amber-500'}`} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {isOwner ? 'Encontre o cuidador perfeito' : 'Encontre novos pets'}
          </h2>
          <p className="text-gray-600 max-w-md mx-auto mb-8">
            Complete seu perfil e comece a usar todas as funcionalidades do PetConnect.
          </p>
          <Button className={`${isOwner ? 'bg-orange-500 hover:bg-orange-600' : 'bg-amber-500 hover:bg-amber-600'} text-white px-8 h-12 rounded-xl`}>
            {isOwner ? 'Ver cuidadores próximos' : 'Completar perfil de cuidador'}
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© 2026 PetConnect - Pets em lares reais.</p>
        </div>
      </footer>
    </div>
  );
}