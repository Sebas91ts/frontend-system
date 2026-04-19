import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor que asegura el envío de cookies de sesión al backend.
 * El JWT vive en una cookie HttpOnly, así que no se adjunta manualmente.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authReq = req.clone({
    withCredentials: true
  });

  return next(authReq);
};
