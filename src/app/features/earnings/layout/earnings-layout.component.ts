import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-earnings-layout',
  imports: [CommonModule, RouterModule],
  templateUrl: './earnings-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EarningsLayoutComponent {}
