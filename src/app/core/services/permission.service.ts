import { Injectable, inject, computed } from '@angular/core';
import { Feature, Action } from '../models/admin-permission.model';
import { AuthService } from './auth.service';
import {
  FEATURE_ACCESS_MATRIX,
  ACTION_PERMISSION_MATRIX
} from '../constants/permission-matrix';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly auth = inject(AuthService);

  private readonly role = computed(() => this.auth.currentAdminRole());

  readonly accessibleFeatures = computed(() => {
    const role = this.role();
    return Object.values(Feature).filter(
      (f) => FEATURE_ACCESS_MATRIX[role][f] !== 'none'
    );
  });

  readonly editableFeatures = computed(() => {
    const role = this.role();
    return Object.values(Feature).filter(
      (f) => FEATURE_ACCESS_MATRIX[role][f] === 'full'
    );
  });

  hasAccess(feature: Feature): boolean {
    const role = this.role();
    return FEATURE_ACCESS_MATRIX[role][feature] !== 'none';
  }

  canEdit(feature: Feature): boolean {
    const role = this.role();
    return FEATURE_ACCESS_MATRIX[role][feature] === 'full';
  }

  canPerform(action: Action): boolean {
    const role = this.role();
    return ACTION_PERMISSION_MATRIX[role][action] ?? false;
  }
}
