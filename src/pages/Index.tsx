
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import config from '@/config/config.js';

const Index = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Check if we're in a preview environment
  useEffect(() => {
    // Check if we're in a preview/development environment
    const isPreview = window.location.hostname.includes('lovableproject.com') || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
    setIsPreviewMode(isPreview);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('Por favor, informe usuário e senha');
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (isPreviewMode) {
        // In preview mode, use local authentication
        console.log("Using preview authentication mode");
        
        // Check credentials against the config file
        const validUser = config.users.find(
          user => user.username === username && user.password === password
        );
        
        if (validUser) {
          toast.success('Login bem-sucedido');
          sessionStorage.setItem('isAuthenticated', 'true');
          setTimeout(() => navigate('/dashboard'), 1000);
        } else {
          toast.error('Credenciais inválidas');
        }
      } else {
        // Normal API authentication for production
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });
        
        const data = await response.json();
        
        if (data.success) {
          toast.success('Login bem-sucedido');
          sessionStorage.setItem('isAuthenticated', 'true');
          navigate('/dashboard');
        } else {
          toast.error(data.message || 'Falha no login');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (isPreviewMode) {
        // In preview mode, provide helpful error message
        toast.error('Erro de conexão. Usando modo de preview, tente com usuário "admin" e senha "admin123"');
      } else {
        toast.error('Ocorreu um erro durante o login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">PM2 Applications Manager</h1>
        
        {isPreviewMode && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-md mb-4 text-sm">
            Modo Preview: Use "admin" / "admin123" para login
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Usuário
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite seu usuário"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              disabled={isLoading}
            />
          </div>
          
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Index;
