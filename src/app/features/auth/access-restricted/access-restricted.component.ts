import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-access-restricted',
  imports: [CommonModule, RouterLink, ButtonModule],
  templateUrl: './access-restricted.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccessRestrictedComponent {}
