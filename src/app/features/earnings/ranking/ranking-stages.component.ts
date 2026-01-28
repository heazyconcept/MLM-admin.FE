import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { EarningsService } from '../services/earnings.service';

@Component({
  selector: 'app-ranking-stages',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, TagModule],
  templateUrl: './ranking-stages.component.html'
})
export class RankingStagesComponent {
  earningsService = inject(EarningsService);
  ranks = this.earningsService.ranks;
}
