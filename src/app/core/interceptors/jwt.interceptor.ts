import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor que agrega el token JWT a todas las peticiones HTTP
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Si hay token, lo agregamos al header
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: token
      }
    });
    return next(authReq);
  }

  return next(req);
};
