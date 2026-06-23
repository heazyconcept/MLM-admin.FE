import {
  Directive,
  TemplateRef,
  ViewContainerRef,
  inject,
  input,
  effect,
} from '@angular/core';
import { PermissionService } from '../../core/services/permission.service';

/**
 * Structural directive — renders content only when the user has the required permission key(s).
 *
 * @example
 * <button *hasPermission="'users.suspend'">Suspend</button>
 * <div *hasPermission="['withdrawals.approve', 'withdrawals.process']; mode: 'any'">...</div>
 */
@Directive({
  selector: '[hasPermission]',
})
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly permission = inject(PermissionService);

  readonly hasPermission = input.required<string | string[]>();
  readonly hasPermissionMode = input<'any' | 'all'>('any', { alias: 'hasPermissionMode' });

  constructor() {
    effect(() => {
      const keys = this.normalizeKeys(this.hasPermission());
      const mode = this.hasPermissionMode();
      const allowed =
        mode === 'all'
          ? this.permission.hasAllPermissions(...keys)
          : this.permission.hasAnyPermission(...keys);

      this.viewContainer.clear();
      if (allowed) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    });
  }

  private normalizeKeys(value: string | string[]): string[] {
    return Array.isArray(value) ? value : [value];
  }
}
