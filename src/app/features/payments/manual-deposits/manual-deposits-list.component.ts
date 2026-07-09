import {
  Component,
  inject,
  computed,
  signal,
  ChangeDetectionStrategy,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import {
  ManualDepositService,
  ManualWalletDeposit,
  ManualDepositStatus,
  ManualDepositWalletType
} from '../services/manual-deposit.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

const WALLET_TYPE_LABELS: Record<ManualDepositWalletType, string> = {
  REGISTRATION: 'Registration wallet',
  VOUCHER: 'Product Voucher wallet'
};

@Component({
  selector: 'app-manual-deposits-list',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    DataTableComponent,
    StatusBadgeComponent,
    ButtonModule,
    ToastModule
  ],
  templateUrl: './manual-deposits-list.component.html',
  styleUrls: ['./manual-deposits-list.component.css'],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManualDepositsListComponent implements OnInit {
  private manualDepositService = inject(ManualDepositService);
  private router = inject(Router);

  deposits = this.manualDepositService.deposits;
  tableLoading = signal(false);

  selectedStatusControl = new FormControl('PENDING');
  selectedWalletTypeControl = new FormControl('all');
  searchVal = signal<string>('');
  searchQuery = signal<string>('');

  statusOptions = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' }
  ];

  walletTypeOptions = [
    { label: 'All Wallets', value: 'all' },
    { label: 'Registration', value: 'REGISTRATION' },
    { label: 'Product Voucher', value: 'VOUCHER' }
  ];

  filteredDeposits = computed(() => this.deposits());

  stats = computed(() => {
    const all = this.deposits();
    const pending = all.filter(d => d.status === 'PENDING').length;
    const approved = all.filter(d => d.status === 'APPROVED').length;
    const rejected = all.filter(d => d.status === 'REJECTED').length;

    return { pending, approved, rejected, total: all.length };
  });

  tableHeaders = signal([
    'Submission ID',
    'User',
    'Wallet Type',
    'Amount',
    'Depositor',
    'Status',
    'Submitted'
  ]);

  ngOnInit(): void {
    this.fetchDeposits();

    this.selectedStatusControl.valueChanges.subscribe(() => {
      this.fetchDeposits();
    });

    this.selectedWalletTypeControl.valueChanges.subscribe(() => {
      this.fetchDeposits();
    });
  }

  private fetchDeposits(): void {
    const selectedStatus = this.selectedStatusControl.value as ManualDepositStatus | 'all' | null;
    const status = selectedStatus && selectedStatus !== 'all'
      ? (selectedStatus as ManualDepositStatus)
      : undefined;

    const selectedWalletType = this.selectedWalletTypeControl.value as ManualDepositWalletType | 'all' | null;
    const walletType = selectedWalletType && selectedWalletType !== 'all'
      ? (selectedWalletType as ManualDepositWalletType)
      : undefined;

    const search = this.searchQuery();

    this.tableLoading.set(true);
    this.manualDepositService.loadFromApi({
      status,
      walletType,
      search: search || undefined,
      limit: 50,
      offset: 0
    }).subscribe({
      next: () => this.tableLoading.set(false),
      error: () => this.tableLoading.set(false)
    });
  }

  viewDetails(deposit: ManualWalletDeposit): void {
    this.router.navigate(['/admin/payments/manual-deposits', deposit.id]);
  }

  onSearch(): void {
    this.searchQuery.set(this.searchVal().trim());
    this.fetchDeposits();
  }

  getStatusDisplay(status: ManualDepositStatus): string {
    const map: Record<ManualDepositStatus, string> = {
      PENDING: 'Pending',
      APPROVED: 'Approved',
      REJECTED: 'Rejected'
    };
    return map[status] ?? status;
  }

  formatWalletType(walletType: string): string {
    const normalized = walletType?.toUpperCase() as ManualDepositWalletType;
    return WALLET_TYPE_LABELS[normalized] ?? walletType;
  }
}
