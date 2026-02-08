import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';

@Component({
  selector: 'app-config-input',
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, InputNumberModule],
  templateUrl: './config-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigInputComponent {
  label = input.required<string>();
  type = input<string>('text');
  control = input<FormControl<string | number | null>>();
  value = input<string | number | null>(null);
  valueChange = input<(v: string | number | null) => void>();
  disabled = input<boolean>(false);
  readOnly = input<boolean>(false);
  error = input<string | null>(null);
  id = input<string | null>(null);
  placeholder = input<string>('');
  min = input<number | null>(null);
  max = input<number | null>(null);

  onValueInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const val = this.type() === 'number' ? Number(el.value) : el.value;
    this.valueChange()?.(val);
  }
}
