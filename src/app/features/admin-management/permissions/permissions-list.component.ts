import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import {
  Permission,
  PermissionGroup,
  ALL_PERMISSION_KEYS,
  PERMISSION_MODULES,
} from '../../../core/models/rbac.model';
import { AdminManagementService } from '../services/admin-management.service';

@Component({
  selector: 'app-permissions-list',
  imports: [CommonModule, FormsModule, InputTextModule, SelectModule, TagModule, TooltipModule],
  templateUrl: './permissions-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionsListComponent implements OnInit {
  private readonly adminService = inject(AdminManagementService);

  permissions = signal<Permission[]>([]);
  loading = signal(false);
  searchQuery = signal('');
  moduleFilter = signal('');

  moduleOptions = [
    { label: 'All Modules', value: '' },
    ...PERMISSION_MODULES.map(m => ({ label: m, value: m })),
  ];

  filteredGroups = computed<PermissionGroup[]>(() => {
    const query = this.searchQuery().toLowerCase();
    const module = this.moduleFilter();
    let perms = this.permissions();

    if (module) {
      perms = perms.filter(p => p.module === module);
    }
    if (query) {
      perms = perms.filter(
        p =>
          p.label.toLowerCase().includes(query) ||
          p.key.toLowerCase().includes(query) ||
          p.module.toLowerCase().includes(query)
      );
    }

    // Group by module
    const grouped = new Map<string, Permission[]>();
    for (const p of perms) {
      if (!grouped.has(p.module)) grouped.set(p.module, []);
      grouped.get(p.module)!.push(p);
    }
    return Array.from(grouped.entries()).map(([module, permissions]) => ({
      module,
      permissions,
    }));
  });

  totalCount = computed(() => this.permissions().length);
  filteredCount = computed(() =>
    this.filteredGroups().reduce((sum, g) => sum + g.permissions.length, 0)
  );

  ngOnInit(): void {
    this.loadPermissions();
  }

  loadPermissions(): void {
    this.loading.set(true);
    this.adminService.getPermissions().subscribe({
      next: (perms) => {
        this.permissions.set(perms);
        this.loading.set(false);
      },
      error: () => {
        // Fallback to the hardcoded list when API is not ready
        this.permissions.set(ALL_PERMISSION_KEYS);
        this.loading.set(false);
      },
    });
  }
}
