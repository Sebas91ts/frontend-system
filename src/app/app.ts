import { Component, HostListener, OnInit, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { NotificationBellComponent } from './shared/components/notification-bell/notification-bell.component';
import { UiPreferencesService } from './core/services/ui-preferences.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationBellComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly uiPreferences = inject(UiPreferencesService);
  protected readonly title = signal('frontend-system');
  protected readonly isOnline = signal(typeof navigator === 'undefined' ? true : navigator.onLine);

  ngOnInit(): void {
    this.uiPreferences.theme();
  }

  @HostListener('window:online')
  protected markOnline(): void {
    this.isOnline.set(true);
  }

  @HostListener('window:offline')
  protected markOffline(): void {
    this.isOnline.set(false);
  }
}
