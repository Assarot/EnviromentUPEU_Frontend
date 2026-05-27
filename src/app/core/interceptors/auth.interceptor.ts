import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const accessToken = authService.getAccessToken();

  // Rutas públicas que NO necesitan token
  const publicRoutes = [
    '/microservice-auth/api/auth/login',
    '/microservice-auth/api/auth/login/remember',
    '/microservice-auth/api/auth/register',
    '/microservice-auth/api/auth/refresh',
  ];

  // No agregar token a las rutas públicas
  const isPublicRoute = publicRoutes.some((route) => req.url.includes(route));
  if (isPublicRoute) {
    return next(req);
  }

  const authReq = accessToken
    ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthError = error.status === 401 || error.status === 403;
      if (isAuthError) {
        const refreshToken = authService.getRefreshToken();
        if (refreshToken) {
          return authService.refreshAccessToken().pipe(
            switchMap((newAccess) => {
              if (!newAccess) {
                authService.handleUnauthorized();
                return throwError(() => error);
              }
              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${newAccess}` },
              });
              return next(retryReq);
            }),
            catchError((refreshErr) => {
              authService.handleUnauthorized();
              return throwError(() => refreshErr);
            }),
          );
        } else {
          authService.handleUnauthorized();
        }
      }
      return throwError(() => error);
    }),
  );
};
