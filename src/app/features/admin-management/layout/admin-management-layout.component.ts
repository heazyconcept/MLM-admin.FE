import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-management-layout',
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-management-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminManagementLayoutComponent {}
