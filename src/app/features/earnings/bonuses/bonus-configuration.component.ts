import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EarningsService, BonusRule } from '../services/earnings.service';

@Component({
  selector: 'app-bonus-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputNumberModule, CardModule, TagModule, ToastModule],
  providers: [MessageService],
  templateUrl: './bonus-configuration.component.html'
})
export class BonusConfigurationComponent {
  earningsService = inject(EarningsService);
  messageService = inject(MessageService);
  
  bonuses = this.earningsService.bonuses;
  
  // Track editing state locally
  editingId = signal<string | null>(null);
  editValues: Record<string, number> = {};

  isEditing(id: string): boolean {
    return this.editingId() === id;
  }

  startEdit(bonus: BonusRule) {
    this.editValues[bonus.id] = bonus.value;
    this.editingId.set(bonus.id);
  }

  cancelEdit(id: string) {
    this.editingId.set(null);
    delete this.editValues[id];
  }

  saveEdit(bonus: BonusRule) {
    const newValue = this.editValues[bonus.id];
    if (newValue !== undefined) {
      this.earningsService.updateBonus({ ...bonus, value: newValue });
      this.messageService.add({ severity: 'success', summary: 'Updated', detail: `${bonus.name} value updated successfully.` });
      this.cancelEdit(bonus.id);
    }
  }
}
