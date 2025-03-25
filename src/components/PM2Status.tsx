import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [activeTab, setActiveTab] = useState("status");
  const scrollRef = useRef<HTMLDivElement>(null);

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
    const interval = setInterval(fetchStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  // Setup SSE for logs with auto-reconnect
  useEffect(() => {
    let eventSource: EventSource;
    
    const connectSSE = () => {
      eventSource = new EventSource('/api/pm2/logs/node-app-cleaner');

      eventSource.onmessage = (event) => {
        const logData = JSON.parse(event.data);
        setLogs(prevLogs => {
          const newLogs = [...prevLogs, logData.data].slice(-100); // Keep last 100 logs
          
          // Auto-scroll to bottom if we're already at the bottom
          if (scrollRef.current) {
            const { scrollHeight, scrollTop, clientHeight } = scrollRef.current;
            if (scrollHeight - scrollTop <= clientHeight + 100) {
              setTimeout(() => {
                scrollRef.current?.scrollTo({
                  top: scrollRef.current.scrollHeight,
                  behavior: 'smooth'
                });
              }, 100);
            }
          }
          
          return newLogs;
        });
      };

      eventSource.onerror = () => {
        console.error('SSE Error');
        eventSource.close();
        // Attempt to reconnect after 5 seconds
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
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
    <Card className="h-full">
      <CardHeader>
        <CardTitle>PM2 Monitor</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-5rem)]">
        <Tabs 
          defaultValue="status" 
          className="h-full"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="h-[calc(100%-3rem)]">
            {error ? (
              <div className="text-red-500 p-4">{error}</div>
            ) : (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                  {processes.map(process => (
                    <Card key={process.pm_id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm font-medium text-gray-500">Name</div>
                            <div className="font-medium">{process.name}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-500">Status</div>
                            <div className={`font-medium ${
                              process.pm2_env.status === 'online' 
                                ? 'text-green-500' 
                                : 'text-red-500'
                            }`}>
                              {process.pm2_env.status}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-500">Memory</div>
                            <div className="font-medium">{formatBytes(process.monit.memory)}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-500">CPU</div>
                            <div className="font-medium">{process.monit.cpu}%</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-500">Restarts</div>
                            <div className="font-medium">{process.pm2_env.restart_time}</div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-500">Created</div>
                            <div className="font-medium">{formatDate(process.pm2_env.created_at)}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="logs" className="h-[calc(100%-3rem)]">
            <ScrollArea 
              className="h-full border rounded-md bg-black text-white font-mono text-sm p-4"
              ref={scrollRef}
            >
              {logs.map((log, index) => (
                <div 
                  key={index}
                  className="whitespace-pre-wrap"
                >
                  {log}
                </div>
              ))}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PM2Status; 