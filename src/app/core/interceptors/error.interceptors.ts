import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ModalService } from '../services/modal.service';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const modalService = inject(ModalService);
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.error instanceof ErrorEvent) {
        modalService.open('error', 'Error', `Error: ${error.error.message}`);
        return throwError(() => error);
      }

      if (error.status === 401) {
        return throwError(() => error);
      }

      if (authService.isPasswordChangeRequiredError(error)) {
        authService.setMustChangePassword(true);
        if (!router.url.startsWith('/change-password')) {
          router.navigate(['/change-password']);
        }
        return throwError(() => error);
      }

      // Let the change-password form show its own error UI
      if (req.url.includes('admin/me/password') || req.url.includes('users/me/password')) {
        return throwError(() => error);
      }

      let errorMessage = 'An unknown error occurred!';

      if (error.status === 403) {
        errorMessage = 'You do not have permission to perform this action.';
      } else if (error.status === 404) {
        errorMessage = 'Resource not found.';
      } else if (error.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.error && error.error.message) {
        errorMessage = Array.isArray(error.error.message)
          ? error.error.message.join(', ')
          : error.error.message;
      }

      modalService.open('error', 'Error', errorMessage);
      return throwError(() => error);
    })
  );
};
