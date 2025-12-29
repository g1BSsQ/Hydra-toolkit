'use client';

import { useState, useEffect, useRef } from 'react';
import { HydraWebSocketClient, HydraMessage } from '@/lib/hydra-websocket';
import { Send, Trash2, CheckCircle, XCircle, Activity } from 'lucide-react';

interface HydraHeadControlProps {
  nodeId: 'alice' | 'bob';
  port: number;
}

export default function HydraHeadControl({ nodeId, port }: HydraHeadControlProps) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<HydraMessage[]>([]);
  const [headState, setHeadState] = useState<string>('Idle');
  const [customCommand, setCustomCommand] = useState('');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [hasCommitted, setHasCommitted] = useState(false);
  const [hasClosed, setHasClosed] = useState(false);
  const clientRef = useRef<HydraWebSocketClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      if (!isConnected) {
        // Auto-reconnect after 3 seconds
        reconnectTimerRef.current = setTimeout(() => {
          console.log(`[${nodeId}] Attempting to reconnect...`);
          connectToNode();
        }, 3000);
      }
    });

    client.connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      unsubscribeMessage();
      unsubscribeConnection();
      client.disconnect();
    };
  };

  const disconnectFromNode = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
      setConnected(false);
    }
  };

  // Auto-connect on mount
  useEffect(() => {
    const cleanup = connectToNode();
    return cleanup;
  }, [port]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const updateHeadState = (message: HydraMessage) => {
    switch (message.tag) {
      case 'Greetings':
        // Sync state from Greetings message
        if (message.headStatus) {
          const status = message.headStatus;
          if (status === 'Idle') {
            setHeadState('Idle');
          } else if (status === 'Initializing') {
            setHeadState('Initializing');
            setHasInitialized(true);
          } else if (status === 'Open') {
            setHeadState('Open');
            setHasInitialized(true);
            setHasCommitted(true);
          } else if (status === 'Closed') {
            setHeadState('Closed');
            setHasInitialized(true);
            setHasCommitted(true);
            setHasClosed(true);
          } else if (status === 'Final') {
            setHeadState('Finalized');
            setHasInitialized(true);
            setHasCommitted(true);
            setHasClosed(true);
          }
        }
        break;
      case 'HeadIsInitializing':
        setHeadState('Initializing');
        setHasInitialized(true);
        break;
      case 'Committed':
        setHasCommitted(true);
        break;
      case 'HeadIsOpen':
        setHeadState('Open');
        setHasInitialized(true);
        setHasCommitted(true);
        break;
      case 'HeadIsClosed':
        setHeadState('Closed');
        setHasClosed(true);
        break;
      case 'HeadIsFinalized':
        setHeadState('Finalized');
        break;
      case 'HeadIsAborted':
        setHeadState('Aborted');
        // Reset states on abort
        setHasInitialized(false);
        setHasCommitted(false);
        setHasClosed(false);
        break;
      case 'ReadyToFanout':
        setHeadState('Ready to Fanout');
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
    // Reset workflow states when clearing messages
    setHasInitialized(false);
    setHasCommitted(false);
    setHasClosed(false);
    setHeadState('Idle');
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

      {/* Connection Status Info */}
      {!connected && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
          <p className="font-semibold">Waiting for connection...</p>
          <p className="mt-1">Make sure the {nodeId} node is running. Will auto-reconnect every 3 seconds.</p>
        </div>
      )}

      {/* Commit Info */}
      {connected && headState === 'Initializing' && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-300 rounded text-blue-800 text-sm">
          <p className="font-semibold">Head is Initializing - Commit Required</p>
          <p className="mt-1">Use the "Commit Alice/Bob" buttons in the Commit UTxOs section below.</p>
        </div>
      )}

      {/* Command Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => handleCommand(() => clientRef.current?.init())}
          disabled={!connected || hasInitialized}
          className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
          title={hasInitialized ? "Head already initialized" : "Initialize head"}
        >
          Init
        </button>
        <button
          onClick={() => handleCommand(() => clientRef.current?.close())}
          disabled={!connected || headState !== 'Open'}
          className="px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
          title={headState !== 'Open' ? "Head must be open" : "Close head"}
        >
          Close
        </button>
        <button
          onClick={() => handleCommand(() => clientRef.current?.fanout())}
          disabled={!connected || headState !== 'Ready to Fanout'}
          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
          title={headState !== 'Ready to Fanout' ? "Wait for ReadyToFanout message" : "Fanout funds"}
        >
          Fanout
        </button>
        <button
          onClick={() => handleCommand(() => clientRef.current?.abort())}
          disabled={!connected || headState === 'Open' || headState === 'Closed' || headState === 'Finalized'}
          className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
          title={headState === 'Open' || headState === 'Closed' ? "Cannot abort after head is open" : "Abort initialization"}
        >
          Abort
        </button>
        <button
          onClick={() => handleCommand(() => clientRef.current?.recover())}
          disabled={!connected}
          className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
          title="Recover head state from persistence"
        >
          Recover
        </button>
        <button
          onClick={() => {
            const decommitTx = prompt('Enter decommit transaction JSON:');
            if (decommitTx) {
              try {
                const tx = JSON.parse(decommitTx);
                handleCommand(() => clientRef.current?.decommit(tx));
              } catch (e) {
                alert('Invalid JSON format');
              }
            }
          }}
          disabled={!connected || headState !== 'Open'}
          className="px-3 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
          title={headState !== 'Open' ? "Head must be open" : "Decommit UTxO from head"}
        >
          Decommit
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
            placeholder='{"tag": "Recover"}'
            disabled={!connected}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-sm text-gray-900"
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
            className="text-sm text-gray-800 hover:text-gray-900 flex items-center gap-1 font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto p-3 space-y-2">
          {messages.length === 0 ? (
            <div className="text-center text-gray-700 text-sm py-4 font-medium">
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
                  <pre className="text-gray-800 font-medium mt-1 overflow-x-auto">
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
