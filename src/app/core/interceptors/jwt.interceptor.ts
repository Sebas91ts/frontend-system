import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor que adjunta el JWT como Bearer token y conserva withCredentials
 * para compatibilidad con endpoints que aún usen cookies.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('systembpm_auth_token');
  const authReq = req.clone({
    withCredentials: true,
    setHeaders: token ? { Authorization: `Bearer ${token}` } : {}
  });

  return next(authReq);
};
