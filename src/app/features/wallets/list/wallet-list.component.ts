import { Component, inject, ChangeDetectionStrategy, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WalletService, Wallet } from '../services/wallet.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { DataTableTemplateDirective } from '../../../shared/components/data-table/data-table-template.directive';
import { TableColumn, TableAction, TableConfig } from '../../../shared/components/data-table/data-table.types';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-wallet-list',
  imports: [CommonModule, DataTableComponent, DataTableTemplateDirective, ButtonModule, TagModule, InputTextModule],
  templateUrl: './wallet-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WalletListComponent {
  private walletService = inject(WalletService);
  private router = inject(Router);

  @ViewChild(DataTableComponent) dataTable!: DataTableComponent<Wallet>;
  
  wallets = this.walletService.wallets;
  loading = signal(false);
  columns = signal<TableColumn<Wallet>[]>([
    {
      field: 'id',
      header: 'Wallet ID',
      width: '120px',
      align: 'center'
    },
    {
      field: 'userName',
      header: 'User'
    },
    {
      field: 'type',
      header: 'Type',
      width: '130px',
      align: 'center'
    },
    {
      field: 'balance',
      header: 'Balance'
    },
    {
      field: 'status',
      header: 'Status',
      width: '130px',
      align: 'center'
    },
    {
      field: 'lastUpdated',
      header: 'Last Updated',
      width: '160px',
      align: 'center',
      formatter: (value: unknown) => new Date(value as string | number | Date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
  ]);

  tableConfig = signal<TableConfig>({
    paginator: true,
    rows: 10,
    rowsPerPageOptions: [10, 25, 50],
    showCurrentPageReport: true,
    globalFilter: false, // Disabled - using external search instead
    showGridlines: false,
    hoverable: true,
    size: 'normal'
  });

  actions = signal<TableAction<Wallet>[]>([
    {
      icon: 'pi pi-eye',
      tooltip: 'View Details',
      severity: 'secondary',
      command: (wallet) => this.router.navigate(['/admin/wallets', wallet.id])
    }
  ]);

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) {
      case 'Active': return 'success';
      case 'Locked': return 'danger';
      case 'Frozen': return 'warn';
      default: return 'info';
    }
  }

  onExport(): void {
    console.log('Export wallets');
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (this.dataTable) {
      this.dataTable.filterGlobal(value, 'contains');
    }
  }
}
