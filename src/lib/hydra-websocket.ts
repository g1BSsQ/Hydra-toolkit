export type HydraMessage = 
  | { tag: 'Greetings'; me: any; headStatus?: string }
  | { tag: 'PeerConnected'; peer: string }
  | { tag: 'PeerDisconnected'; peer: string }
  | { tag: 'HeadIsInitializing'; parties: string[]; headId: string }
  | { tag: 'Committed'; party: string; utxo: any }
  | { tag: 'HeadIsOpen'; utxo: any; headId: string }
  | { tag: 'HeadIsClosed'; snapshotNumber: number; contestationDeadline: string }
  | { tag: 'ReadyToFanout' }
  | { tag: 'HeadIsFinalized'; utxo: any }
  | { tag: 'HeadIsAborted'; utxo: any }
  | { tag: 'TxValid'; transactionId: string }
  | { tag: 'TxInvalid'; transactionId: string; validationError: any }
  | { tag: 'SnapshotConfirmed'; snapshot: any; signatures: any }
  | { tag: 'DecommitRequested'; decommitTx: any; utxoToDecommit: any }
  | { tag: 'DecommitApproved'; decommitTxId: string }
  | { tag: 'DecommitFinalized'; decommitTxId: string }
  | { tag: 'InvalidInput'; reason: string; input?: any }
  | { tag: 'CommandFailed'; clientInput: any };

export type HydraCommand =
  | { tag: 'Init' }
  | { tag: 'Abort' }
  | { tag: 'NewTx'; transaction: any }
  | { tag: 'Close' }
  | { tag: 'Contest'; snapshotNumber: number }
  | { tag: 'Fanout' }
  | { tag: 'Decommit'; decommitTx: any }
  | { tag: 'Recover' }
  | { tag: 'SideLoadSnapshot'; snapshot: any };

export class HydraWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private messageHandlers: ((message: HydraMessage) => void)[] = [];
  private connectionHandlers: ((connected: boolean) => void)[] = [];

  constructor(apiUrl: string) {
    this.url = apiUrl;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('Hydra WebSocket connected');
        this.reconnectAttempts = 0;
        this.notifyConnectionHandlers(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: HydraMessage = JSON.parse(event.data);
          this.notifyMessageHandlers(message);
        } catch (error) {
          console.error('Failed to parse Hydra message:', error);
        }
      };

      this.ws.onerror = (error) => {
        // Silently handle WebSocket errors - connection status will be handled by onclose
        // This prevents console spam when nodes aren't running
      };

      this.ws.onclose = () => {
        console.log('Hydra WebSocket disconnected');
        this.notifyConnectionHandlers(false);
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to connect to Hydra WebSocket:', error);
    }
  }

  disconnect() {
    this.maxReconnectAttempts = 0; // Prevent reconnection attempts
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  sendCommand(command: HydraCommand) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    this.ws.send(JSON.stringify(command));
  }

  // Command helpers
  init() {
    this.sendCommand({ tag: 'Init' });
  }

  abort() {
    this.sendCommand({ tag: 'Abort' });
  }

  newTx(transaction: any) {
    this.sendCommand({ tag: 'NewTx', transaction });
  }

  close() {
    this.sendCommand({ tag: 'Close' });
  }

  contest(snapshotNumber: number) {
    this.sendCommand({ tag: 'Contest', snapshotNumber });
  }

  fanout() {
    this.sendCommand({ tag: 'Fanout' });
  }

  decommit(decommitTx: any) {
    this.sendCommand({ tag: 'Decommit', decommitTx });
  }

  recover() {
    this.sendCommand({ tag: 'Recover' });
  }

  onMessage(handler: (message: HydraMessage) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  onConnectionChange(handler: (connected: boolean) => void) {
    this.connectionHandlers.push(handler);
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter(h => h !== handler);
    };
  }

  private notifyMessageHandlers(message: HydraMessage) {
    this.messageHandlers.forEach(handler => handler(message));
  }

  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach(handler => handler(connected));
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.maxReconnectAttempts > 0) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(), this.reconnectDelay);
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
