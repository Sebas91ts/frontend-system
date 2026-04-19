import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Guard que protege rutas que requieren autenticación.
 * Si no hay sesión cargada, intenta restaurarla antes de decidir.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.ensureSession().pipe(
    map(isAuthenticated => {
      if (isAuthenticated) {
        return true;
      }

      return router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url }
      });
    })
  );
};
