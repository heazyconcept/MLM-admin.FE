import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

export interface CompanyBankAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

@Injectable({
  providedIn: 'root',
})
export class CompanyBankAccountService {
  private readonly api = inject(ApiService);

  get(): Observable<CompanyBankAccount> {
    return this.api.get<CompanyBankAccount>('admin/company-bank-account');
  }

  update(body: CompanyBankAccount): Observable<CompanyBankAccount> {
    return this.api.put<CompanyBankAccount>('admin/company-bank-account', body);
  }
}
