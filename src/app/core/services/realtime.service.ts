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
  private extraSubscriptions = new Map<string, { id: string; count: number }>();
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

  subscribeToTopic(destination: string): () => void {
    if (!destination) {
      return () => undefined;
    }

    const existing = this.extraSubscriptions.get(destination);
    if (existing) {
      existing.count += 1;
      return () => this.unsubscribeFromTopic(destination);
    }

    const subscription = {
      id: this.nextSubscriptionId(),
      count: 1,
    };
    this.extraSubscriptions.set(destination, subscription);

    if (this.connected) {
      this.sendSubscribe(destination, subscription.id);
      return () => this.unsubscribeFromTopic(destination);
    }

    this.pendingSubscriptions.push(destination);
    return () => this.unsubscribeFromTopic(destination);
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
      const subscription = this.extraSubscriptions.get(destination);
      if (subscription) {
        this.sendSubscribe(destination, subscription.id);
      }
    }
    this.pendingSubscriptions = [];
  }

  private unsubscribeFromTopic(destination: string): void {
    const subscription = this.extraSubscriptions.get(destination);
    if (!subscription) {
      return;
    }

    subscription.count -= 1;
    if (subscription.count > 0) {
      return;
    }

    this.extraSubscriptions.delete(destination);
    this.pendingSubscriptions = this.pendingSubscriptions.filter((item) => item !== destination);

    if (this.connected) {
      this.sendFrame(`UNSUBSCRIBE\nid:${subscription.id}\n\n\0`);
    }
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
