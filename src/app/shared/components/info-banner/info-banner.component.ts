import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-info-banner',
  imports: [CommonModule],
  templateUrl: './info-banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoBannerComponent {
  message = input.required<string>();
  type = input<'warning' | 'info'>('info');
}
