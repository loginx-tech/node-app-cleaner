
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import config from '@/config/config.js';
import { Download } from 'lucide-react';

interface Application {
  id: number;
  name: string;
}

const Dashboard = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
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
          // In preview mode, use local data from config
          console.log("Using preview applications data");
          setApplications(config.applications);
        } else {
          // Normal API call for production
          const response = await fetch('/api/applications');
          const data = await response.json();
          setApplications(data);
        }
      } catch (error) {
        console.error('Error fetching applications:', error);
        toast.error('Failed to load applications');
        
        // Fallback to config data in case of error
        if (isPreview) {
          console.log("Falling back to config applications data");
          setApplications(config.applications);
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

  const handleDownloadProject = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/download');
      
      if (!response.ok) {
        throw new Error('Failed to generate download');
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a download link and click it
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pm2-apps-manager.zip';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Download iniciado com sucesso!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Falha ao baixar o projeto');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">PM2 Applications Manager</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleDownloadProject} 
              disabled={isDownloading}
              className="flex items-center gap-2"
            >
              <Download size={18} />
              {isDownloading ? 'Baixando...' : 'Download ZIP'}
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        {isPreviewMode && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-md mb-4 text-sm">
            Modo Preview: Usando dados de aplicações locais
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <p>Loading applications...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {applications.map((app) => (
              <Card key={app.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>{app.name}</CardTitle>
                  <CardDescription>PM2 Application</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">ID: {app.id}</p>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => handleViewDirectories(app.id)}
                  >
                    View User Directories
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
