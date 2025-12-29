'use client';

import { useState, useEffect } from 'react';
import { Coins, CheckSquare, Square, Send } from 'lucide-react';

interface UTxO {
  txHash: string;
  txIndex: number;
  lovelace: number;
  address: string;
}

interface CommitManagerProps {
  participant: 'alice' | 'bob';
  credentialsPath: string;
  disabled?: boolean;
  cardanoNodeRunning?: boolean;
}

export default function CommitManager({ participant, credentialsPath, disabled = false, cardanoNodeRunning = true }: CommitManagerProps) {
  const [utxos, setUtxos] = useState<Record<string, any>>({});
  const [selectedUtxos, setSelectedUtxos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [isCommitting, setIsCommitting] = useState(false);

  const fetchUtxos = async () => {
    if (!cardanoNodeRunning) {
      setMessage('⚠️ Cardano node must be running to fetch UTxOs');
      return;
    }
    
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/hydra?action=query-utxos&participant=${participant}&credentialsPath=${encodeURIComponent(credentialsPath)}`);
      const data = await response.json();
      
      if (data.error) {
        setMessage(`Error: ${data.error}`);
        setUtxos({});
      } else {
        setUtxos(data.utxos || {});
        setMessage(data.utxos && Object.keys(data.utxos).length > 0 
          ? `Found ${Object.keys(data.utxos).length} UTxO(s)` 
          : 'No UTxOs found. Fund the address first.');
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
      setUtxos({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!disabled && cardanoNodeRunning) {
      fetchUtxos();
    }
  }, [participant, credentialsPath, disabled, cardanoNodeRunning]);

  const toggleUtxo = (utxoKey: string) => {
    const newSelected = new Set(selectedUtxos);
    if (newSelected.has(utxoKey)) {
      newSelected.delete(utxoKey);
    } else {
      newSelected.add(utxoKey);
    }
    setSelectedUtxos(newSelected);
  };

  const selectAll = () => {
    setSelectedUtxos(new Set(Object.keys(utxos)));
  };

  const deselectAll = () => {
    setSelectedUtxos(new Set());
  };

  const handleCommit = async () => {
    if (selectedUtxos.size === 0) {
      setMessage('Please select at least one UTxO to commit');
      return;
    }

    setIsCommitting(true);
    setMessage('Committing UTxOs...');

    try {
      // Build UTxO object with only selected entries
      const selectedUtxoObj: Record<string, any> = {};
      selectedUtxos.forEach(key => {
        selectedUtxoObj[key] = utxos[key];
      });

      const response = await fetch('/api/hydra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit-funds',
          participant,
          config: { credentialsPath },
          utxos: selectedUtxoObj,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessage(`❌ Commit failed: ${data.error}`);
      } else {
        setMessage(`✅ Commit successful! Transaction submitted.`);
        // Refresh UTxOs after commit
        setTimeout(() => {
          fetchUtxos();
          setSelectedUtxos(new Set());
        }, 2000);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsCommitting(false);
    }
  };

  const formatLovelace = (lovelace: number) => {
    return (lovelace / 1_000_000).toFixed(2) + ' ₳';
  };

  const totalSelected = Array.from(selectedUtxos).reduce((sum, key) => {
    return sum + (utxos[key]?.value?.lovelace || 0);
  }, 0);

  if (disabled) {
    return (
      <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
        <p className="text-gray-800 text-sm text-center font-medium">
          ⚠️ Start {participant} node first to enable commit management
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
      {!cardanoNodeRunning && (
        <div className="mb-3 p-2 rounded text-sm bg-yellow-50 text-yellow-800 border border-yellow-200">
          ⚠️ Cardano node must be running to fetch UTxOs and commit funds
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Coins className="w-5 h-5" />
          {participant.charAt(0).toUpperCase() + participant.slice(1)}'s UTxOs
        </h4>
        <button
          onClick={fetchUtxos}
          disabled={loading || !cardanoNodeRunning}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          title={!cardanoNodeRunning ? 'Cardano node must be running' : ''}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {message && (
        <div className={`mb-3 p-2 rounded text-sm ${
          message.includes('Error') || message.includes('❌')
            ? 'bg-red-50 text-red-700 border border-red-200'
            : message.includes('✅')
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {message}
        </div>
      )}

      {Object.keys(utxos).length === 0 ? (
        <div className="text-center py-6 text-gray-800 text-sm font-medium">
          {loading ? 'Loading UTxOs...' : 'No UTxOs available'}
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-3">
            <button
              onClick={selectAll}
              className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
            >
              Deselect All
            </button>
            <div className="ml-auto text-sm font-medium text-gray-700">
              Selected: {formatLovelace(totalSelected)}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg mb-3">
            {Object.entries(utxos).map(([key, utxo]: [string, any]) => {
              const [txHash, txIndex] = key.split('#');
              const lovelace = utxo.value?.lovelace || 0;
              const isSelected = selectedUtxos.has(key);

              return (
                <div
                  key={key}
                  onClick={() => toggleUtxo(key)}
                  className={`p-3 border-b border-gray-200 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs text-gray-800 truncate">
                        {txHash}#{txIndex}
                      </div>
                      <div className="text-sm font-bold text-gray-900 mt-1">
                        {formatLovelace(lovelace)}
                      </div>
                      {utxo.value?.assets && Object.keys(utxo.value.assets).length > 0 && (
                        <div className="text-xs text-gray-700 mt-1">
                          + {Object.keys(utxo.value.assets).length} asset(s)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleCommit}
            disabled={isCommitting || selectedUtxos.size === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Send className="w-4 h-4" />
            {isCommitting ? 'Committing...' : `Commit ${selectedUtxos.size} UTxO(s)`}
          </button>
        </>
      )}
    </div>
  );
}
