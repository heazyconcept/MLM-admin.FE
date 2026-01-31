import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EarningsService, BonusRule } from '../services/earnings.service';

@Component({
  selector: 'app-bonus-configuration',
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputNumberModule, CardModule, TagModule, ToastModule],
  providers: [MessageService],
  templateUrl: './bonus-configuration.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BonusConfigurationComponent {
  earningsService = inject(EarningsService);
  messageService = inject(MessageService);
  
  bonuses = this.earningsService.bonuses;
  
  // Track editing state locally
  editingId = signal<string | null>(null);
  editControls: Record<string, FormControl<number | null>> = {};

  isEditing(id: string): boolean {
    return this.editingId() === id;
  }

  getEditControl(id: string): FormControl<number | null> {
    if (!this.editControls[id]) {
      this.editControls[id] = new FormControl<number | null>(null);
    }
    return this.editControls[id];
  }

  startEdit(bonus: BonusRule) {
    this.getEditControl(bonus.id).setValue(bonus.value);
    this.editingId.set(bonus.id);
  }

  cancelEdit(id: string) {
    this.editingId.set(null);
    if (this.editControls[id]) {
      this.editControls[id].reset();
    }
  }

  saveEdit(bonus: BonusRule) {
    const newValue = this.editControls[bonus.id]?.value;
    if (newValue !== undefined && newValue !== null) {
      this.earningsService.updateBonus({ ...bonus, value: newValue });
      this.messageService.add({ severity: 'success', summary: 'Updated', detail: `${bonus.name} value updated successfully.` });
      this.cancelEdit(bonus.id);
    }
  }
}
