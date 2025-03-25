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
import PM2Status from '@/components/PM2Status';

interface Application {
  id: number;
  name: string;
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

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">PM2 Applications Manager</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        {isPreviewMode && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-md text-sm">
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

        {/* PM2 Status and Logs */}
        <PM2Status />
      </div>
    </div>
  );
};

export default Dashboard;
