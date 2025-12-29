'use client';

import { useState } from 'react';
import NodeControl from '@/components/NodeControl';
import HydraHeadControl from '@/components/HydraHeadControl';
import DataManagement from '@/components/DataManagement';
import KeyGeneration from '@/components/KeyGeneration';
import CommitManager from '@/components/CommitManager';
import TransactionManager from '@/components/TransactionManager';
import { Settings } from 'lucide-react';

interface NodeStatus {
  running: boolean;
  startTime?: string;
  pid?: number;
  port?: number;
}

export default function Home() {
  const [showSettings, setShowSettings] = useState(false);
  const [cardanoNodeStatus, setCardanoNodeStatus] = useState<NodeStatus>({ running: false });
  const [aliceNodeStatus, setAliceNodeStatus] = useState<NodeStatus>({ running: false });
  const [bobNodeStatus, setBobNodeStatus] = useState<NodeStatus>({ running: false });
  const [config, setConfig] = useState(() => {
    // Try to load from localStorage first
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hydra-config');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved config:', e);
        }
      }
    }
    
    // Default config - uses environment variables if available
    return {
      persistenceDir: process.env.NEXT_PUBLIC_PERSISTENCE_DIR || '~/persistence',
      nodeSocket: process.env.NEXT_PUBLIC_NODE_SOCKET || '/home/g1bssq/node.socket',
      testnetMagic: process.env.NEXT_PUBLIC_TESTNET_MAGIC || '1',
      protocolParameters: process.env.NEXT_PUBLIC_PROTOCOL_PARAMETERS || '/home/g1bssq/protocol-parameters.json',
      cardanoConfig: process.env.NEXT_PUBLIC_CARDANO_CONFIG || '/home/g1bssq/config.json',
      cardanoTopology: process.env.NEXT_PUBLIC_CARDANO_TOPOLOGY || '/home/g1bssq/topology.json',
      cardanoDbPath: process.env.NEXT_PUBLIC_CARDANO_DB_PATH || '/home/g1bssq/db',
      credentialsPath: process.env.NEXT_PUBLIC_CREDENTIALS_PATH || '~/credentials',
      workingDir: process.cwd(),
      hydraScriptsTxId: process.env.NEXT_PUBLIC_HYDRA_SCRIPTS_TX_ID || '',
    };
  });

  // Save config to localStorage whenever it changes
  const updateConfig = (newConfig: typeof config) => {
    setConfig(newConfig);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hydra-config', JSON.stringify(newConfig));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Hydra Toolkit</h1>
              <p className="text-sm text-gray-800 mt-1">
                Manage Hydra Head protocol nodes without command-line
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6 bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Configuration</h2>
            
            <div className="mb-6">
              <h3 className="text-md font-semibold text-gray-700 mb-3">Cardano Node Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Config File Path
                  </label>
                  <input
                    type="text"
                    value={config.cardanoConfig}
                    onChange={(e) => updateConfig({ ...config, cardanoConfig: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-600"
                    placeholder="e.g., /home/user/config.json"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Topology File Path
                  </label>
                  <input
                    type="text"
                    value={config.cardanoTopology}
                    onChange={(e) => updateConfig({ ...config, cardanoTopology: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-600"
                    placeholder="e.g., /home/user/topology.json"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Database Path
                  </label>
                  <input
                    type="text"
                    value={config.cardanoDbPath}
                    onChange={(e) => updateConfig({ ...config, cardanoDbPath: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-600"
                    placeholder="e.g., /home/user/db"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Node Socket Path
                  </label>
                  <input
                    type="text"
                    value={config.nodeSocket}
                    onChange={(e) => updateConfig({ ...config, nodeSocket: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-600"
                    placeholder="e.g., /home/user/node.socket"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-md font-semibold text-gray-700 mb-3">Hydra Node Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Testnet Magic
                  </label>
                  <input
                    type="text"
                    value={config.testnetMagic}
                    onChange={(e) => updateConfig({ ...config, testnetMagic: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-600"
                    placeholder="e.g., 1 (for preprod)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Protocol Parameters File
                  </label>
                  <input
                    type="text"
                    value={config.protocolParameters}
                    onChange={(e) => updateConfig({ ...config, protocolParameters: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-600"
                    placeholder="e.g., /home/user/protocol-parameters.json"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credentials Directory Path
                  </label>
                  <input
                    type="text"
                    value={config.credentialsPath}
                    onChange={(e) => updateConfig({ ...config, credentialsPath: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-600"
                    placeholder="e.g., ~/credentials or /home/user/keys"
                  />
                  <p className="text-xs text-gray-800 mt-1">
                    Path to directory containing Alice and Bob keys
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Generation */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">0. Key Generation</h2>
          <KeyGeneration credentialsPath={config.credentialsPath} />
        </div>

        {/* Cardano Node Control */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Cardano Node (Bắt buộc)</h2>
          <NodeControl
            nodeId="cardano"
            title="Cardano Node (Preprod Testnet)"
            config={config}
            onStatusChange={setCardanoNodeStatus}
          />
        </div>

        {/* Hydra Node Controls */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">2. Hydra Nodes</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <NodeControl
              nodeId="alice"
              title="Alice Node"
              config={config}
              onStatusChange={setAliceNodeStatus}
            />
            <NodeControl
              nodeId="bob"
              title="Bob Node"
              config={config}
              onStatusChange={setBobNodeStatus}
            />
          </div>
        </div>

        {/* Hydra Head Controls */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">3. Commit UTxOs to Head</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CommitManager 
              participant="alice" 
              credentialsPath={config.credentialsPath}
              disabled={!aliceNodeStatus.running}
              cardanoNodeRunning={cardanoNodeStatus.running}
            />
            <CommitManager 
              participant="bob" 
              credentialsPath={config.credentialsPath}
              disabled={!bobNodeStatus.running}
              cardanoNodeRunning={cardanoNodeStatus.running}
            />
          </div>
        </div>

        {/* Hydra Head WebSocket Control */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">4. Hydra Head WebSocket Control</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HydraHeadControl nodeId="alice" port={4001} />
            <HydraHeadControl nodeId="bob" port={4002} />
          </div>
        </div>

        {/* Transaction Manager */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">5. Send Transactions in Head</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TransactionManager 
              participant="alice"
              credentialsPath={config.credentialsPath}
              apiPort={4001}
            />
            <TransactionManager 
              participant="bob"
              credentialsPath={config.credentialsPath}
              apiPort={4002}
            />
          </div>
        </div>

        {/* Data Management */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">6. Data Management</h2>
          <DataManagement />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-800">
            <p>Built with Next.js for the Hydra Head protocol</p>
            <p className="mt-1">
              <a 
                href="https://hydra.family/head-protocol/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                Learn more about Hydra
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
