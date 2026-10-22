import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PermissionService } from '../../../core/services/permission.service';
import { formatAuditTimestamp } from '../../../core/models/audit.model';
import {
  ConfirmationModalComponent,
  ConfirmationResult,
} from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { AdminCaucusService } from '../services/admin-caucus.service';
import {
  AdminCaucusMemberDetail,
  AdminCaucusMonthRow,
  AdminCaucusReferral,
  AdminCaucusTeamMember,
  CaucusCurrentMonth,
} from '../models/admin-caucus.models';
import {
  CAUCUS_EVENT_TYPE_LABEL,
  CAUCUS_MONTH_STATUS_LABEL,
  caucusMonthTitle,
  formatCaucusNgn,
  formatLagosDate,
} from '../utils/caucus-format.util';

type DetailTab = 'overview' | 'month' | 'months' | 'team' | 'history' | 'activity';

@Component({
  selector: 'app-caucus-member-detail',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    ConfirmationModalComponent,
  ],
  providers: [MessageService],
  templateUrl: './caucus-member-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaucusMemberDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly caucusService = inject(AdminCaucusService);
  private readonly messageService = inject(MessageService);
  protected readonly permission = inject(PermissionService);

  detail = this.caucusService.memberDetail;
  loading = this.caucusService.detailLoading;
  error = this.caucusService.detailError;

  activeTab = signal<DetailTab>('overview');
  referrals = signal<AdminCaucusReferral[]>([]);
  referralsLoading = signal(false);
  referralMonth = signal('');
  months = signal<AdminCaucusMonthRow[]>([]);
  team = signal<AdminCaucusTeamMember[]>([]);
  teamSearch = signal('');
  teamPage = signal(1);

  showDeactivateModal = signal(false);
  showReinstateModal = signal(false);
  showAwardCarModal = signal(false);
  showVoidModal = signal(false);
  voidReferralId = signal<string | null>(null);
  actionLoading = signal(false);

  canManage = computed(() => this.permission.hasPermission('caucus.manage_members'));

  userId = computed(() => this.route.snapshot.paramMap.get('userId') ?? '');

  ngOnInit(): void {
    this.reloadDetail();
  }

  formatMoney = formatCaucusNgn;
  formatDate = (iso: string | null | undefined, withTime = false) => formatLagosDate(iso, withTime);
  formatAudit = formatAuditTimestamp;
  monthTitle = caucusMonthTitle;
  monthStatusLabel = (s: string) => CAUCUS_MONTH_STATUS_LABEL[s] ?? s;
  eventLabel = (t: string) => CAUCUS_EVENT_TYPE_LABEL[t] ?? t;

  eventActor(event: { actorUsername: string | null; note: string | null }): string {
    if (event.actorUsername) {
      return event.actorUsername;
    }
    if (event.note?.includes('3 consecutive')) {
      return 'System';
    }
    return 'System';
  }

  monthStatusLine(month: CaucusCurrentMonth | undefined): string {
    if (!month) {
      return '';
    }
    if (month.displayStatus === 'PAID') {
      return 'Paid into Caucus wallet';
    }
    if (month.displayStatus !== 'OPEN') {
      return this.monthStatusLabel(month.displayStatus);
    }
    if (!month.floorMet) {
      return 'Building. 10 people are required before this amount can be paid';
    }
    if (!month.targetMet) {
      return 'Building. This amount is waiting for the 1st';
    }
    return 'Building. This amount is waiting for the 1st';
  }

  carLine(d: AdminCaucusMemberDetail | null): string {
    if (!d?.network) {
      return '';
    }
    const { downlineCount, carTarget, carStatus } = d.network;
    if (carStatus === 'AWARDED') {
      return 'Car awarded';
    }
    if (carStatus === 'QUALIFIED') {
      return `Qualified for the car. ${downlineCount} of ${carTarget} people in your network`;
    }
    return `${downlineCount} of ${carTarget} people in your network`;
  }

  setTab(tab: DetailTab): void {
    this.activeTab.set(tab);
    if (tab === 'month') {
      this.loadReferrals();
    }
    if (tab === 'months') {
      this.loadMonths();
    }
    if (tab === 'team') {
      this.loadTeam();
    }
  }

  reloadDetail(): void {
    const id = this.userId();
    if (!id) {
      return;
    }
    this.caucusService.loadMemberDetail(id).subscribe((d) => {
      if (d?.currentMonth?.monthKey) {
        this.referralMonth.set(d.currentMonth.monthKey);
      }
    });
  }

  loadReferrals(): void {
    const id = this.userId();
    const month = this.referralMonth();
    if (!id || !month) {
      return;
    }
    this.referralsLoading.set(true);
    this.caucusService.loadReferrals(id, month, 1, 50).subscribe((res) => {
      this.referrals.set(res?.referrals ?? []);
      this.referralsLoading.set(false);
    });
  }

  loadMonths(): void {
    const id = this.userId();
    if (!id) {
      return;
    }
    this.caucusService.loadMonths(id).subscribe((res) => {
      this.months.set(res?.months ?? []);
    });
  }

  loadTeam(): void {
    const id = this.userId();
    if (!id) {
      return;
    }
    this.caucusService.loadTeam(id, this.teamPage(), 20, this.teamSearch().trim()).subscribe((res) => {
      this.team.set(res?.members ?? []);
    });
  }

  confirmDeactivate(result: ConfirmationResult): void {
    if (!result.confirmed) {
      this.showDeactivateModal.set(false);
      return;
    }
    this.actionLoading.set(true);
    this.caucusService.deactivate(this.userId(), { note: result.reason }).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.showDeactivateModal.set(false);
        this.toastSuccess('Member deactivated');
        this.reloadDetail();
      },
      error: (err: Error) => this.actionError(err),
    });
  }

  confirmReinstate(result: ConfirmationResult): void {
    if (!result.confirmed) {
      this.showReinstateModal.set(false);
      return;
    }
    this.actionLoading.set(true);
    this.caucusService.reinstate(this.userId(), { note: result.reason }).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.showReinstateModal.set(false);
        this.toastSuccess('Member reinstated');
        this.reloadDetail();
      },
      error: (err: Error) => this.actionError(err),
    });
  }

  confirmAwardCar(result: ConfirmationResult): void {
    if (!result.confirmed) {
      this.showAwardCarModal.set(false);
      return;
    }
    this.actionLoading.set(true);
    this.caucusService.awardCar(this.userId()).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.showAwardCarModal.set(false);
        this.toastSuccess('Car marked as awarded');
        this.reloadDetail();
      },
      error: (err: Error) => this.actionError(err),
    });
  }

  openVoid(referralId: string): void {
    this.voidReferralId.set(referralId);
    this.showVoidModal.set(true);
  }

  confirmVoid(result: ConfirmationResult): void {
    const id = this.voidReferralId();
    if (!result.confirmed || !id) {
      this.showVoidModal.set(false);
      return;
    }
    this.actionLoading.set(true);
    this.caucusService.voidReferral(id, { note: result.reason ?? '' }).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.showVoidModal.set(false);
        this.toastSuccess('Referral voided');
        this.reloadDetail();
        this.loadReferrals();
      },
      error: (err: Error) => this.actionError(err),
    });
  }

  private toastSuccess(detail: string): void {
    this.messageService.add({ severity: 'success', summary: 'Caucus', detail });
  }

  private actionError(err: Error): void {
    this.actionLoading.set(false);
    this.messageService.add({ severity: 'error', summary: 'Action failed', detail: err.message });
  }
}
