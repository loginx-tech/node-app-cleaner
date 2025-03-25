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
    pm_uptime: number;
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

    fetchStatus();
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
          const newLogs = [...prevLogs, logData.data].slice(-100);
          
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
    return `${mb.toFixed(1)} MB`;
  };

  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Calculate uptime in days
  const calculateUptime = (uptime: number) => {
    const now = Date.now();
    const uptimeMs = now - uptime; // Calcula a diferença entre agora e o timestamp de início

    const uptimeInDays = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const uptimeInHours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const uptimeInMinutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

    if (uptimeInDays > 0) {
      return `${uptimeInDays}d ${uptimeInHours}h`;
    } else if (uptimeInHours > 0) {
      return `${uptimeInHours}h ${uptimeInMinutes}m`;
    } else {
      return `${uptimeInMinutes}m`;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-3">
        <CardTitle>PM2 Monitor</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <Tabs 
          defaultValue="status" 
          className="h-full"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="w-full grid grid-cols-2 rounded-none">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="flex-1 p-2">
            {error ? (
              <div className="text-red-500 p-2">{error}</div>
            ) : (
              <ScrollArea className="h-[calc(100vh-15rem)]">
                <div className="space-y-2">
                  {processes.map(process => (
                    <Card key={process.pm_id} className="border-l-4 border-l-blue-500">
                      <div className="p-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div className="col-span-2">
                            <div className="font-medium truncate">{process.name}</div>
                            <div className={`text-sm ${
                              process.pm2_env.status === 'online' 
                                ? 'text-green-500' 
                                : 'text-red-500'
                            }`}>
                              {process.pm2_env.status}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">Memory</div>
                            <div className="font-medium">{formatBytes(process.monit.memory)}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">CPU</div>
                            <div className="font-medium">{process.monit.cpu}%</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Uptime</div>
                            <div className="font-medium">{calculateUptime(process.pm2_env.pm_uptime)}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Restarts</div>
                            <div className="font-medium">{process.pm2_env.restart_time}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-gray-500">Created</div>
                            <div className="font-medium">{formatDate(process.pm2_env.created_at)}</div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="logs" className="flex-1">
            <ScrollArea 
              className="h-[calc(100vh-15rem)] border-t bg-black text-white font-mono text-xs p-2"
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