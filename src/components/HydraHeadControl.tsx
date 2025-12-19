'use client';

import { useState, useEffect, useRef } from 'react';
import { HydraWebSocketClient, HydraMessage } from '@/lib/hydra-websocket';
import { Send, Trash2, CheckCircle, XCircle, Activity, Plug, PlugZap } from 'lucide-react';

interface HydraHeadControlProps {
  nodeId: 'alice' | 'bob';
  port: number;
}

export default function HydraHeadControl({ nodeId, port }: HydraHeadControlProps) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<HydraMessage[]>([]);
  const [headState, setHeadState] = useState<string>('Idle');
  const [customCommand, setCustomCommand] = useState('');
  const [autoConnect, setAutoConnect] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const clientRef = useRef<HydraWebSocketClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const connectToNode = () => {
    if (clientRef.current?.isConnected()) {
      return;
    }

    setConnectionError(null);
    const client = new HydraWebSocketClient(`ws://127.0.0.1:${port}`);
    clientRef.current = client;

    const unsubscribeMessage = client.onMessage((message) => {
      setMessages(prev => [...prev, message]);
      updateHeadState(message);
      setConnectionError(null);
    });

    const unsubscribeConnection = client.onConnectionChange((isConnected) => {
      setConnected(isConnected);
      if (!isConnected && autoConnect) {
        setConnectionError(`Unable to connect to ${nodeId} node. Make sure the node is running.`);
      }
    });

    client.connect();

    return () => {
      unsubscribeMessage();
      unsubscribeConnection();
      client.disconnect();
    };
  };

  const disconnectFromNode = () => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
      setConnected(false);
      setAutoConnect(false);
    }
  };

  useEffect(() => {
    if (autoConnect) {
      const cleanup = connectToNode();
      return cleanup;
    }
  }, [autoConnect, port]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const updateHeadState = (message: HydraMessage) => {
    switch (message.tag) {
      case 'HeadIsInitializing':
        setHeadState('Initializing');
        break;
      case 'HeadIsOpen':
        setHeadState('Open');
        break;
      case 'HeadIsClosed':
        setHeadState('Closed');
        break;
      case 'HeadIsFinalized':
        setHeadState('Finalized');
        break;
      case 'HeadIsAborted':
        setHeadState('Aborted');
        break;
    }
  };

  const handleCommand = (commandFn: () => void) => {
    try {
      commandFn();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleCustomCommand = () => {
    if (!customCommand.trim()) return;
    try {
      const command = JSON.parse(customCommand);
      clientRef.current?.sendCommand(command);
      setCustomCommand('');
    } catch (error) {
      alert('Invalid JSON command');
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const getMessageIcon = (message: HydraMessage) => {
    switch (message.tag) {
      case 'TxValid':
      case 'HeadIsOpen':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'TxInvalid':
      case 'CommandFailed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 capitalize">
          {nodeId} Head Control
        </h3>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            connected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {connected ? 'Connected' : 'Disconnected'}
          </div>
          <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {headState}
          </div>
        </div>
      </div>

      {/* Connection Control */}
      <div className="mb-4">
        {!connected ? (
          <button
            onClick={() => setAutoConnect(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <Plug className="w-4 h-4" />
            Connect to WebSocket
          </button>
        ) : (
          <button
            onClick={disconnectFromNode}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            <PlugZap className="w-4 h-4" />
            Disconnect
          </button>
        )}
      </div>

      {connectionError && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
          <p className="font-semibold">Connection Error</p>
          <p className="mt-1">{connectionError}</p>
          <p className="mt-2 text-xs">Start the {nodeId} node first, then click "Connect to WebSocket"</p>
        </div>
      )}

      {/* Command Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <button
          onClick={() => handleCommand(() => clientRef.current?.init())}
          disabled={!connected}
          className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
        >
          Init
        </button>
        <button
          onClick={() => handleCommand(() => clientRef.current?.commit({}))}
          disabled={!connected}
          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
        >
          Commit
        </button>
        <button
          onClick={() => handleCommand(() => clientRef.current?.close())}
          disabled={!connected}
          className="px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
        >
          Close
        </button>
        <button
          onClick={() => handleCommand(() => clientRef.current?.fanout())}
          disabled={!connected}
          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
        >
          Fanout
        </button>
        <button
          onClick={() => handleCommand(() => clientRef.current?.abort())}
          disabled={!connected}
          className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
        >
          Abort
        </button>
        <button
          onClick={() => handleCommand(() => clientRef.current?.getUTxO())}
          disabled={!connected}
          className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
        >
          Get UTxO
        </button>
      </div>

      {/* Custom Command */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Custom Command (JSON)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customCommand}
            onChange={(e) => setCustomCommand(e.target.value)}
            placeholder='{"tag": "GetUTxO"}'
            disabled={!connected}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-sm"
          />
          <button
            onClick={handleCustomCommand}
            disabled={!connected || !customCommand.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>

      {/* Messages Log */}
      <div className="border border-gray-200 rounded-md">
        <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700">Messages ({messages.length})</h4>
          <button
            onClick={clearMessages}
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto p-3 space-y-2">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-4">
              No messages yet. Connect to start receiving messages.
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 bg-gray-50 rounded text-xs"
              >
                {getMessageIcon(message)}
                <div className="flex-1 font-mono">
                  <div className="font-semibold text-gray-800">{message.tag}</div>
                  <pre className="text-gray-600 mt-1 overflow-x-auto">
                    {JSON.stringify(message, null, 2)}
                  </pre>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
