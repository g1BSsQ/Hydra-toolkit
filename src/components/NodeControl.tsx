'use client';

import { useState, useEffect } from 'react';
import { Play, Square, Trash2, RefreshCw, Loader2 } from 'lucide-react';

interface NodeStatus {
  running: boolean;
  startTime?: string;
  pid?: number;
  port?: number;
}

interface NodeControlProps {
  nodeId: 'alice' | 'bob' | 'cardano';
  title: string;
  config: any;
}

export default function NodeControl({ nodeId, title, config }: NodeControlProps) {
  const [status, setStatus] = useState<NodeStatus>({ running: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const nodeKey = nodeId === 'cardano' ? 'cardano-node' : `${nodeId}-node`;
      const response = await fetch(`/api/hydra?nodeId=${nodeKey}`);
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [nodeId]);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
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
      
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
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
        <div className="mb-4 text-sm text-gray-600 space-y-1">
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

      <div className="flex gap-2">
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
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
