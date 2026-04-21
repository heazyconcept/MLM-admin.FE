import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ModalService } from '../services/modal.service';
import { Router } from '@angular/router';
import { catchError, switchMap, take, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const modalService = inject(ModalService);
  const router = inject(Router);

  // Get token from local storage or auth service
  const token = localStorage.getItem('token');

  // Determine if this request is itself a refresh-token call to avoid recursive refresh
  const isRefreshRequest = req.url.endsWith('auth/refresh');

  const handleLogout = (message: string) => {
    authService.logout();
    modalService.open('error', 'Session Expired', message);
    router.navigate(['/login']);
  };

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next(cloned).pipe(
      catchError((error: HttpErrorResponse) => {
        // If 401 Unauthorized, try to refresh the token — but never for the refresh endpoint itself
        if (error.status === 401 && !isRefreshRequest) {
          const refreshToken = localStorage.getItem('refreshToken');
          
          if (refreshToken) {
            return authService.refreshAccessToken().pipe(
              take(1),
              catchError(() => {
                handleLogout('Your session has expired. Please login again.');
                return throwError(() => new Error('Session expired'));
              }),
              switchMap((response) => {
                // Retry the original request with the new token
                const newToken = response.accessToken;
                const retryReq = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${newToken}`
                  }
                });
                return next(retryReq);
              })
            );
          } else {
            // 401 but no refresh token available
            handleLogout('Session expired. Please login again.');
            return throwError(() => error);
          }
        }
        return throwError(() => error);
      })
    );
  }

  return next(req);
};
