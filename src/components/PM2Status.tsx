import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PM2Process {
  name: string;
  pm_id: number;
  monit: {
    memory: number;
    cpu: number;
  };
  pm2_env: {
    status: string;
    restart_time: number;
    created_at: number;
  };
}

const PM2Status = () => {
  const [processes, setProcesses] = useState<PM2Process[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch PM2 status every 5 seconds
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/pm2/status');
        const data = await response.json();
        
        if (data.success) {
          setProcesses(data.processes);
          setError(null);
        } else {
          setError(data.message);
        }
      } catch (error) {
        setError('Failed to fetch PM2 status');
        console.error('Error fetching PM2 status:', error);
      }
    };

    fetchStatus(); // Initial fetch
    const interval = setInterval(fetchStatus, 5000); // Fetch every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Setup SSE for logs
  useEffect(() => {
    const eventSource = new EventSource('/api/pm2/logs/node-app-cleaner');

    eventSource.onmessage = (event) => {
      const logData = JSON.parse(event.data);
      setLogs(prevLogs => [...prevLogs, logData.data].slice(-100)); // Keep last 100 logs
    };

    eventSource.onerror = () => {
      console.error('SSE Error');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Format bytes to human readable format
  const formatBytes = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* PM2 Status */}
      <Card>
        <CardHeader>
          <CardTitle>PM2 Status</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-red-500">{error}</div>
          ) : (
            <div className="grid gap-4">
              {processes.map(process => (
                <div 
                  key={process.pm_id}
                  className="p-4 border rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                  <div>
                    <div className="text-sm font-medium">Name</div>
                    <div>{process.name}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Status</div>
                    <div className={
                      process.pm2_env.status === 'online' 
                        ? 'text-green-500' 
                        : 'text-red-500'
                    }>
                      {process.pm2_env.status}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Memory</div>
                    <div>{formatBytes(process.monit.memory)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">CPU</div>
                    <div>{process.monit.cpu}%</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Restarts</div>
                    <div>{process.pm2_env.restart_time}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Created</div>
                    <div>{formatDate(process.pm2_env.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* PM2 Logs */}
      <Card>
        <CardHeader>
          <CardTitle>PM2 Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full rounded-md border p-4 font-mono text-sm">
            {logs.map((log, index) => (
              <div 
                key={index}
                className="whitespace-pre-wrap"
              >
                {log}
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default PM2Status; 