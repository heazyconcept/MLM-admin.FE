import {
  Component,
  input,
  output,
  inject,
  signal,
  computed,
  effect,
  untracked,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { Wallet, WalletService } from '../services/wallet.service';
import {
  AdminFundWalletType,
  UserWallets,
} from '../../users/services/users.service';
import { MessageService } from 'primeng/api';

export type FundsAdjustmentMode = 'add' | 'remove';

interface WalletTypeOption {
  label: string;
  value: AdminFundWalletType;
  walletId: string;
  displayCurrency: string;
  disabled: boolean;
}

const WALLET_TYPE_LABELS: Record<AdminFundWalletType, string> = {
  REGISTRATION: 'Registration wallet',
  VOUCHER: 'Product Voucher wallet',
  CASH: 'Cash wallet',
  AUTOSHIP: 'Autoship wallet',
};

const ALL_WALLET_TYPES: AdminFundWalletType[] = [
  'REGISTRATION',
  'VOUCHER',
  'CASH',
  'AUTOSHIP',
];

function mapWalletType(walletType: string): AdminFundWalletType {
  const normalized = walletType.toUpperCase();
  const map: Record<string, AdminFundWalletType> = {
    REGISTRATION: 'REGISTRATION',
    CASH: 'CASH',
    VOUCHER: 'VOUCHER',
    AUTOSHIP: 'AUTOSHIP',
  };
  return map[normalized] ?? 'CASH';
}

@Component({
  selector: 'app-funds-adjustment-modal',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    SelectModule,
    TextareaModule,
  ],
  templateUrl: './funds-adjustment-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FundsAdjustmentModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly walletService = inject(WalletService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  visible = input<boolean>(false);
  /** Fixed action for this modal instance — add (credit) or remove (debit). */
  mode = input<FundsAdjustmentMode>('add');
  /** Wallet detail mode context (current wallet). */
  wallet = input<Wallet | undefined>();
  /** All wallets for the user on wallet detail page (for type dropdown). */
  contextWallets = input<Wallet[] | undefined>();
  /** User detail mode: adjust wallet with type picker. */
  userId = input<string>('');
  userName = input<string>('');
  userWallets = input<UserWallets | undefined>();
  initialWalletType = input<AdminFundWalletType | undefined>();

  visibleChange = output<boolean>();
  adjusted = output<void>();

  submitting = signal(false);
  selectedWalletType = signal<AdminFundWalletType | ''>('');

  isAddMode = computed(() => this.mode() === 'add');
  isUserMode = computed(() => !!this.userWallets());
  isWalletDetailMode = computed(() => !!this.wallet() && !this.isUserMode());

  fundForm = this.fb.group({
    walletType: ['' as AdminFundWalletType | '', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    reason: ['', [Validators.required, Validators.minLength(10)]],
  });

  walletTypeOptions = computed<WalletTypeOption[]>(() => {
    if (this.isUserMode()) {
      return this.buildOptionsFromUserWallets(this.userWallets() ?? {});
    }
    return this.buildOptionsFromWalletList(
      this.contextWallets() ?? (this.wallet() ? [this.wallet()!] : [])
    );
  });

  selectedCurrency = computed(() => {
    const selected = this.selectedWalletType();
    const option = this.walletTypeOptions().find((o) => o.value === selected);
    return option?.displayCurrency ?? 'NGN';
  });

  selectedWalletId = computed(() => {
    const selected = this.selectedWalletType();
    const option = this.walletTypeOptions().find((o) => o.value === selected);
    return option?.walletId ?? '';
  });

  dialogHeader = computed(() => {
    const action = this.isAddMode() ? 'Add Funds' : 'Remove Funds';
    if (this.isUserMode()) {
      return `${action} — ${this.userName() || 'User'}`;
    }
    const w = this.wallet();
    if (w?.userName) {
      return `${action} — ${w.userName}`;
    }
    return w ? `${action} — ${w.walletType}` : action;
  });

  submitLabel = computed(() =>
    this.isAddMode() ? 'Confirm credit' : 'Confirm debit'
  );

  constructor() {
    this.fundForm.controls.walletType.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.selectedWalletType.set(value ?? '');
      });

    let wasVisible = false;
    effect(() => {
      const isVisible = this.visible();
      if (isVisible && !wasVisible) {
        untracked(() => this.initializeForm());
      }
      wasVisible = isVisible;
    });
  }

  close(): void {
    this.visibleChange.emit(false);
    this.resetFundForm();
  }

  onDialogHide(): void {
    if (this.visible()) {
      this.visibleChange.emit(false);
    }
    this.resetFundForm();
  }

  private initializeForm(): void {
    this.resetFundForm();

    const preset = this.resolvePresetWalletType();
    const defaultOption =
      (preset
        ? this.walletTypeOptions().find((o) => o.value === preset && !o.disabled)
        : undefined) ?? this.walletTypeOptions().find((o) => !o.disabled);

    if (defaultOption) {
      this.fundForm.controls.walletType.setValue(defaultOption.value, { emitEvent: true });
    }
  }

  submitFund(): void {
    if (this.fundForm.invalid || this.submitting()) return;

    const walletId = this.selectedWalletId();
    if (!walletId) return;

    const { amount, reason } = this.fundForm.getRawValue();
    if (!amount) return;

    const isAdd = this.isAddMode();
    const signedAmount = isAdd ? amount : -amount;
    const trimmedReason = (reason ?? '').trim();

    this.submitting.set(true);
    this.walletService
      .adjustWallet(walletId, {
        amount: signedAmount,
        reason: trimmedReason,
        displayAmount: signedAmount,
      })
      .subscribe({
        next: (newBalance) => {
          this.submitting.set(false);
          const currency = this.selectedCurrency();
          this.messageService.add({
            severity: 'success',
            summary: 'Funds adjusted',
            detail: `Wallet ${isAdd ? 'credited' : 'debited'}. New balance: ${currency} ${newBalance.toLocaleString()}`,
          });
          this.adjusted.emit();
          this.close();
        },
        error: (err) => {
          this.submitting.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Adjustment failed',
            detail:
              err?.error?.message ||
              `Could not ${isAdd ? 'credit' : 'debit'} wallet. Please try again.`,
          });
        },
      });
  }

  private resolvePresetWalletType(): AdminFundWalletType | undefined {
    if (this.initialWalletType()) {
      return this.initialWalletType();
    }
    if (this.isWalletDetailMode() && this.wallet()) {
      return mapWalletType(this.wallet()!.walletType);
    }
    return undefined;
  }

  private buildOptionsFromUserWallets(w: UserWallets): WalletTypeOption[] {
    return [
      {
        label: WALLET_TYPE_LABELS.REGISTRATION,
        value: 'REGISTRATION',
        walletId: w.registration?.walletId ?? '',
        displayCurrency: w.registration?.displayCurrency ?? 'NGN',
        disabled: !w.registration,
      },
      {
        label: WALLET_TYPE_LABELS.VOUCHER,
        value: 'VOUCHER',
        walletId: w.voucher?.walletId ?? '',
        displayCurrency: w.voucher?.displayCurrency ?? 'NGN',
        disabled: !w.voucher,
      },
      {
        label: WALLET_TYPE_LABELS.CASH,
        value: 'CASH',
        walletId: w.cash?.walletId ?? '',
        displayCurrency: w.cash?.displayCurrency ?? 'NGN',
        disabled: !w.cash,
      },
      {
        label: WALLET_TYPE_LABELS.AUTOSHIP,
        value: 'AUTOSHIP',
        walletId: w.autoship?.walletId ?? '',
        displayCurrency: w.autoship?.displayCurrency ?? 'NGN',
        disabled: !w.autoship,
      },
    ];
  }

  private buildOptionsFromWalletList(wallets: Wallet[]): WalletTypeOption[] {
    return ALL_WALLET_TYPES.map((type) => {
      const match = wallets.find((w) => mapWalletType(w.walletType) === type);
      return {
        label: WALLET_TYPE_LABELS[type],
        value: type,
        walletId: match?.id ?? '',
        displayCurrency: match?.displayCurrency ?? 'NGN',
        disabled: !match,
      };
    });
  }

  private resetFundForm(): void {
    this.fundForm.reset({
      walletType: '' as AdminFundWalletType | '',
      amount: null,
      reason: '',
    });
    this.selectedWalletType.set('');
    this.submitting.set(false);
  }
}
