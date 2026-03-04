import {
  Component,
  ChangeDetectionStrategy,
  input,
  ContentChild,
  TemplateRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-data-table',
  imports: [CommonModule, TableModule],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTableComponent<T = unknown> {
  // Inputs
  value = input<T[]>([]);
  headers = input<string[]>([]);
  rows = input<number>(10);
  rowsPerPageOptions = input<number[]>([10, 25, 50]);
  loading = input<boolean>(false);

  // Get the body template from parent
  @ContentChild(TemplateRef) bodyTemplate: TemplateRef<any> | undefined;
}

