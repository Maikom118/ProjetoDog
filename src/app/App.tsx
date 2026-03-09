import { useState, useEffect } from 'react';
import { Toaster } from './components/ui/sonner';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return (
    <div className="size-full">
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
      <Toaster position="top-right" richColors />
    </div>
  );
}