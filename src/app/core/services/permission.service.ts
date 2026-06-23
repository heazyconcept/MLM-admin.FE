import { Injectable, inject, computed } from '@angular/core';
import { Feature, Action } from '../models/admin-permission.model';
import { AuthService } from './auth.service';
import {
  ACTION_TO_PERMISSION_KEY,
  FEATURE_MIN_VIEW_PERMISSION,
} from '../constants/permission-matrix';
import {
  ALL_PERMISSION_KEYS,
  FEATURE_TO_PERMISSION_PREFIX,
} from '../models/rbac.model';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly auth = inject(AuthService);

  private readonly permissionSet = computed(() => new Set(this.auth.effectivePermissions()));

  readonly accessibleFeatures = computed(() =>
    Object.values(Feature).filter((feature) => this.hasAccess(feature))
  );

  readonly editableFeatures = computed(() =>
    Object.values(Feature).filter((feature) => this.canEdit(feature))
  );

  hasPermission(key: string): boolean {
    return this.permissionSet().has(key);
  }

  hasAnyPermission(...keys: string[]): boolean {
    if (keys.length === 0) return false;
    const granted = this.permissionSet();
    return keys.some((key) => granted.has(key));
  }

  hasAllPermissions(...keys: string[]): boolean {
    if (keys.length === 0) return false;
    const granted = this.permissionSet();
    return keys.every((key) => granted.has(key));
  }

  hasMinViewAccess(feature: Feature): boolean {
    const minKey = FEATURE_MIN_VIEW_PERMISSION[feature];
    if (!minKey) return false;
    return this.hasPermission(minKey);
  }

  hasAccess(feature: Feature): boolean {
    const permissions = this.auth.effectivePermissions();
    if (permissions.length === 0) return false;

    const prefixes = this.getPrefixesForFeature(feature);
    return permissions.some((key) =>
      prefixes.some((prefix) => key.startsWith(prefix))
    );
  }

  canEdit(feature: Feature): boolean {
    const permissions = this.auth.effectivePermissions();
    if (permissions.length === 0) return false;

    const prefixes = this.getPrefixesForFeature(feature);
    const actionKeys = ALL_PERMISSION_KEYS
      .filter(
        (entry) =>
          entry.type === 'action' &&
          prefixes.some((prefix) => entry.key.startsWith(prefix))
      )
      .map((entry) => entry.key);

    return permissions.some((key) => actionKeys.includes(key));
  }

  canPerform(action: Action): boolean {
    const mapping = ACTION_TO_PERMISSION_KEY[action];
    if (!mapping) return false;

    if (Array.isArray(mapping)) {
      return this.hasAnyPermission(...mapping);
    }

    return this.hasPermission(mapping);
  }

  private getPrefixesForFeature(feature: Feature): string[] {
    const raw = FEATURE_TO_PERMISSION_PREFIX[feature] ?? '';
    return raw.split(',').map((prefix) => prefix.trim()).filter(Boolean);
  }
}
