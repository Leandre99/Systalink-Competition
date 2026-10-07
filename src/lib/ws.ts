type WSStatus = 'connecting' | 'connected' | 'reconnecting' | 'async_fallback' | 'disconnected';

export interface WSMessage {
  type: string;
  [key: string]: any;
}

export class CodeFlashWS {
  private ws: WebSocket | null = null;
  private url: string;
  private roomId: string;
  private userId: string;
  private userName: string;
  private onMessageCallback: (msg: WSMessage) => void;
  private onStatusChangeCallback: (status: WSStatus) => void;
  
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimer: any = null;
  private status: WSStatus = 'disconnected';

  constructor(
    roomId: string,
    userId: string,
    userName: string,
    onMessage: (msg: WSMessage) => void,
    onStatusChange: (status: WSStatus) => void
  ) {
    this.roomId = roomId;
    this.userId = userId;
    this.userName = userName;
    this.onMessageCallback = onMessage;
    this.onStatusChangeCallback = onStatusChange;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.url = `${protocol}//${host}/ws`;
  }

  public connect() {
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('connected');
        this.send({
          type: 'join_room',
          roomId: this.roomId,
          userId: this.userId,
          userName: this.userName,
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.onMessageCallback(msg);
        } catch (err) {
          console.warn('Erreur lecture message WS:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('Erreur WebSocket CodeFlash:', err);
      };

      this.ws.onclose = () => {
        if (this.status !== 'async_fallback') {
          this.handleReconnect();
        }
      };
    } catch (err) {
      this.handleReconnect();
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus('async_fallback');
      return;
    }

    this.reconnectAttempts++;
    this.setStatus('reconnecting');
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 8000);

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  public send(msg: WSMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public setStatus(status: WSStatus) {
    this.status = status;
    this.onStatusChangeCallback(status);
  }

  public disconnect() {
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }
}
