import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { RouterModule } from '@angular/router';
import { SystemConfigService, RankingRule } from '../../system/services/system-config.service';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { TableColumn, TableConfig } from '../../../shared/components/data-table/data-table.types';

@Component({
  selector: 'app-ranking-stages',
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TagModule,
    RouterModule,
    DataTableComponent
  ],
  templateUrl: './ranking-stages.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RankingStagesComponent implements OnInit {
  private readonly config = inject(SystemConfigService);

  rankingRules = this.config.rankingRules;
  rankingLoading = this.config.rankingLoading;
  rankingError = this.config.rankingError;

  columns = signal<TableColumn<RankingRule>[]>([
    { field: 'stage', header: 'Stage', width: '100px', align: 'center' },
    { field: 'rankName', header: 'Rank name' },
    { field: 'requiredLevel', header: 'Required level', width: '140px', align: 'center' },
    { field: 'bonusAmount', header: 'Bonus amount', width: '140px', align: 'right' }
  ]);

  tableHeaders = computed(() => this.columns().map((c) => c.header));

  tableConfig = signal<TableConfig>({
    paginator: false,
    hoverable: true,
    size: 'large'
  });

  ngOnInit(): void {
    this.config.loadRankingRules().subscribe();
  }
}
