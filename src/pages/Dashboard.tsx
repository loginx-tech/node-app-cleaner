import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import config from '@/config/config.js';
import PM2Status from '@/components/PM2Status';

interface Application {
  id: number;
  name: string;
  hasDirectories?: boolean;
}

const Dashboard = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    // Check if we're in a preview environment
    const isPreview = window.location.hostname.includes('lovableproject.com') || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
    setIsPreviewMode(isPreview);

    // Fetch applications
    const fetchApplications = async () => {
      try {
        if (isPreview) {
          console.log("Using preview applications data");
          setApplications(config.applications.map(app => ({
            ...app,
            hasDirectories: true
          })));
        } else {
          const response = await fetch('/api/applications');
          const data = await response.json();
          
          // Verificar diretórios para cada aplicação
          const appsWithDirInfo = await Promise.all(
            data.map(async (app: Application) => {
              try {
                const dirResponse = await fetch(`/api/applications/${app.id}/directories`);
                const dirData = await dirResponse.json();
                
                // Adicionar log para debug
                console.log(`App ${app.id} directories:`, dirData);
                
                // Verificar se há diretórios com arquivos
                const hasNonEmptyDirectories = dirData.directories?.some((dir: any) => {
                  // Verificar se o diretório tem a propriedade files e se tem arquivos
                  return dir.files && dir.files.length > 0;
                });

                return {
                  ...app,
                  hasDirectories: hasNonEmptyDirectories
                };
              } catch (error) {
                console.error(`Error checking directories for app ${app.id}:`, error);
                // Em caso de erro na verificação, assumimos que pode haver diretórios
                return {
                  ...app,
                  hasDirectories: true
                };
              }
            })
          );
          
          // Log para debug
          console.log('Applications with directory info:', appsWithDirInfo);
          
          setApplications(appsWithDirInfo);
        }
      } catch (error) {
        console.error('Error fetching applications:', error);
        toast.error('Failed to load applications');
        
        if (isPreview) {
          console.log("Falling back to config applications data");
          setApplications(config.applications.map(app => ({
            ...app,
            hasDirectories: true
          })));
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    navigate('/');
  };

  const handleViewDirectories = (appId: number) => {
    navigate(`/application/${appId}`);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header - Altura fixa */}
      <div className="bg-white shadow-sm h-14 flex items-center">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900">PM2 Applications Manager</h1>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Mode Banner - Altura fixa */}
      {isPreviewMode && (
        <div className="bg-blue-50 border-b border-blue-200 h-8 flex items-center">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <p className="text-sm text-blue-700">
              Modo Preview: Usando dados de aplicações locais
            </p>
          </div>
        </div>
      )}

      {/* Main Content - Altura flexível */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column - Applications */}
          <div className="h-full">
            <Card className="h-full flex flex-col">
              <CardHeader className="py-3">
                <CardTitle className="text-lg">Applications</CardTitle>
                <CardDescription>Manage your PM2 applications</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {isLoading ? (
                  <div className="text-center py-4">
                    <p>Loading applications...</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {applications.map((app) => (
                      <Card key={app.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="py-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <CardTitle className="text-base">{app.name}</CardTitle>
                              <CardDescription className="text-sm">
                                ID: {app.id}
                                {app.hasDirectories === false && (
                                  <span className="ml-2 text-yellow-600">(No directories)</span>
                                )}
                              </CardDescription>
                            </div>
                            <Button 
                              onClick={() => handleViewDirectories(app.id)}
                              size="sm"
                              disabled={app.hasDirectories === false}
                              variant={app.hasDirectories === false ? "secondary" : "default"}
                            >
                              View Directories
                            </Button>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - PM2 Status */}
          <div className="h-full">
            <PM2Status />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
