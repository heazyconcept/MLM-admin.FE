import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PermissionService } from '../../../core/services/permission.service';
import { ApiService } from '../../../core/services/api.service';
import { ConfirmationModalComponent, ConfirmationResult } from '../../../shared/components/confirmation-modal/confirmation-modal.component';

export interface CompanyBankAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

@Component({
  selector: 'app-company-bank-account',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    ToastModule,
    ConfirmationModalComponent
  ],
  providers: [MessageService],
  templateUrl: './company-bank-account.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CompanyBankAccountComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private messageService = inject(MessageService);
  protected permission = inject(PermissionService);

  canEdit = computed(() => this.permission.hasPermission('system.edit_general'));
  loading = signal(false);
  saving = signal(false);
  confirmVisible = signal(false);

  form = this.fb.group({
    bankName: ['', [Validators.required]],
    accountNumber: ['', [Validators.required]],
    accountName: ['', [Validators.required]]
  });

  private initialValues = signal<CompanyBankAccount>({
    bankName: '',
    accountNumber: '',
    accountName: ''
  });

  isDirty = computed(() => {
    const current = this.form.value;
    const initial = this.initialValues();
    return current.bankName !== initial.bankName
      || current.accountNumber !== initial.accountNumber
      || current.accountName !== initial.accountName;
  });

  ngOnInit(): void {
    this.loadBankAccount();
  }

  private loadBankAccount(): void {
    this.loading.set(true);
    this.api.get<CompanyBankAccount>('admin/company-bank-account').subscribe({
      next: (data) => {
        const values: CompanyBankAccount = {
          bankName: data?.bankName ?? '',
          accountNumber: data?.accountNumber ?? '',
          accountName: data?.accountName ?? ''
        };
        this.form.patchValue(values, { emitEvent: false });
        this.initialValues.set(values);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onSaveClick(): void {
    this.confirmVisible.set(true);
  }

  onConfirm(result: ConfirmationResult): void {
    if (!result.confirmed) {
      this.confirmVisible.set(false);
      return;
    }

    this.saving.set(true);
    this.confirmVisible.set(false);

    const body: CompanyBankAccount = {
      bankName: this.form.value.bankName ?? '',
      accountNumber: this.form.value.accountNumber ?? '',
      accountName: this.form.value.accountName ?? ''
    };

    this.api.put<CompanyBankAccount>('admin/company-bank-account', body).subscribe({
      next: (data) => {
        const values: CompanyBankAccount = {
          bankName: data?.bankName ?? body.bankName,
          accountNumber: data?.accountNumber ?? body.accountNumber,
          accountName: data?.accountName ?? body.accountName
        };
        this.initialValues.set(values);
        this.form.patchValue(values, { emitEvent: false });
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Saved',
          detail: 'Company bank account details updated successfully.'
        });
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.saving.set(false);
        const detail = err?.error?.message ?? err?.message ?? 'Failed to update bank account';
        this.messageService.add({ severity: 'error', summary: 'Save Failed', detail });
      }
    });
  }

  onCancelConfirm(): void {
    this.confirmVisible.set(false);
  }
}
