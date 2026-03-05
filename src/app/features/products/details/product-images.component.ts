import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  signal,
  computed,
  effect,
  untracked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService } from 'primeng/api';
import { AdminProductsService } from '../services/admin-products.service';
import { ProductImage } from '../../../core/models/product.model';

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGES = 10;

@Component({
  selector: 'app-product-images',
  imports: [CommonModule, ButtonModule, TooltipModule, ProgressBarModule],
  template: `
    <section class="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="text-base font-semibold text-gray-900">Product Images</h2>
          <p class="text-xs text-gray-500 mt-0.5">{{ images().length }} / {{ maxImages }} images · JPEG, PNG, WebP · Max 10 MB each</p>
        </div>
        @if (images().length < maxImages) {
          <button
            pButton
            icon="pi pi-upload"
            label="Upload"
            severity="secondary"
            class="text-sm"
            [loading]="uploading()"
            (click)="fileInput.click()">
          </button>
        }
      </div>

      <!-- Hidden file input -->
      <input
        #fileInput
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        class="hidden"
        (change)="onFilesSelected($event)" />

      <!-- Upload progress -->
      @if (uploading()) {
        <div class="mb-4">
          <p-progressBar mode="indeterminate" [style]="{ height: '4px' }"></p-progressBar>
          <p class="text-xs text-gray-500 mt-1">Uploading {{ pendingCount() }} image{{ pendingCount() > 1 ? 's' : '' }}...</p>
        </div>
      }

      <!-- Image grid -->
      @if (images().length > 0) {
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          @for (img of images(); track img.id; let i = $index) {
            <div class="flex flex-col">
              <div
                class="group relative aspect-square rounded-lg border-2 overflow-hidden bg-gray-50 transition-all"
                [class.border-blue-500]="dragOverIndex() === i"
                [class.border-gray-200]="dragOverIndex() !== i"
                [class.opacity-50]="draggedIndex() === i"
                draggable="true"
                (dragstart)="onDragStart(i)"
                (dragover)="onDragOver($event, i)"
                (dragleave)="onDragLeave()"
                (drop)="onDrop($event, i)"
                (dragend)="onDragEnd()">

                <img
                  [src]="img.url"
                  [alt]="img.altText || 'Product image'"
                  class="w-full h-full object-cover" />

                <!-- Position badge -->
                <div class="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] font-bold rounded px-1.5 py-0.5">
                  {{ i + 1 }}
                </div>

                <!-- Hover overlay with actions -->
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <!-- Move left -->
                  @if (i > 0) {
                    <button
                      pButton
                      icon="pi pi-arrow-left"
                      [rounded]="true"
                      [text]="true"
                      severity="contrast"
                      class="!w-8 !h-8"
                      pTooltip="Move left"
                      tooltipPosition="top"
                      (click)="onMoveImage(i, i - 1)">
                    </button>
                  }
                  <!-- Move right -->
                  @if (i < images().length - 1) {
                    <button
                      pButton
                      icon="pi pi-arrow-right"
                      [rounded]="true"
                      [text]="true"
                      severity="contrast"
                      class="!w-8 !h-8"
                      pTooltip="Move right"
                      tooltipPosition="top"
                      (click)="onMoveImage(i, i + 1)">
                    </button>
                  }
                  <!-- Delete -->
                  <button
                    pButton
                    icon="pi pi-trash"
                    [rounded]="true"
                    [text]="true"
                    severity="danger"
                    class="!w-8 !h-8"
                    pTooltip="Delete"
                    tooltipPosition="top"
                    [loading]="deletingId() === img.id"
                    (click)="onDelete(img)">
                  </button>
                </div>
              </div>

              <!-- Primary badge below image -->
              @if (i === 0) {
                <div class="mt-1.5 flex justify-center">
                  <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold border border-amber-200">
                    <i class="pi pi-star-fill text-[8px]"></i>Primary
                  </span>
                </div>
              }
            </div>
          }
        </div>
      } @else if (!uploading()) {
        <!-- Empty state -->
        <div
          class="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-400 transition-colors"
          (click)="fileInput.click()">
          <div class="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <i class="pi pi-image text-xl text-gray-400"></i>
          </div>
          <p class="text-sm font-medium text-gray-700">No images yet</p>
          <p class="text-xs text-gray-400 mt-1">Click to upload product images</p>
          <p class="text-[11px] text-gray-400 mt-0.5">Supports JPEG, PNG, WebP · Max 10 MB per file</p>
        </div>
      }
    </section>
  `,
  styles: [`
    :host { display: block; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductImagesComponent {
  private adminProducts = inject(AdminProductsService);
  private messageService = inject(MessageService);

  /** Product ID (required) */
  productId = input.required<string>();

  /** Initial images from parent (e.g., loaded from API) */
  initialImages = input<ProductImage[]>([]);

  /** Image list managed internally */
  images = signal<ProductImage[]>([]);

  uploading = signal(false);

  constructor() {
    // Sync initial images to internal state (only when local list is still empty)
    effect(() => {
      const initial = this.initialImages();
      if (initial.length > 0 && untracked(() => this.images().length) === 0) {
        this.images.set([...initial]);
      }
    });
  }
  pendingCount = signal(0);
  deletingId = signal<string | null>(null);

  // Drag-and-drop state
  draggedIndex = signal<number | null>(null);
  dragOverIndex = signal<number | null>(null);

  readonly maxImages = MAX_IMAGES;

  remainingSlots = computed(() => MAX_IMAGES - this.images().length);

  // ── Upload ───────────────────────────────────────────────────────

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const fileList = input.files;
    if (!fileList || fileList.length === 0) return;

    let files = Array.from(fileList);
    input.value = ''; // reset so same file can be re-selected

    // Validate count
    const remaining = this.remainingSlots();
    if (files.length > remaining) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Too many files',
        detail: `Only ${remaining} more image${remaining !== 1 ? 's' : ''} allowed. Extra files were skipped.`
      });
      files = files.slice(0, remaining);
    }
    if (files.length === 0) return;

    // Validate types + sizes
    const valid: File[] = [];
    for (const file of files) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Invalid file type',
          detail: `"${file.name}" is not a supported image format.`
        });
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        this.messageService.add({
          severity: 'warn',
          summary: 'File too large',
          detail: `"${file.name}" exceeds the 10 MB limit.`
        });
        continue;
      }
      valid.push(file);
    }
    if (valid.length === 0) return;

    this.uploading.set(true);
    this.pendingCount.set(valid.length);

    this.adminProducts.uploadImages(this.productId(), valid).subscribe({
      next: (imgs) => {
        this.images.set(imgs);
        this.messageService.add({
          severity: 'success',
          summary: 'Uploaded',
          detail: `${valid.length} image${valid.length > 1 ? 's' : ''} uploaded successfully.`
        });
        this.uploading.set(false);
      },
      error: (err: any) => {
        const msg = err?.error?.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Upload Failed',
          detail: Array.isArray(msg) ? msg.join('. ') : (msg || 'Could not upload images.')
        });
        this.uploading.set(false);
      }
    });
  }

  // ── Delete ───────────────────────────────────────────────────────

  onDelete(img: ProductImage): void {
    this.deletingId.set(img.id);
    this.adminProducts.deleteImage(this.productId(), img.id).subscribe({
      next: () => {
        this.images.update((list) => list.filter((i) => i.id !== img.id));
        this.messageService.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Image removed.'
        });
        this.deletingId.set(null);
      },
      error: (err: any) => {
        const msg = err?.error?.message;
        this.messageService.add({
          severity: 'error',
          summary: 'Delete Failed',
          detail: Array.isArray(msg) ? msg.join('. ') : (msg || 'Could not delete image.')
        });
        this.deletingId.set(null);
      }
    });
  }

  // ── Reorder (arrow buttons) ──────────────────────────────────────

  onMoveImage(fromIndex: number, toIndex: number): void {
    const list = [...this.images()];
    const [item] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, item);
    this.images.set(list);
    this.persistOrder(list);
  }

  // ── Drag and drop ────────────────────────────────────────────────

  onDragStart(index: number): void {
    this.draggedIndex.set(index);
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (this.draggedIndex() !== index) {
      this.dragOverIndex.set(index);
    }
  }

  onDragLeave(): void {
    this.dragOverIndex.set(null);
  }

  onDrop(event: DragEvent, toIndex: number): void {
    event.preventDefault();
    const fromIndex = this.draggedIndex();
    this.dragOverIndex.set(null);
    this.draggedIndex.set(null);
    if (fromIndex == null || fromIndex === toIndex) return;
    this.onMoveImage(fromIndex, toIndex);
  }

  onDragEnd(): void {
    this.draggedIndex.set(null);
    this.dragOverIndex.set(null);
  }

  // ── Persist order to backend ─────────────────────────────────────

  private persistOrder(list: ProductImage[]): void {
    const order = list.map((img, i) => ({ id: img.id, position: i }));
    this.adminProducts.reorderImages(this.productId(), order).subscribe({
      next: (imgs) => {
        this.images.set(imgs);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Reorder Failed',
          detail: 'Could not save new image order.'
        });
      }
    });
  }
}
