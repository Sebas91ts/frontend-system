import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-role-landing-redirect',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
      <div class="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-sm text-slate-300">
        Redirigiendo...
      </div>
    </div>
  `,
})
export class RoleLandingRedirectComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    void this.router.navigate(this.authService.getLandingRoute());
  }
}
