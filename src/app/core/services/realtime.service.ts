import { Injectable, Inject } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Usuario } from '../models/auth.models';
import { RealtimeEvent } from '../models/realtime.models';

@Injectable({
  providedIn: 'root',
})
export class RealtimeService {
  private socket: WebSocket | null = null;
  private connected = false;
  private activeUserId: string | null = null;
  private subscriptionCounter = 0;
  private extraSubscriptions = new Map<string, string>();
  private pendingSubscriptions: string[] = [];
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly eventSubject = new Subject<RealtimeEvent>();

  readonly events$: Observable<RealtimeEvent> = this.eventSubject.asObservable();

  constructor(@Inject(API_BASE_URL) private readonly apiUrl: string) {}

  connectForUser(user: Usuario | null): void {
    if (!user?.id) {
      this.disconnect();
      return;
    }

    const sameUser = this.activeUserId === user.id && this.socket;
    this.activeUserId = user.id;

    if (sameUser) {
      return;
    }

    this.disconnect(false);
    this.openSocket(user);
  }

  disconnect(clearUser = true): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // noop
      }
    }

    this.socket = null;
    this.connected = false;
    this.subscriptionCounter = 0;
    this.extraSubscriptions.clear();
    this.pendingSubscriptions = [];

    if (clearUser) {
      this.activeUserId = null;
    }
  }

  subscribeToTopic(destination: string): void {
    if (!destination || this.extraSubscriptions.has(destination)) {
      return;
    }

    const subscriptionId = this.nextSubscriptionId();
    this.extraSubscriptions.set(destination, subscriptionId);

    if (this.connected) {
      this.sendSubscribe(destination, subscriptionId);
      return;
    }

    this.pendingSubscriptions.push(destination);
  }

  private openSocket(user: Usuario): void {
    const wsUrl = this.toWebSocketUrl(this.apiUrl);
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.sendFrame('CONNECT\naccept-version:1.2\nheart-beat:10000,10000\n\n\0');
    };

    this.socket.onmessage = (event) => {
      this.handleRawFrame(String(event.data ?? ''));
    };

    this.socket.onclose = () => {
      const currentUserId = this.activeUserId;
      this.connected = false;
      this.socket = null;

      if (currentUserId) {
        this.reconnectTimeout = setTimeout(() => {
          if (this.activeUserId === currentUserId) {
            this.openSocket(user);
          }
        }, 3000);
      }
    };
  }

  private handleRawFrame(rawData: string): void {
    const frames = rawData
      .split('\0')
      .map((frame) => frame.trim())
      .filter(Boolean);

    for (const frame of frames) {
      if (frame.startsWith('CONNECTED')) {
        this.connected = true;
        this.subscribeBaseTopics();
        this.flushPendingSubscriptions();
        continue;
      }

      if (!frame.startsWith('MESSAGE')) {
        continue;
      }

      const bodyStart = frame.indexOf('\n\n');
      if (bodyStart < 0) {
        continue;
      }

      const body = frame.substring(bodyStart + 2).trim();
      if (!body) {
        continue;
      }

      try {
        this.eventSubject.next(JSON.parse(body) as RealtimeEvent);
      } catch (error) {
        console.error('[RealtimeService] No se pudo parsear evento STOMP', error, body);
      }
    }
  }

  private subscribeBaseTopics(): void {
    if (!this.socket || !this.activeUserId) {
      return;
    }

    this.sendSubscribe(`/topic/notifications/${this.activeUserId}`, this.nextSubscriptionId());
  }

  private flushPendingSubscriptions(): void {
    for (const destination of this.pendingSubscriptions) {
      const subscriptionId = this.extraSubscriptions.get(destination);
      if (subscriptionId) {
        this.sendSubscribe(destination, subscriptionId);
      }
    }
    this.pendingSubscriptions = [];
  }

  private sendSubscribe(destination: string, subscriptionId: string): void {
    this.sendFrame(`SUBSCRIBE\nid:${subscriptionId}\ndestination:${destination}\n\n\0`);
  }

  private sendFrame(frame: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.socket.send(frame);
  }

  private nextSubscriptionId(): string {
    this.subscriptionCounter += 1;
    return `sub-${this.subscriptionCounter}`;
  }

  private toWebSocketUrl(apiUrl: string): string {
    const origin = apiUrl.replace(/\/api\/?$/, '');
    if (origin.startsWith('https://')) {
      return `${origin.replace('https://', 'wss://')}/ws`;
    }
    return `${origin.replace('http://', 'ws://')}/ws`;
  }
}
