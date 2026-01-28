import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { UserFilters, UserStatus, UserPackage, UserRole } from '../services/users.service';

@Component({
  selector: 'app-user-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, SelectModule, ButtonModule],
  templateUrl: './user-filters.component.html',
  styleUrls: ['./user-filters.component.css']
})
export class UserFiltersComponent {
  @Output() filtersChange = new EventEmitter<UserFilters>();
  @Output() exportClick = new EventEmitter<void>();

  filters: UserFilters = {
    search: '',
    status: '',
    package: '',
    role: '',
    dateFrom: null,
    dateTo: null
  };

  statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Active', value: 'Active' },
    { label: 'Suspended', value: 'Suspended' },
    { label: 'Flagged', value: 'Flagged' }
  ];

  packageOptions = [
    { label: 'All Packages', value: '' },
    { label: 'Silver', value: 'Silver' },
    { label: 'Gold', value: 'Gold' },
    { label: 'Platinum', value: 'Platinum' },
    { label: 'Ruby', value: 'Ruby' },
    { label: 'Diamond', value: 'Diamond' }
  ];

  roleOptions = [
    { label: 'All Roles', value: '' },
    { label: 'User', value: 'User' },
    { label: 'Merchant', value: 'Merchant' }
  ];

  onFilterChange(): void {
    this.filtersChange.emit(this.filters);
  }

  onSearch(): void {
    this.filtersChange.emit(this.filters);
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      status: '',
      package: '',
      role: '',
      dateFrom: null,
      dateTo: null
    };
    this.filtersChange.emit(this.filters);
  }

  onExport(): void {
    this.exportClick.emit();
  }
}

