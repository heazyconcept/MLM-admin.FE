import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-system-layout',
  imports: [CommonModule, RouterModule],
  templateUrl: './system-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemLayoutComponent {}
