import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ChangeSummaryItem {
  field: string;
  old: string;
  new: string;
}

@Component({
  selector: 'app-change-summary-panel',
  imports: [CommonModule],
  templateUrl: './change-summary-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangeSummaryPanelComponent {
  changes = input.required<ChangeSummaryItem[]>();
  title = input<string>('Changes to apply');
}
