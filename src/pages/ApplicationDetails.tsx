
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

interface UserDirectory {
  id: string;
  name: string;
}

interface Application {
  id: number;
  name: string;
}

const ApplicationDetails = () => {
  const { id } = useParams<{ id: string }>();
  const appId = Number(id);
  const [application, setApplication] = useState<Application | null>(null);
  const [userDirectories, setUserDirectories] = useState<UserDirectory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    // Fetch application and user directories
    const fetchData = async () => {
      try {
        // Fetch application details
        const appResponse = await fetch('/api/applications');
        const applications = await appResponse.json();
        const currentApp = applications.find((app: Application) => app.id === appId);
        setApplication(currentApp);

        if (currentApp) {
          // Fetch user directories
          const dirResponse = await fetch(`/api/application/${appId}/user-directories`);
          const directories = await dirResponse.json();
          setUserDirectories(directories);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [appId, navigate]);

  const handleDelete = async () => {
    if (!selectedDirectory) return;
    
    setIsDeleting(true);
    
    try {
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
    } catch (error) {
      console.error('Error deleting directory:', error);
      toast.error('An error occurred while deleting the directory');
    } finally {
      setIsDeleting(false);
      setSelectedDirectory(null);
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

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="outline" onClick={handleBack} className="mr-4">
            Back
          </Button>
          <h1 className="text-2xl font-bold">{application.name} - User Directories</h1>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {userDirectories.length === 0 ? (
            <div className="p-6 text-center">
              <p>No user directories found.</p>
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
                            onClick={() => setSelectedDirectory(dir.id)}
                          >
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the user directory "{dir.name}" and its 
                              corresponding token file, then restart the PM2 application.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setSelectedDirectory(null)}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleDelete}
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
