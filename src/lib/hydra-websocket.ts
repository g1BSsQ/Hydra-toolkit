export type HydraMessage = 
  | { tag: 'Greetings'; me: any }
  | { tag: 'PeerConnected'; peer: string }
  | { tag: 'PeerDisconnected'; peer: string }
  | { tag: 'HeadIsInitializing'; parties: string[]; headId: string }
  | { tag: 'Committed'; party: string; utxo: any }
  | { tag: 'HeadIsOpen'; utxo: any; headId: string }
  | { tag: 'HeadIsClosed'; snapshotNumber: number; contestationDeadline: string }
  | { tag: 'HeadIsFinalized'; utxo: any }
  | { tag: 'HeadIsAborted'; utxo: any }
  | { tag: 'TxValid'; transactionId: string }
  | { tag: 'TxInvalid'; transactionId: string; validationError: any }
  | { tag: 'SnapshotConfirmed'; snapshot: any; signatures: any }
  | { tag: 'GetUTxOResponse'; utxo: any }
  | { tag: 'InvalidInput'; reason: string }
  | { tag: 'CommandFailed'; clientInput: any };

export type HydraCommand =
  | { tag: 'Init' }
  | { tag: 'Abort' }
  | { tag: 'Commit'; utxo: any }
  | { tag: 'NewTx'; transaction: any }
  | { tag: 'GetUTxO' }
  | { tag: 'Close' }
  | { tag: 'Contest'; snapshotNumber: number }
  | { tag: 'Fanout' };

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

  commit(utxo: any) {
    this.sendCommand({ tag: 'Commit', utxo });
  }

  newTx(transaction: any) {
    this.sendCommand({ tag: 'NewTx', transaction });
  }

  getUTxO() {
    this.sendCommand({ tag: 'GetUTxO' });
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
