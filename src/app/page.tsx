'use client';

import { useState } from 'react';
import NodeControl from '@/components/NodeControl';
import HydraHeadControl from '@/components/HydraHeadControl';
import DataManagement from '@/components/DataManagement';
import { Settings, Info } from 'lucide-react';

export default function Home() {
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState({
    persistenceDir: '~/persistence',
    nodeSocket: '/home/g1bssq/node.socket',
    testnetMagic: '1',
    protocolParameters: 'protocol-parameters.json',
    workingDir: process.cwd(),
    hydraScriptsTxId: '',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Hydra Toolkit</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage Hydra Head protocol nodes without command-line
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://hydra.family/head-protocol/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                <Info className="w-4 h-4" />
                Documentation
              </a>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Node Socket Path
                </label>
                <input
                  type="text"
                  value={config.nodeSocket}
                  onChange={(e) => setConfig({ ...config, nodeSocket: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Testnet Magic
                </label>
                <input
                  type="text"
                  value={config.testnetMagic}
                  onChange={(e) => setConfig({ ...config, testnetMagic: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Protocol Parameters File
                </label>
                <input
                  type="text"
                  value={config.protocolParameters}
                  onChange={(e) => setConfig({ ...config, protocolParameters: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Working Directory
                </label>
                <input
                  type="text"
                  value={config.workingDir}
                  onChange={(e) => setConfig({ ...config, workingDir: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Before starting nodes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Make sure you have <code className="bg-blue-100 px-1 rounded">hydra-node</code> and <code className="bg-blue-100 px-1 rounded">cardano-node</code> installed</li>
                <li>Ensure you have the required credentials in the <code className="bg-blue-100 px-1 rounded">credentials/</code> directory</li>
                <li>Have <code className="bg-blue-100 px-1 rounded">protocol-parameters.json</code> in your working directory</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Node Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <NodeControl
            nodeId="cardano"
            title="Cardano Node"
            config={config}
          />
          <NodeControl
            nodeId="alice"
            title="Alice Node"
            config={config}
          />
          <NodeControl
            nodeId="bob"
            title="Bob Node"
            config={config}
          />
        </div>

        {/* Data Management */}
        <div className="mb-6">
          <DataManagement />
        </div>

        {/* Hydra Head Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HydraHeadControl nodeId="alice" port={4001} />
          <HydraHeadControl nodeId="bob" port={4002} />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-600">
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
