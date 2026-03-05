import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ModalService } from '../services/modal.service';
import { catchError, switchMap, take, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const modalService = inject(ModalService);
  // Get token from local storage or auth service
  const token = localStorage.getItem('token');

  // Determine if this request is itself a refresh-token call to avoid recursive refresh
  const isRefreshRequest = req.url.endsWith('auth/refresh');

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
                // If refresh itself fails, logout the user and show error modal
                authService.logout();
                modalService.open('error', 'Session Expired', 'Your session has expired. Please login again.');
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
          }
        }
        return throwError(() => error);
      })
    );
  }

  return next(req);
};
