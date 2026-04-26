import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { finalize, forkJoin } from 'rxjs';
import { NotificationItem } from '../../../core/models/notification.models';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { RealtimeService } from '../../../core/services/realtime.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.css',
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly cdr = inject(ChangeDetectorRef);
  private eventsSubscription?: { unsubscribe: () => void };

  protected isOpen = false;
  protected isLoading = false;
  protected isRefreshing = false;
  protected errorMessage = '';
  protected items: NotificationItem[] = [];
  protected unreadCount = 0;

  ngOnInit(): void {
    this.eventsSubscription = this.realtimeService.events$.subscribe((event) => {
      if (event.type === 'NOTIFICATION') {
        this.refresh();
      }
    });
    this.refresh();
  }

  ngOnDestroy(): void {
    this.eventsSubscription?.unsubscribe();
  }

  protected get isVisible(): boolean {
    return !!this.authService.currentUser();
  }

  protected togglePanel(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.refresh();
    }
  }

  protected refresh(): void {
    if (!this.isVisible) {
      return;
    }

    const initialLoad = !this.items.length && !this.isOpen;
    this.isLoading = initialLoad;
    this.isRefreshing = !initialLoad;
    this.errorMessage = '';
    this.cdr.detectChanges();

    forkJoin({
      notifications: this.notificationService.listarMias(),
      unread: this.notificationService.obtenerNoLeidas(),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.isRefreshing = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: ({ notifications, unread }) => {
          this.items = notifications.data ?? [];
          this.unreadCount = unread.data?.unreadCount ?? 0;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'No se pudieron cargar las notificaciones.';
          this.cdr.detectChanges();
        },
      });
  }

  protected markAsRead(item: NotificationItem): void {
    if (!item?.id || item.read) {
      return;
    }

    this.notificationService.marcarComoLeida(item.id).subscribe({
      next: () => {
        this.items = this.items.map((current) =>
          current.id === item.id ? { ...current, read: true } : current,
        );
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'No se pudo marcar la notificacion como leida.';
        this.cdr.detectChanges();
      },
    });
  }

  protected markAllAsRead(): void {
    this.notificationService.marcarTodasComoLeidas().subscribe({
      next: () => {
        this.items = this.items.map((item) => ({ ...item, read: true }));
        this.unreadCount = 0;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'No se pudieron marcar todas como leidas.';
        this.cdr.detectChanges();
      },
    });
  }

  protected formatDate(value?: string | null): string {
    if (!value) {
      return 'Sin fecha';
    }

    return new Date(value).toLocaleString();
  }

  protected trackByNotification(_: number, item: NotificationItem): string {
    return item.id;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const inside = target.closest('.notification-bell');
    if (!inside) {
      this.isOpen = false;
      this.cdr.detectChanges();
    }
  }
}
