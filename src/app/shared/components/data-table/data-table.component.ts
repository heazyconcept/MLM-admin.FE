import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  ContentChild,
  TemplateRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule, TablePageEvent } from 'primeng/table';

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
  paginator = input<boolean>(true);
  rows = input<number>(10);
  rowsPerPageOptions = input<number[]>([10, 25, 50, 100]);
  totalRecords = input<number>(0);
  lazy = input<boolean>(false);
  first = input<number>(0);
  loading = input<boolean>(false);

  // Outputs
  pageChange = output<TablePageEvent>();

  // Get the body template from parent
  @ContentChild(TemplateRef) bodyTemplate: TemplateRef<any> | undefined;

  onPageChange(event: TablePageEvent): void {
    this.pageChange.emit(event);
  }
}

