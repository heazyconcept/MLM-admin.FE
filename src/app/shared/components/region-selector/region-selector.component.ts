import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MultiSelectModule } from 'primeng/multiselect';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-region-selector',
  imports: [CommonModule, MultiSelectModule, FormsModule],
  templateUrl: './region-selector.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegionSelectorComponent {
  // Inputs
  regions = input<string[]>([]);
  selected = input<string[]>([]);
  placeholder = input<string>('Select regions');
  disabled = input<boolean>(false);

  // Outputs
  selectedChange = output<string[]>();

  // Methods
  onSelectedChange(value: string[]): void {
    this.selectedChange.emit(value);
  }
}
