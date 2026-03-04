import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, take, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  // Get token from local storage or auth service
  const token = localStorage.getItem('token');

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned).pipe(
      catchError((error: HttpErrorResponse) => {
        // If 401 Unauthorized, try to refresh the token
        if (error.status === 401) {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            return authService.refreshAccessToken().pipe(
              take(1),
              switchMap((response) => {
                // Retry the original request with the new token
                const newToken = response.accessToken;
                const retryReq = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${newToken}`
                  }
                });
                return next(retryReq);
              }),
              catchError(() => {
                // If refresh fails, logout the user
                authService.logout();
                return throwError(() => new Error('Session expired. Please login again.'));
              })
            );
          }
        }
        return throwError(() => error);
      })
    );
  }

  return next(req);
};
