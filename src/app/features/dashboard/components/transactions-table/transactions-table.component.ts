import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

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
  imports: [CommonModule, TableModule, TagModule],
  templateUrl: './transactions-table.component.html',
  styleUrls: ['./transactions-table.component.css']
})
export class TransactionsTableComponent {
  @Input() transactions: Transaction[] = [];

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

