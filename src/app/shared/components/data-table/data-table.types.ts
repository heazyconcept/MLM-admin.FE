import { TemplateRef } from '@angular/core';

/**
 * Formatter function type for custom cell value formatting
 */
export type CellFormatter<T> = (value: any, row: T) => string | number | boolean;

/**
 * Column configuration for the data table
 */
export interface TableColumn<T = any> {
  /** Field name in the data object */
  field: keyof T | string;
  
  /** Column header text */
  header: string;
  
  /** Column width (e.g., '100px', '20%') */
  width?: string;
  
  /** Enable sorting for this column */
  sortable?: boolean;
  
  /** Enable filtering for this column */
  filterable?: boolean;
  
  /** Custom formatter function for cell values */
  formatter?: CellFormatter<T>;
  
  /** Template reference for custom cell rendering */
  template?: TemplateRef<any>;
  
  /** CSS class for the column */
  class?: string;
  
  /** CSS class for the header */
  headerClass?: string;
  
  /** Align text (left, center, right) */
  align?: 'left' | 'center' | 'right';
  
  /** Hide column on mobile */
  hideOnMobile?: boolean;
}

/**
 * Action button configuration for table rows
 */
export interface TableAction<T = any> {
  /** Icon class (PrimeIcons) */
  icon: string;
  
  /** Tooltip text */
  tooltip?: string;
  
  /** Button label (if not using icon-only) */
  label?: string;
  
  /** Command to execute when clicked */
  command: (row: T) => void;
  
  /** Show condition based on row data */
  visible?: (row: T) => boolean;
  
  /** Disable condition based on row data */
  disabled?: (row: T) => boolean;
  
  /** Button style class */
  styleClass?: string;
  
  /** Severity (primary, secondary, success, danger, warning, info) */
  severity?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
}

/**
 * General table configuration
 */
export interface TableConfig {
  /** Enable pagination */
  paginator?: boolean;
  
  /** Rows per page */
  rows?: number;
  
  /** Rows per page options */
  rowsPerPageOptions?: number[];
  
  /** Show current page report */
  showCurrentPageReport?: boolean;
  
  /** Current page report template */
  currentPageReportTemplate?: string;
  
  /** Enable global filter */
  globalFilter?: boolean;
  
  /** Global filter placeholder */
  globalFilterPlaceholder?: string;
  
  /** Fields to search in global filter */
  globalFilterFields?: string[];
  
  /** Show gridlines */
  showGridlines?: boolean;
  
  /** Enable row hover effect */
  hoverable?: boolean;
  
  /** Table size (small, normal, large) */
  size?: 'small' | 'normal' | 'large';
  
  /** Enable selection */
  selectable?: boolean;
  
  /** Selection mode (single, multiple) */
  selectionMode?: 'single' | 'multiple';
  
  /** Enable export */
  exportable?: boolean;
  
  /** Export filename */
  exportFilename?: string;
}

/**
 * Event emitted when a row action is triggered
 */
export interface RowActionEvent<T = any> {
  /** The action that was triggered */
  action: TableAction<T>;
  
  /** The row data */
  row: T;
}

/**
 * Event emitted when filters change
 */
export interface FilterChangeEvent {
  /** Global filter value */
  globalFilter?: string;
  
  /** Column-specific filters */
  filters?: Record<string, any>;
}
