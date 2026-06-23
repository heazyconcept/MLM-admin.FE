import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Blocks admin routes until the user changes their temporary password */
export const blockUntilPasswordChangedGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.mustChangePassword()) {
    return router.createUrlTree(['/change-password']);
  }

  return true;
};

/** Allows access to change-password only when a password change is required */
export const changePasswordPageGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  if (!auth.mustChangePassword()) {
    return router.createUrlTree(['/admin/dashboard']);
  }

  return true;
};
