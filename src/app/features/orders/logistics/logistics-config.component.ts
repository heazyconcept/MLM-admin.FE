import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';

import { OrderService } from '../../../core/services/order.service';
import { LogisticsRule } from '../../../core/models/order.model';

@Component({
  selector: 'app-logistics-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    ToggleSwitchModule,
    DialogModule,
    TagModule
  ],
  templateUrl: './logistics-config.component.html',
  styleUrls: ['./logistics-config.component.css']
})
export class LogisticsConfigComponent {
  private orderService = inject(OrderService);
  private fb = inject(FormBuilder);

  rules = this.orderService.logisticsRules;
  showDialog = signal(false);

  ruleForm = this.fb.group({
    name: ['', Validators.required],
    type: ['Flat' as const, Validators.required],
    cost: [0, [Validators.required, Validators.min(0)]],
    condition: ['']
  });

  typeOptions = [
    { label: 'Flat Rate', value: 'Flat' },
    { label: 'Region Based', value: 'Region' },
    { label: 'Weight Based', value: 'Weight' }
  ];

  openAddRule() {
    this.ruleForm.reset({
      type: 'Flat',
      cost: 0
    });
    this.showDialog.set(true);
  }

  saveRule() {
    if (this.ruleForm.valid) {
      this.orderService.addLogisticsRule(this.ruleForm.value as Partial<LogisticsRule>);
      this.showDialog.set(false);
    }
  }

  toggleRule(rule: LogisticsRule) {
    this.orderService.toggleRuleStatus(rule.id);
  }
}
