"use client";

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

interface LogEntry {
  timestamp: string;
  type: 'out' | 'error';
  data: string;
}

const PM2Status = () => {
  const [processes, setProcesses] = useState<PM2Process[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("status");
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch PM2 status every 5 seconds
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/pm2/status');
        const data = await response.json();
        
        if (data.success) {
          setProcesses(data.processes);
          // Se não houver processo selecionado e houver processos disponíveis,
          // seleciona o primeiro
          if (!selectedProcess && data.processes.length > 0) {
            setSelectedProcess(data.processes[0].name);
          }
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
  }, [selectedProcess]);

  // Setup SSE for logs with auto-reconnect
  useEffect(() => {
    let eventSource: EventSource | null = null;
    
    const connectSSE = () => {
      // Se não houver processo selecionado, não conecta ao SSE
      if (!selectedProcess) {
        console.log('No process selected for logs');
        return;
      }

      // Fecha a conexão anterior se existir
      if (eventSource) {
        eventSource.close();
      }

      console.log(`Connecting to logs for process: ${selectedProcess}`);
      eventSource = new EventSource(`/api/pm2/logs/${selectedProcess}`);

      eventSource.onopen = () => {
        console.log('SSE connection opened');
      };

      eventSource.onmessage = (event) => {
        try {
          const logData = JSON.parse(event.data);
          setLogs(prevLogs => {
            const newLog: LogEntry = {
              timestamp: new Date().toISOString(),
              type: logData.type,
              data: logData.data.trim()
            };
            
            // Mantém apenas os últimos 1000 logs para evitar problemas de memória
            const newLogs = [...prevLogs, newLog].slice(-1000);
            
            // Auto-scroll apenas se o usuário estiver no final
            if (scrollRef.current) {
              const { scrollHeight, scrollTop, clientHeight } = scrollRef.current;
              const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100;
              
              if (isAtBottom) {
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
        } catch (error) {
          console.error('Error parsing log data:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        if (eventSource) {
          eventSource.close();
        }
        // Tenta reconectar após 5 segundos
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [selectedProcess]);

  // Limpa os logs quando muda o processo
  useEffect(() => {
    setLogs([]);
  }, [selectedProcess]);

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
    const uptimeMs = now - uptime;

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

  // Format log timestamp
  const formatLogTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
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
                    <Card 
                      key={process.pm_id} 
                      className={`border-l-4 ${
                        process.name === selectedProcess 
                          ? 'border-l-green-500 bg-green-50' 
                          : 'border-l-blue-500'
                      } cursor-pointer hover:bg-gray-50`}
                      onClick={() => setSelectedProcess(process.name)}
                    >
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
            {selectedProcess ? (
              <ScrollArea 
                className="h-[calc(100vh-15rem)] border-t bg-black text-white font-mono text-xs p-2"
                ref={scrollRef}
              >
                {logs.map((log, index) => (
                  <div 
                    key={index}
                    className={`whitespace-pre-wrap ${
                      log.type === 'error' ? 'text-red-400' : 'text-gray-300'
                    }`}
                  >
                    <span className="text-blue-400">[{formatLogTimestamp(log.timestamp)}]</span> {log.data}
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-gray-500 italic">
                    Waiting for logs... (Click a process in the Status tab to view its logs)
                  </div>
                )}
              </ScrollArea>
            ) : (
              <div className="h-[calc(100vh-15rem)] border-t flex items-center justify-center text-gray-500">
                Select a process in the Status tab to view logs
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PM2Status; 