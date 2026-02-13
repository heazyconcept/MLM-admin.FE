import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-system-overview',
  imports: [CommonModule, RouterModule],
  templateUrl: './system-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemOverviewComponent {}
