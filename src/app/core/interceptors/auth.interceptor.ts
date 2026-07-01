import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError, filter, take } from 'rxjs';

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
          if (!authService.isRefreshing) {
            authService.isRefreshing = true;
            authService.refreshTokenSubject.next(null);

            return authService.refreshAccessToken().pipe(
              switchMap((newAccess) => {
                authService.isRefreshing = false;
                if (!newAccess) {
                  authService.handleUnauthorized();
                  return throwError(() => error);
                }
                authService.refreshTokenSubject.next(newAccess);
                const retryReq = req.clone({
                  setHeaders: { Authorization: `Bearer ${newAccess}` },
                });
                return next(retryReq);
              }),
              catchError((refreshErr) => {
                authService.isRefreshing = false;
                authService.handleUnauthorized();
                return throwError(() => refreshErr);
              })
            );
          } else {
            // Wait while refreshing is in progress
            return authService.refreshTokenSubject.pipe(
              filter(token => token != null),
              take(1),
              switchMap(token => {
                const retryReq = req.clone({
                  setHeaders: { Authorization: `Bearer ${token}` }
                });
                return next(retryReq);
              })
            );
          }
        } else {
          authService.handleUnauthorized();
        }
      }
      return throwError(() => error);
    }),
  );
};
