import {
  Component,
  input,
  output,
  signal,
  ChangeDetectionStrategy,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { GrantConsultantRequest } from '../services/consultant.service';
import { User } from '../../users/services/users.service';
import { UsersService } from '../../users/services/users.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-consultant-grant-modal',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule
  ],
  templateUrl: './consultant-grant-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConsultantGrantModalComponent {
  private usersService = inject(UsersService);

  visible = input<boolean>(false);
  loading = input<boolean>(false);

  grantRequest = output<GrantConsultantRequest>();
  cancelled = output<void>();

  constructor() {
    effect(() => {
      if (!this.visible()) {
        this.resetForm();
      }
    });
  }

  searchVal = signal('');
  searchResults = signal<User[]>([]);
  searchLoading = signal(false);
  selectedUser = signal<User | null>(null);

  grantForm = new FormGroup({
    seminarCentreName: new FormControl(''),
    seminarCentreAddress: new FormControl(''),
    seminarCentreCity: new FormControl(''),
    seminarCentreState: new FormControl(''),
    phoneNumber: new FormControl('')
  });

  get canSubmit(): boolean {
    return !!this.selectedUser() && !this.loading();
  }

  onSearchUsers(): void {
    const query = this.searchVal().trim();
    if (!query) {
      this.searchResults.set([]);
      return;
    }

    this.searchLoading.set(true);
    this.usersService.getUsers({ search: query, limit: 10, offset: 0 }).subscribe({
      next: ({ users }) => {
        this.searchResults.set(users);
        this.searchLoading.set(false);
      },
      error: () => {
        this.searchResults.set([]);
        this.searchLoading.set(false);
      }
    });
  }

  selectUser(user: User): void {
    this.selectedUser.set(user);
    this.searchResults.set([]);
    this.searchVal.set(user.username || user.email);
  }

  clearSelectedUser(): void {
    this.selectedUser.set(null);
    this.searchVal.set('');
    this.searchResults.set([]);
  }

  onSubmit(): void {
    const user = this.selectedUser();
    if (!user) return;

    const formValue = this.grantForm.getRawValue();
    const body: GrantConsultantRequest = { userId: user.id };

    if (formValue.seminarCentreName?.trim()) body.seminarCentreName = formValue.seminarCentreName.trim();
    if (formValue.seminarCentreAddress?.trim()) body.seminarCentreAddress = formValue.seminarCentreAddress.trim();
    if (formValue.seminarCentreCity?.trim()) body.seminarCentreCity = formValue.seminarCentreCity.trim();
    if (formValue.seminarCentreState?.trim()) body.seminarCentreState = formValue.seminarCentreState.trim();
    if (formValue.phoneNumber?.trim()) body.phoneNumber = formValue.phoneNumber.trim();

    this.grantRequest.emit(body);
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  resetForm(): void {
    this.grantForm.reset({
      seminarCentreName: '',
      seminarCentreAddress: '',
      seminarCentreCity: '',
      seminarCentreState: '',
      phoneNumber: ''
    });
    this.clearSelectedUser();
  }
}
