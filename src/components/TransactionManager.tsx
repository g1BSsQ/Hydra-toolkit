'use client';

import { useState, useEffect } from 'react';
import { Send, RefreshCw, Coins } from 'lucide-react';

interface TransactionManagerProps {
  participant: 'alice' | 'bob';
  credentialsPath: string;
  apiPort: number;
  disabled?: boolean;
}

export default function TransactionManager({ 
  participant, 
  credentialsPath, 
  apiPort,
  disabled = false 
}: TransactionManagerProps) {
  const [headUtxos, setHeadUtxos] = useState<Record<string, any>>({});
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [isSending, setIsSending] = useState(false);

  const fetchHeadUtxos = async () => {
    if (disabled) {
      setMessage('Head is not open yet. Please initialize and open the head first.');
      return;
    }
    
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(
        `/api/hydra?action=query-head-utxos&participant=${participant}&apiPort=${apiPort}&credentialsPath=${encodeURIComponent(credentialsPath)}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch head UTxOs: ${response.statusText}`);
      }
      
      const data = await response.json();
      setHeadUtxos(data.utxos || {});
      setMessage(`Found ${Object.keys(data.utxos || {}).length} UTxO(s) in head`);
    } catch (error) {
      console.error('Error fetching head UTxOs:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setHeadUtxos({});
    } finally {
      setLoading(false);
    }
  };

  // Don't auto-fetch on mount - only fetch when user clicks Refresh
  // useEffect removed to prevent auto-fetch when head is not open

  const handleSendTransaction = async () => {
    if (!recipientAddress || !amount) {
      setMessage('Please enter recipient address and amount');
      return;
    }

    const lovelace = Math.floor(parseFloat(amount) * 1_000_000);
    if (isNaN(lovelace) || lovelace <= 0) {
      setMessage('Invalid amount');
      return;
    }

    if (Object.keys(headUtxos).length === 0) {
      setMessage('No UTxOs available in head');
      return;
    }

    setIsSending(true);
    setMessage('Building transaction...');

    try {
      const response = await fetch('/api/hydra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-transaction',
          participant,
          config: {
            credentialsPath,
            apiPort
          },
          recipientAddress,
          lovelace
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Transaction failed');
      }

      setMessage(`✅ Transaction submitted: ${result.txId}`);
      setRecipientAddress('');
      setAmount('');
      
      // Refresh UTxOs after a delay
      setTimeout(() => {
        fetchHeadUtxos();
      }, 2000);
    } catch (error) {
      console.error('Error sending transaction:', error);
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  const formatLovelace = (lovelace: number): string => {
    return (lovelace / 1_000_000).toFixed(2) + ' ₳';
  };

  const totalBalance = Object.values(headUtxos).reduce(
    (sum, utxo) => sum + (utxo.value?.lovelace || 0),
    0
  );

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          <h3 className="font-bold text-gray-900 capitalize">{participant} - Send Transaction</h3>
        </div>
        <button
          onClick={fetchHeadUtxos}
          disabled={loading || disabled}
          className="flex items-center gap-2 px-3 py-2 rounded bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:hover:bg-blue-50 transition-colors"
          title="Refresh head UTxOs"
        >
          <RefreshCw className={`w-4 h-4 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium text-blue-700">Refresh</span>
        </button>
      </div>

      {/* Balance Display */}
      <div className="mb-4 p-3 bg-blue-50 rounded">
        <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
          <Coins className="w-4 h-4" />
          <span>Balance in Head:</span>
        </div>
        <div className="text-2xl font-bold text-blue-600">
          {formatLovelace(totalBalance)}
        </div>
        <div className="text-xs text-gray-700 mt-1">
          {Object.keys(headUtxos).length} UTxO(s)
        </div>
      </div>

      {/* Transaction Form */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            disabled={disabled || isSending}
            placeholder="addr_test1..."
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-sm font-mono placeholder:text-gray-400 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount (ADA)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={disabled || isSending}
            placeholder="10"
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 placeholder:text-gray-400 text-gray-900"
          />
        </div>

        <button
          onClick={handleSendTransaction}
          disabled={disabled || isSending || !recipientAddress || !amount || Object.keys(headUtxos).length === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
        >
          <Send className="w-4 h-4" />
          {isSending ? 'Sending...' : 'Send Transaction'}
        </button>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`mt-4 p-3 rounded text-sm ${
          message.includes('Error') || message.includes('❌') 
            ? 'bg-red-50 text-red-700 border border-red-200' 
            : message.includes('✅')
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {message}
        </div>
      )}

      {/* UTxO List */}
      {Object.keys(headUtxos).length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-semibold text-gray-800 mb-2">UTxOs in Head:</div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {Object.entries(headUtxos).map(([key, utxo]) => (
              <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                <span className="font-mono text-gray-800 truncate flex-1" title={key}>
                  {key.substring(0, 20)}...
                </span>
                <span className="font-semibold text-gray-900 ml-2">
                  {formatLovelace(utxo.value?.lovelace || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
