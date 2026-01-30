import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  contentChildren,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import {
  TableColumn,
  TableAction,
  TableConfig,
  RowActionEvent,
  FilterChangeEvent
} from './data-table.types';

@Component({
  selector: 'app-data-table',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TooltipModule
  ],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTableComponent<T = unknown> {
  // Inputs
  data = input.required<T[]>();
  columns = input.required<TableColumn<T>[]>();
  actions = input<TableAction<T>[]>([]);
  loading = input<boolean>(false);
  config = input<TableConfig>({
    paginator: true,
    rows: 10,
    rowsPerPageOptions: [10, 25, 50],
    showCurrentPageReport: true,
    currentPageReportTemplate: 'Showing {first} to {last} of {totalRecords}',
    globalFilter: true,
    globalFilterPlaceholder: 'Search...',
    showGridlines: true,
    hoverable: true,
    size: 'small'
  });
  emptyMessage = input<string>('No records found');
  emptyIcon = input<string>('pi pi-inbox');

  // Outputs
  rowAction = output<RowActionEvent<T>>();
  rowSelect = output<T>();
  filterChange = output<FilterChangeEvent>();

  // Content children for custom templates
  templates = contentChildren<TemplateRef<unknown>>(TemplateRef);

  // ViewChild for PrimeNG table
  @ViewChild('tableRef') table!: Table;

  // Internal state
  globalFilterValue = signal<string>('');

  // Computed values
  tableStyleClass = computed(() => {
    const classes = ['p-datatable-hoverable'];
    const size = this.config().size;
    
    if (size === 'small') {
      classes.push('p-datatable-sm');
    } else if (size === 'large') {
      classes.push('p-datatable-lg');
    }
    
    return classes.join(' ');
  });

  visibleColumns = computed(() => {
    return this.columns().filter(col => !col.hideOnMobile || window.innerWidth >= 768);
  });

  hasActions = computed(() => {
    return this.actions().length > 0;
  });

  // Methods
  getCellValue(row: T, column: TableColumn<T>): unknown {
    const value = this.getNestedValue(row, column.field as string);
    
    if (column.formatter) {
      return column.formatter(value, row);
    }
    
    return value;
  }

  getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current: unknown, prop: string) => (current as Record<string, unknown>)?.[prop], obj);
  }

  onGlobalFilterChange(value: string): void {
    this.globalFilterValue.set(value);
    this.filterChange.emit({
      globalFilter: value
    });
  }

  onRowActionClick(action: TableAction<T>, row: T): void {
    if (action.disabled && action.disabled(row)) {
      return;
    }

    this.rowAction.emit({ action, row });
    
    if (action.command) {
      action.command(row);
    }
  }

  onRowSelect(row: T): void {
    this.rowSelect.emit(row);
  }

  isActionVisible(action: TableAction<T>, row: T): boolean {
    return action.visible ? action.visible(row) : true;
  }

  isActionDisabled(action: TableAction<T>, row: T): boolean {
    return action.disabled ? action.disabled(row) : false;
  }

  getActionButtonClass(action: TableAction<T>): string {
    const baseClass = 'p-button-text p-button-rounded';
    const severityClass = action.severity ? `p-button-${action.severity}` : 'p-button-secondary';
    const customClass = action.styleClass || '';
    
    return `${baseClass} ${severityClass} ${customClass}`.trim();
  }

  getColumnClass(column: TableColumn<T>): string {
    const classes: string[] = [];
    
    if (column.class) {
      classes.push(column.class);
    }
    
    if (column.align) {
      classes.push(`text-${column.align}`);
    }
    
    return classes.join(' ');
  }

  getHeaderClass(column: TableColumn<T>): string {
    const classes: string[] = [];
    
    if (column.headerClass) {
      classes.push(column.headerClass);
    }
    
    if (column.align) {
      classes.push(`text-${column.align}`);
    }
    
    return classes.join(' ');
  }

  getGlobalFilterFields(): string[] {
    if (this.config().globalFilterFields) {
      return this.config().globalFilterFields!;
    }
    
    return this.columns()
      .filter(col => col.filterable !== false)
      .map(col => col.field as string);
  }

  getFieldAsString(field: unknown): string {
    return String(field);
  }

  getSortableField(column: TableColumn<T>): string | undefined {
    return column.sortable ? String(column.field) : undefined;
  }

  // Expose PrimeNG table's filterGlobal method
  filterGlobal(value: string, matchMode: string): void {
    if (this.table) {
      this.table.filterGlobal(value, matchMode);
    }
  }
}
