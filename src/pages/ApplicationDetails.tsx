import React, { useState, useEffect, useCallback } from 'react';
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      // Fetch application details
      let currentApp: Application | null = null;
      
      if (isPreviewMode) {
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
        if (isPreviewMode) {
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
            console.log(`Checking directories for app ${appId}...`);
            const baseResponse = await fetch(`/api/application/${appId}/check-directories`);
            const baseData = await baseResponse.json();
            
            console.log('Base directory check response:', baseData);

            if (baseData.success && baseData.hasValidDirectories) {
              console.log('Base directories are valid, fetching user directories...');
              const dirResponse = await fetch(`/api/application/${appId}/user-directories`);
              const data = await dirResponse.json();
              
              console.log('User directories response:', data);

              if (data.success && Array.isArray(data.directories)) {
                console.log(`Found ${data.directories.length} user directories`);
                setUserDirectories(data.directories);
                setHasValidDirectories(true);
              } else {
                console.log('No user directories found, but base directories exist');
                setUserDirectories([]);
                setHasValidDirectories(true);
              }
            } else {
              console.log('Base directories are not valid');
              setHasValidDirectories(false);
              setUserDirectories([]);
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
      
      if (isPreviewMode) {
        const currentApp = config.applications.find((app: Application) => app.id === appId) || null;
        setApplication(currentApp);
        setUserDirectories([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [appId, isPreviewMode]);

  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    const isPreview = window.location.hostname.includes('lovableproject.com') || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
    setIsPreviewMode(isPreview);

    fetchData();
  }, [fetchData, navigate]);

  const handleDelete = async () => {
    if (!selectedDirectory) return;
    
    setIsDeleting(true);
    setIsDialogOpen(false);
    
    try {
      if (isPreviewMode) {
        console.log(`Simulating deletion of directory ${selectedDirectory}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setUserDirectories(userDirectories.filter(dir => dir.id !== selectedDirectory));
        toast.success(`Successfully deleted directory ${selectedDirectory} (preview mode)`);
      } else {
        const response = await fetch(`/api/application/${appId}/user-directory/${selectedDirectory}`, {
          method: 'DELETE',
        });
        
        const result = await response.json();
        
        if (result.success) {
          await fetchData();
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

  const handleRestart = async () => {
    if (!application) return;
    
    setIsRestarting(true);
    
    try {
      const response = await fetch(`/api/pm2/restart/${application.pm2Name}`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Successfully restarted ${application.name}`);
      } else {
        toast.error(result.message || 'Failed to restart application');
      }
    } catch (error) {
      console.error('Error restarting application:', error);
      toast.error('Failed to restart application');
    } finally {
      setIsRestarting(false);
    }
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
                      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            disabled={isDeleting}
                            className="flex items-center"
                            onClick={() => setSelectedDirectory(dir.id)}
                          >
                            <Trash className="w-4 h-4 mr-1" />
                            {isDeleting ? 'Deleting...' : 'Delete'}
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
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDelete}
                              className="bg-red-600 hover:bg-red-700"
                              disabled={isDeleting}
                            >
                              {isDeleting ? 'Deleting...' : 'Delete'}
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
