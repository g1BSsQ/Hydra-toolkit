'use client';

import { useState } from 'react';
import { Trash2, FolderOpen, Settings, Loader2 } from 'lucide-react';

export default function DataManagement() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  
  const [config, setConfig] = useState({
    paths: [
      '~/persistence-alice',
      '~/persistence-bob',
      '~/hydra/demo/devnet/persistence/',
      '~/hydra-demo/demo/devnet/persistence/',
      '/tmp/persistence-*',
      '/tmp/hydra-*',
    ],
  });

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all Hydra persistence data? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/hydra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-data', config }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear data');
      }

      setMessage({ type: 'success', text: 'Data cleared successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Data Management</h3>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="text-sm text-gray-800 hover:text-gray-900 flex items-center gap-1 font-medium"
        >
          <Settings className="w-4 h-4" />
          {showConfig ? 'Hide' : 'Show'} Config
        </button>
      </div>

      {showConfig && (
        <div className="mb-4 p-4 bg-gray-50 rounded-md">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Paths to Clear:</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            {config.paths.map((path, index) => (
              <li key={index} className="font-mono flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-gray-400" />
                {path}
              </li>
            ))}
          </ul>
        </div>
      )}

      {message && (
        <div className={`mb-4 p-3 rounded-md text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <button
        onClick={handleClearData}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Trash2 className="w-5 h-5" />
        )}
        {loading ? 'Clearing Data...' : 'Clear All Persistence Data'}
      </button>

      <p className="mt-3 text-xs text-gray-700 text-center">
        This will remove all persistence directories and create fresh ones
      </p>
    </div>
  );
}
