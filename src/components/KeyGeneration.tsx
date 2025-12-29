'use client';

import { useState, useEffect } from 'react';

interface KeyGenProps {
  onKeysGenerated?: () => void;
  credentialsPath?: string;
}

export default function KeyGeneration({ onKeysGenerated, credentialsPath = '~/credentials' }: KeyGenProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [aliceKeys, setAliceKeys] = useState<any>(null);
  const [bobKeys, setBobKeys] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [customPath, setCustomPath] = useState(credentialsPath);

  const generateKeys = async (participant: 'alice' | 'bob') => {
    setLoading(true);
    setMessage(`Generating keys for ${participant}...`);
    
    try {
      const response = await fetch('/api/hydra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'generate-keys',
          participant,
          credentialsPath: customPath
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage(`✅ Keys generated for ${participant}`);
        if (participant === 'alice') {
          setAliceKeys(result.keys);
        } else {
          setBobKeys(result.keys);
        }
        
        // If both keys exist, auto-setup protocol parameters
        if ((participant === 'alice' && bobKeys) || (participant === 'bob' && aliceKeys)) {
          setMessage('✅ Keys generated. Setting up protocol parameters...');
          await setupProtocolParams();
        }
        
        onKeysGenerated?.();
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const setupProtocolParams = async () => {
    try {
      const response = await fetch('/api/hydra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup-protocol-params' }),
      });
      
      const result = await response.json();
      if (result.success) {
        setMessage('✅ All setup complete! Protocol parameters configured.');
      }
    } catch (error) {
      console.error('Failed to setup protocol params:', error);
    }
  };

  const checkExistingKeys = async () => {
    try {
      const response = await fetch(`/api/hydra?action=check-keys&credentialsPath=${encodeURIComponent(customPath)}`);
      const result = await response.json();
      
      if (result.alice) setAliceKeys(result.alice);
      if (result.bob) setBobKeys(result.bob);
      
      if (result.alice || result.bob) {
        setMessage('✅ Found existing keys!');
      } else {
        setMessage('ℹ️ No keys found. Generate new keys to get started.');
      }
    } catch (error) {
      console.error('Failed to check keys:', error);
      setMessage('❌ Failed to check keys. Verify credentials path.');
    }
  };

  const testPath = async () => {
    setLoading(true);
    setMessage('Testing credentials path...');
    await checkExistingKeys();
    setLoading(false);
  };

  useEffect(() => {
    checkExistingKeys();
  }, [customPath]);

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Key Generation</h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-sm px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        >
          {showSettings ? 'Hide' : 'Show'} Settings
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="border rounded p-3 bg-gray-50 space-y-3">
          <h3 className="font-semibold text-sm">Credentials Path Configuration</h3>
          <div className="space-y-2">
            <label className="block text-sm">
              <span className="text-gray-700 font-medium">Path to credentials directory (in WSL):</span>
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
                placeholder="e.g., ~/credentials or /home/user/keys"
              />
            </label>
            <button
              onClick={testPath}
              disabled={loading}
              className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 text-sm"
            >
              Test Path & Check for Existing Keys
            </button>
            <p className="text-xs text-gray-700">
              💡 Tip: If you have keys on another machine, copy the entire credentials directory to this path
            </p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        {/* Alice Keys */}
        <div className="border rounded p-3 space-y-2">
          <h3 className="font-bold text-gray-900">Alice Keys</h3>
          {aliceKeys ? (
            <div className="text-sm space-y-1">
              <div className="text-green-600 font-medium">✅ Keys exist</div>
              <div className="text-xs break-all text-gray-800">
                <strong className="text-gray-900">Node:</strong> <span className="font-mono">{aliceKeys.nodeAddress}</span>
              </div>
              <div className="text-xs break-all text-gray-800">
                <strong className="text-gray-900">Funds:</strong> <span className="font-mono">{aliceKeys.fundsAddress}</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-800 font-medium">No keys found</div>
          )}
          <button
            onClick={() => generateKeys('alice')}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {aliceKeys ? 'Regenerate Alice Keys' : 'Generate Alice Keys'}
          </button>
        </div>

        {/* Bob Keys */}
        <div className="border rounded p-3 space-y-2">
          <h3 className="font-bold text-gray-900">Bob Keys</h3>
          {bobKeys ? (
            <div className="text-sm space-y-1">
              <div className="text-green-600 font-medium">✅ Keys exist</div>
              <div className="text-xs break-all text-gray-800">
                <strong className="text-gray-900">Node:</strong> <span className="font-mono">{bobKeys.nodeAddress}</span>
              </div>
              <div className="text-xs break-all text-gray-800">
                <strong className="text-gray-900">Funds:</strong> <span className="font-mono">{bobKeys.fundsAddress}</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-700 font-medium">No keys found</div>
          )}
          <button
            onClick={() => generateKeys('bob')}
            disabled={loading}
            className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            {bobKeys ? 'Regenerate Bob Keys' : 'Generate Bob Keys'}
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-gray-100 rounded text-sm">
          {message}
        </div>
      )}

      <div className="text-sm text-gray-700 space-y-1">
        <p><strong>Next steps after generating keys:</strong></p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Fund the node addresses with at least 30 tADA each</li>
          <li>Fund the funds addresses with any amount you want to commit</li>
          <li>Use the <a href="https://docs.cardano.org/cardano-testnets/tools/faucet/" target="_blank" className="text-blue-500 underline">Preprod Faucet</a> to get test ADA</li>
        </ol>
        <div className="mt-3 p-2 bg-blue-50 rounded">
          <p className="text-xs">
            <strong>📁 Using keys from another machine?</strong><br/>
            1. Copy the credentials directory from the other machine<br/>
            2. Place it in WSL at the path above (e.g., ~/credentials)<br/>
            3. Click "Test Path & Check for Existing Keys"<br/>
            4. If keys are found, you can skip key generation and go directly to funding!
          </p>
        </div>
      </div>
    </div>
  );
}
