import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { signal } from '@angular/core';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { DataTableTemplateDirective } from '../../../../shared/components/data-table/data-table-template.directive';
import { TableColumn, TableConfig, TableAction } from '../../../../shared/components/data-table/data-table.types';

export interface Transaction {
  id: string;
  activity: string;
  icon: string;
  iconBg: string;
  date: string;
  price: string;
  status: 'Success' | 'Pending' | 'Failed';
}

@Component({
  selector: 'app-transactions-table',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, DataTableComponent, DataTableTemplateDirective],
  templateUrl: './transactions-table.component.html',
  styleUrls: ['./transactions-table.component.css']
})
export class TransactionsTableComponent {
  @Input() transactions: Transaction[] = [];

  columns = signal<TableColumn<Transaction>[]>([
    {
      field: 'activity',
      header: 'Activity'
      // Custom template for icon + label
    },
    {
      field: 'date',
      header: 'Date',
      class: 'text-sm text-mlm-secondary'
    },
    {
      field: 'price',
      header: 'Price',
      class: 'font-medium text-mlm-text'
    },
    {
      field: 'status',
      header: 'Status'
      // Custom template for p-tag
    }
  ]);

  tableConfig = signal<TableConfig>({
    paginator: false,
    showGridlines: false,
    hoverable: true,
    size: 'small'
  });

  actions = signal<TableAction<Transaction>[]>([
    {
      icon: 'pi pi-ellipsis-v',
      command: (row) => console.log('Action for', row),
      severity: 'secondary'
    }
  ]);

  getStatusSeverity(status: string): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" {
    switch (status) {
      case 'Success':
        return 'success';
      case 'Pending':
        return 'warn';
      case 'Failed':
        return 'danger';
      default:
        return 'info';
    }
  }
}

