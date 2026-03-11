import { useState } from 'react';
import { Toaster } from './components/ui/sonner';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { CaregiversList } from './components/CaregiversList';

type Page = 'login' | 'dashboard' | 'caregivers';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const token = localStorage.getItem('token');
    return token ? 'dashboard' : 'login';
  });

  const handleLogin = () => setCurrentPage('dashboard');

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentPage('login');
  };

  return (
    <>
      {currentPage === 'login' && <LoginPage onLogin={handleLogin} />}
      {currentPage === 'dashboard' && (
        <Dashboard
          onLogout={handleLogout}
          onNavigate={(page: string) => setCurrentPage(page as Page)}
        />
      )}
      {currentPage === 'caregivers' && (
        <CaregiversList onBack={() => setCurrentPage('dashboard')} />
      )}
      <Toaster position="top-right" richColors />
    </>
  );
}
