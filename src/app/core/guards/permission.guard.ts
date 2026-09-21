import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { PermissionService } from '../services/permission.service';
import { Feature } from '../models/admin-permission.model';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const permission = inject(PermissionService);
  const router = inject(Router);

  const permissionKey = route.data['permissionKey'] as string | string[] | undefined;
  if (permissionKey) {
    const keys = Array.isArray(permissionKey) ? permissionKey : [permissionKey];
    if (permission.hasAnyPermission(...keys)) {
      return true;
    }
    return router.createUrlTree(['/admin/access-restricted']);
  }

  const feature = route.data['feature'] as Feature | undefined;
  if (!feature) {
    return true;
  }

  if (permission.hasMinViewAccess(feature)) {
    return true;
  }

  return router.createUrlTree(['/admin/access-restricted']);
};
