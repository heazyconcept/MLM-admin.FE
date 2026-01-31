import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../../src/app/core/services/modal.service';

@Component({
  selector: 'app-modal',
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModalComponent {
  modalService = inject(ModalService);

  close() {
    this.modalService.close();
  }
}
