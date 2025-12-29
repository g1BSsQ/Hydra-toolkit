'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Square, Trash2, RefreshCw, Loader2, Terminal } from 'lucide-react';

interface NodeStatus {
  running: boolean;
  startTime?: string;
  pid?: number;
  port?: number;
  output?: string;
  errorOutput?: string;
}

interface NodeControlProps {
  nodeId: 'alice' | 'bob' | 'cardano';
  title: string;
  config: any;
  onStatusChange?: (status: NodeStatus) => void;
}

export default function NodeControl({ nodeId, title, config, onStatusChange }: NodeControlProps) {
  const [status, setStatus] = useState<NodeStatus>({ running: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchStatus = async () => {
    try {
      const nodeKey = nodeId === 'cardano' ? 'cardano-node' : `${nodeId}-node`;
      const response = await fetch(`/api/hydra?nodeId=${nodeKey}`);
      const data = await response.json();
      setStatus(data);
      
      // Notify parent component of status change
      if (onStatusChange) {
        onStatusChange(data);
      }
      
      // Update logs if node is running
      if (data.running) {
        const newLogs: string[] = [];
        if (data.output) {
          newLogs.push(...data.output.split('\n').filter((line: string) => line.trim()));
        }
        if (data.errorOutput) {
          newLogs.push(...data.errorOutput.split('\n').filter((line: string) => line.trim()));
        }
        if (newLogs.length > 0) {
          setLogs(prev => {
            const combined = [...prev, ...newLogs];
            // Keep only last 100 lines
            return combined.slice(-100);
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [nodeId]);

  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showLogs]);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setLogs([]); // Clear old logs
    setShowLogs(true); // Show logs panel
    try {
      const action = nodeId === 'cardano' ? 'start-cardano' : `start-${nodeId}`;
      const response = await fetch('/api/hydra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, nodeId, config }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start node');
      }
      
      setSuccessMessage(`✅ ${nodeId === 'cardano' ? 'Cardano' : nodeId.charAt(0).toUpperCase() + nodeId.slice(1)} node đã được khởi động trong WSL!`);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Node started successfully with PID: ${data.pid}`]);
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ERROR: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    setError(null);
    try {
      const nodeKey = nodeId === 'cardano' ? 'cardano-node' : `${nodeId}-node`;
      const response = await fetch('/api/hydra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', nodeId: nodeKey }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to stop node');
      }
      
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearLock = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch('/api/hydra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-lock' }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear lock');
      }
      
      setSuccessMessage('✅ Database lock đã được xóa. Bạn có thể khởi động lại node.');
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          status.running 
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {status.running ? 'Running' : 'Stopped'}
        </div>
      </div>

      {status.running && (
        <div className="mb-4 text-sm text-gray-700 space-y-1">
          {status.pid && <div>PID: {status.pid}</div>}
          {status.port && <div>API Port: {status.port}</div>}
          {status.startTime && (
            <div>Started: {new Date(status.startTime).toLocaleString()}</div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
          {successMessage}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {!status.running ? (
          <button
            onClick={handleStart}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Start
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
            Stop
          </button>
        )}
        {nodeId === 'cardano' && !status.running && error && error.includes('locked') && (
          <button
            onClick={handleClearLock}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Clear DB Lock
          </button>
        )}
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          <Terminal className="w-4 h-4" />
          {showLogs ? 'Hide' : 'Show'} Logs
        </button>
      </div>

      {/* Logs Panel */}
      {showLogs && (
        <div className="mt-4 border border-gray-200 rounded-md bg-gray-900 text-gray-100">
          <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              <h4 className="text-sm font-semibold">Node Logs ({logs.length} lines)</h4>
            </div>
            <button
              onClick={() => setLogs([])}
              className="text-sm text-gray-700 hover:text-gray-900 flex items-center gap-1 font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto p-3 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-center text-gray-700 py-4 font-medium">
                No logs yet. Start the node to see logs.
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`${
                      log.includes('ERROR') || log.includes('Error') ? 'text-red-400' :
                      log.includes('WARNING') || log.includes('Warning') ? 'text-yellow-400' :
                      log.includes('SUCCESS') || log.includes('started') ? 'text-green-400' :
                      'text-gray-300'
                    }`}
                  >
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
