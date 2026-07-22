import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { startWith } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PermissionService } from '../../../core/services/permission.service';
import {
  CompanyBankAccount,
  CompanyBankAccountService,
} from '../services/company-bank-account.service';
import {
  ConfirmationModalComponent,
  ConfirmationResult,
} from '../../../shared/components/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-company-bank-account',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    ToastModule,
    ConfirmationModalComponent,
  ],
  providers: [MessageService],
  templateUrl: './company-bank-account.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyBankAccountComponent implements OnInit {
  private fb = inject(FormBuilder);
  private bankAccountService = inject(CompanyBankAccountService);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);
  protected permission = inject(PermissionService);

  canEdit = computed(() => this.permission.hasPermission('system.edit_general'));
  loading = signal(false);
  saving = signal(false);
  confirmVisible = signal(false);
  notConfigured = signal(false);

  form = this.fb.group({
    bankName: ['', [Validators.required]],
    accountNumber: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
    accountName: ['', [Validators.required]],
  });

  private initialValues = signal<CompanyBankAccount>({
    bankName: '',
    accountNumber: '',
    accountName: '',
  });

  /** Tracks form value changes so isDirty recomputes (form.value alone is not a signal). */
  private readonly formValue = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() }
  );

  private readonly formStatus = toSignal(
    this.form.statusChanges.pipe(startWith(this.form.status)),
    { initialValue: this.form.status }
  );

  isDirty = computed(() => {
    const current = this.formValue();
    const initial = this.initialValues();
    return (
      (current.bankName ?? '') !== initial.bankName ||
      (current.accountNumber ?? '') !== initial.accountNumber ||
      (current.accountName ?? '') !== initial.accountName
    );
  });

  canSave = computed(
    () => this.canEdit() && this.isDirty() && this.formStatus() === 'VALID' && !this.saving()
  );

  ngOnInit(): void {
    this.syncFormEnabledState();
    this.loadBankAccount();
  }

  private syncFormEnabledState(): void {
    if (this.canEdit()) {
      this.form.enable({ emitEvent: false });
    } else {
      this.form.disable({ emitEvent: false });
    }
  }

  private loadBankAccount(): void {
    this.loading.set(true);
    this.bankAccountService
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          const values: CompanyBankAccount = {
            bankName: data?.bankName ?? '',
            accountNumber: data?.accountNumber ?? '',
            accountName: data?.accountName ?? '',
          };
          const isEmpty = !values.bankName && !values.accountNumber && !values.accountName;
          this.notConfigured.set(isEmpty);
          this.applyLoadedValues(values);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          if (err.status === 404) {
            this.notConfigured.set(true);
            this.applyLoadedValues({
              bankName: '',
              accountNumber: '',
              accountName: '',
            });
            return;
          }
          this.messageService.add({
            severity: 'error',
            summary: 'Load Failed',
            detail: 'Could not load company bank account details.',
          });
        },
      });
  }

  private applyLoadedValues(values: CompanyBankAccount): void {
    this.form.patchValue(values, { emitEvent: true });
    this.initialValues.set(values);
    this.syncFormEnabledState();
  }

  onSaveClick(): void {
    if (!this.canSave()) {
      this.form.markAllAsTouched();
      return;
    }
    this.confirmVisible.set(true);
  }

  onConfirm(result: ConfirmationResult): void {
    if (!result.confirmed) {
      this.confirmVisible.set(false);
      return;
    }

    this.saving.set(true);
    this.confirmVisible.set(false);

    const raw = this.form.getRawValue();
    const body: CompanyBankAccount = {
      bankName: raw.bankName ?? '',
      accountNumber: raw.accountNumber ?? '',
      accountName: raw.accountName ?? '',
    };

    this.bankAccountService.update(body).subscribe({
      next: (data) => {
        const values: CompanyBankAccount = {
          bankName: data?.bankName ?? body.bankName,
          accountNumber: data?.accountNumber ?? body.accountNumber,
          accountName: data?.accountName ?? body.accountName,
        };
        this.notConfigured.set(false);
        this.applyLoadedValues(values);
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Saved',
          detail: 'Company bank account details updated successfully.',
        });
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.saving.set(false);
        const detail = err?.error?.message ?? err?.message ?? 'Failed to update bank account';
        this.messageService.add({ severity: 'error', summary: 'Save Failed', detail });
      },
    });
  }

  onCancelConfirm(): void {
    this.confirmVisible.set(false);
  }
}
