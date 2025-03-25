import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { RefreshCw, Trash, FolderX } from "lucide-react";
import config from '@/config/config.js';

interface UserDirectory {
  id: string;
  name: string;
  hasFiles?: boolean;
}

interface Application {
  id: number;
  name: string;
  directory?: string;
  pm2Name?: string;
}

const ApplicationDetails = () => {
  const { id } = useParams<{ id: string }>();
  const appId = Number(id);
  const [application, setApplication] = useState<Application | null>(null);
  const [userDirectories, setUserDirectories] = useState<UserDirectory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [hasValidDirectories, setHasValidDirectories] = useState(false);
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

    // Fetch application and user directories
    const fetchData = async () => {
      try {
        // Fetch application details
        let currentApp: Application | null = null;
        
        if (isPreview) {
          console.log("Using preview application data");
          currentApp = config.applications.find((app: Application) => app.id === appId) || null;
          setApplication(currentApp);
        } else {
          const appResponse = await fetch('/api/applications');
          const applications = await appResponse.json();
          currentApp = applications.find((app: Application) => app.id === appId);
          setApplication(currentApp);
        }

        if (currentApp) {
          if (isPreview) {
            console.log("Generating preview user directories");
            const mockDirectories = [
              { id: 'user1', name: 'user1', hasFiles: true },
              { id: 'user2', name: 'user2', hasFiles: true },
              { id: 'admin', name: 'admin', hasFiles: true }
            ];
            setUserDirectories(mockDirectories);
            setHasValidDirectories(true);
          } else {
            try {
              // Primeiro, verifica se os diretórios base existem
              const baseResponse = await fetch(`/api/application/${appId}/check-directories`);
              const baseData = await baseResponse.json();
              
              if (!baseData.success || !baseData.hasValidDirectories) {
                setHasValidDirectories(false);
                setUserDirectories([]);
                return;
              }
              
              // Se os diretórios base existem, busca os diretórios de usuário
              const dirResponse = await fetch(`/api/application/${appId}/user-directories`);
              const directories = await dirResponse.json();
              
              if (directories && Array.isArray(directories)) {
                setUserDirectories(directories);
                setHasValidDirectories(true);
              } else {
                setUserDirectories([]);
                setHasValidDirectories(false);
              }
            } catch (error) {
              console.error('Error checking directories:', error);
              setHasValidDirectories(false);
              setUserDirectories([]);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
        setHasValidDirectories(false);
        
        if (isPreview) {
          const currentApp = config.applications.find((app: Application) => app.id === appId) || null;
          setApplication(currentApp);
          setUserDirectories([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [appId, navigate, isPreviewMode]);

  const handleDelete = async () => {
    if (!selectedDirectory) return;
    
    setIsDeleting(true);
    
    try {
      if (isPreviewMode) {
        console.log(`Simulating deletion of directory ${selectedDirectory}`);
        setTimeout(() => {
          setUserDirectories(userDirectories.filter(dir => dir.id !== selectedDirectory));
          toast.success(`Successfully deleted directory ${selectedDirectory} (preview mode)`);
        }, 1000);
      } else {
        const response = await fetch(`/api/application/${appId}/user-directory/${selectedDirectory}`, {
          method: 'DELETE',
        });
        
        const result = await response.json();
        
        if (result.success) {
          setUserDirectories(userDirectories.filter(dir => dir.id !== selectedDirectory));
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      }
    } catch (error) {
      console.error('Error deleting directory:', error);
      toast.error('An error occurred while deleting the directory');
    } finally {
      setIsDeleting(false);
      setSelectedDirectory(null);
    }
  };

  const handleRestart = () => {
    if (!application) return;
    
    setIsRestarting(true);
    
    console.log(`Simulating restart of application ${application.name}`);
    setTimeout(() => {
      toast.success(`Successfully restarted ${application.name} (preview mode)`);
      setIsRestarting(false);
    }, 1500);
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 flex items-center justify-center">
        <p>Loading application details...</p>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h1 className="text-xl font-semibold mb-4">Application not found</h1>
            <Button onClick={handleBack}>Back to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  // Se não houver diretórios válidos, mostra apenas a mensagem e o botão de voltar
  if (!hasValidDirectories) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FolderX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Empty Directories</h1>
            <p className="text-gray-500 mb-6">No user directories found for this application.</p>
            <Button onClick={handleBack}>Back to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="outline" onClick={handleBack} className="mr-4">
            Back
          </Button>
          <h1 className="text-2xl font-bold">{application.name} - User Directories</h1>
          
          <Button 
            variant="outline" 
            onClick={handleRestart} 
            disabled={isRestarting} 
            className="ml-auto flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {isRestarting ? 'Restarting...' : 'Restart PM2 App'}
          </Button>
        </div>

        {isPreviewMode && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-md mb-4 text-sm">
            Modo Preview: As alterações não afetarão nenhum sistema real
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {userDirectories.length === 0 ? (
            <div className="p-12 text-center">
              <FolderX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Empty Directories</h3>
              <p className="text-gray-500">No user directories found for this application.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDirectories.map((dir) => (
                  <TableRow key={dir.id}>
                    <TableCell>{dir.id}</TableCell>
                    <TableCell>{dir.name}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            disabled={isDeleting}
                            className="flex items-center"
                          >
                            <Trash className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the user directory and all its contents.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                setSelectedDirectory(dir.id);
                                handleDelete();
                              }}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetails;
