import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Guard que protege rutas basadas en roles.
 */
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const expectedRoles = route.data['roles'] as string[];

  return authService.ensureSession().pipe(
    map(isAuthenticated => {
      if (!isAuthenticated) {
        return router.createUrlTree(['/auth/login'], {
          queryParams: { returnUrl: state.url }
        });
      }

      if (!expectedRoles || expectedRoles.length === 0) {
        return true;
      }

      const hasRole = expectedRoles.some(role => authService.hasRole(role));
      if (hasRole) {
        return true;
      }

      return router.createUrlTree(authService.getLandingRoute());
    })
  );
};
