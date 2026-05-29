import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StockRefreshService {
  private readonly refreshSubject = new Subject<string[]>();
  readonly refresh$ = this.refreshSubject.asObservable();

  emit(productIds: string[]): void {
    const filtered = (productIds || []).filter(Boolean);
    if (filtered.length === 0) return;
    this.refreshSubject.next(filtered);
  }
}
