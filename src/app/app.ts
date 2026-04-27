import { Component, OnInit, signal, inject } from '@angular/core';
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

  ngOnInit(): void {
    this.uiPreferences.theme();
    this.authService.restoreSession().subscribe();
  }
}
