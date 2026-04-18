import { inject, Injectable } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard que protege rutas basadas en roles
 * Usa el data.roles de la ruta para verificar permisos
 * 
 * Ejemplo de uso en routes:
 * { 
 *   path: 'admin', 
 *   component: AdminComponent, 
 *   canActivate: [roleGuard], 
 *   data: { roles: ['ROLE_ADMIN'] } 
 * }
 */
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Obtener roles requeridos de la configuración de la ruta
  const expectedRoles = route.data['roles'] as string[];

  // Si no hay roles definidos, permitir acceso (solo requiere auth)
  if (!expectedRoles || expectedRoles.length === 0) {
    return true;
  }

  // Verificar si el usuario tiene al menos uno de los roles requeridos
  const hasRole = expectedRoles.some(role => authService.hasRole(role));

  if (hasRole) {
    return true;
  }

  // Si no tiene el rol, redirigir según su rol actual
  if (authService.isAdmin()) {
    router.navigate(['/admin']);
  } else {
    router.navigate(['/user']);
  }
  
  return false;
};
