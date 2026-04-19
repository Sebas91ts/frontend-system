import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly authService = inject(AuthService);
  protected readonly title = signal('frontend-system');

  ngOnInit(): void {
    this.authService.restoreSession().subscribe();
  }
}
