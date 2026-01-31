import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { EarningsService } from '../services/earnings.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { DataTableTemplateDirective } from '../../../shared/components/data-table/data-table-template.directive';
import { TableColumn, TableConfig, TableAction } from '../../../shared/components/data-table/data-table.types';

@Component({
  selector: 'app-ranking-stages',
  imports: [CommonModule, TableModule, ButtonModule, TagModule, DataTableComponent, DataTableTemplateDirective],
  templateUrl: './ranking-stages.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RankingStagesComponent {
  earningsService = inject(EarningsService);
  ranks = this.earningsService.ranks;

  columns = signal<TableColumn<unknown>[]>([
    {
      field: 'level',
      header: 'Level',
      width: '100px',
      align: 'center'
      // Custom template
    },
    {
      field: 'name',
      header: 'Rank Name'
      // Custom template
    },
    {
      field: 'requirements',
      header: 'Requirements (Personal / Team / Directs)'
      // Custom template
    },
    {
      field: 'benefits',
      header: 'Benefits (Bonus / Cap)'
      // Custom template
    }
  ]);

  tableConfig = signal<TableConfig>({
    paginator: false,
    hoverable: true,
    size: 'large'
  });

  actions = signal<TableAction<unknown>[]>([
    {
      icon: 'pi pi-pencil',
      command: (row) => console.log('Edit rank', row),
      severity: 'secondary'
    }
  ]);
}
