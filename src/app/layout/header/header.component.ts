import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';

@Component({
  selector: 'app-header',
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, AvatarModule, BadgeModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  userName = input('Admin User');
  userAvatar = input('');
  
  searchQuery = new FormControl('');
  
  notifications = 3;
  messages = 5;
}

