# Data Table Component

A flexible, reusable PrimeNG table component for displaying tabular data with pagination, sorting, filtering, and custom actions.

## Features

- ✅ **Generic Type Support** - Fully type-safe with TypeScript generics
- ✅ **Signal-based** - Uses Angular signals for reactive state management
- ✅ **Dynamic Columns** - Configure columns with custom templates and formatters
- ✅ **Pagination** - Built-in pagination with customizable options
- ✅ **Sorting** - Column-based sorting
- ✅ **Filtering** - Global search functionality
- ✅ **Row Actions** - Configurable action buttons per row
- ✅ **Custom Templates** - Support for custom cell templates
- ✅ **Empty State** - Customizable empty state message
- ✅ **Loading State** - Built-in loading indicator
- ✅ **Responsive** - Mobile-friendly design

## Basic Usage

```typescript
import { Component, signal } from '@angular/core';
import { DataTableComponent } from '@shared/components/data-table/data-table.component';
import { TableColumn, TableAction } from '@shared/components/data-table/data-table.types';

interface User {
  id: string;
  name: string;
  email: string;
  status: string;
}

@Component({
  selector: 'app-users',
  imports: [DataTableComponent],
  template: `
    <app-data-table
      [data]="users()"
      [columns]="columns()"
      [actions]="actions()"
      [loading]="loading()">
    </app-data-table>
  `
})
export class UsersComponent {
  users = signal<User[]>([
    { id: '1', name: 'John Doe', email: 'john@example.com', status: 'Active' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' }
  ]);

  loading = signal(false);

  columns = signal<TableColumn<User>[]>([
    {
      field: 'id',
      header: 'ID',
      width: '100px',
      sortable: true
    },
    {
      field: 'name',
      header: 'Name',
      sortable: true
    },
    {
      field: 'email',
      header: 'Email',
      sortable: true
    },
    {
      field: 'status',
      header: 'Status',
      align: 'center'
    }
  ]);

  actions = signal<TableAction<User>[]>([
    {
      icon: 'pi pi-eye',
      tooltip: 'View',
      command: (user) => console.log('View', user)
    },
    {
      icon: 'pi pi-pencil',
      tooltip: 'Edit',
      command: (user) => console.log('Edit', user)
    }
  ]);
}
```

## Advanced Usage with Custom Templates

```typescript
@Component({
  selector: 'app-users-advanced',
  imports: [DataTableComponent, StatusBadgeComponent],
  template: `
    <app-data-table
      [data]="users()"
      [columns]="columns()"
      [actions]="actions()">
      
      <!-- Custom cell template -->
      <ng-template #userCell let-user>
        <div class="flex flex-col">
          <span class="font-semibold">{{ user.name }}</span>
          <span class="text-xs text-gray-500">{{ user.email }}</span>
        </div>
      </ng-template>

      <ng-template #statusCell let-user>
        <app-status-badge [status]="user.status"></app-status-badge>
      </ng-template>
    </app-data-table>
  `
})
export class UsersAdvancedComponent {
  @ViewChild('userCell') userCellTemplate!: TemplateRef<any>;
  @ViewChild('statusCell') statusCellTemplate!: TemplateRef<any>;

  columns = signal<TableColumn<User>[]>([]);

  ngAfterViewInit() {
    this.columns.set([
      {
        field: 'name',
        header: 'User',
        template: this.userCellTemplate,
        sortable: true
      },
      {
        field: 'status',
        header: 'Status',
        template: this.statusCellTemplate,
        align: 'center'
      }
    ]);
  }
}
```

## Column Configuration

### TableColumn Interface

```typescript
interface TableColumn<T> {
  field: keyof T | string;           // Field name in data object
  header: string;                     // Column header text
  width?: string;                     // Column width (e.g., '100px', '20%')
  sortable?: boolean;                 // Enable sorting
  filterable?: boolean;               // Enable filtering
  formatter?: (value: any, row: T) => string; // Custom formatter
  template?: TemplateRef<any>;        // Custom template
  class?: string;                     // CSS class for column
  headerClass?: string;               // CSS class for header
  align?: 'left' | 'center' | 'right'; // Text alignment
  hideOnMobile?: boolean;             // Hide on mobile devices
}
```

### Using Formatters

```typescript
columns = signal<TableColumn<User>[]>([
  {
    field: 'createdAt',
    header: 'Created',
    formatter: (value) => new Date(value).toLocaleDateString()
  },
  {
    field: 'amount',
    header: 'Amount',
    formatter: (value) => `$${value.toFixed(2)}`
  }
]);
```

## Action Configuration

### TableAction Interface

```typescript
interface TableAction<T> {
  icon: string;                       // PrimeIcons class
  tooltip?: string;                   // Tooltip text
  label?: string;                     // Button label
  command: (row: T) => void;          // Click handler
  visible?: (row: T) => boolean;      // Show condition
  disabled?: (row: T) => boolean;     // Disable condition
  styleClass?: string;                // Custom CSS class
  severity?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
}
```

### Conditional Actions

```typescript
actions = signal<TableAction<User>[]>([
  {
    icon: 'pi pi-check',
    tooltip: 'Activate',
    severity: 'success',
    visible: (user) => user.status === 'Inactive',
    command: (user) => this.activateUser(user)
  },
  {
    icon: 'pi pi-ban',
    tooltip: 'Deactivate',
    severity: 'danger',
    visible: (user) => user.status === 'Active',
    command: (user) => this.deactivateUser(user)
  }
]);
```

## Table Configuration

```typescript
config = input<TableConfig>({
  paginator: true,
  rows: 10,
  rowsPerPageOptions: [10, 25, 50],
  showCurrentPageReport: true,
  currentPageReportTemplate: 'Showing {first} to {last} of {totalRecords}',
  globalFilter: true,
  globalFilterPlaceholder: 'Search...',
  showGridlines: true,
  hoverable: true,
  size: 'small' // 'small' | 'normal' | 'large'
});
```

## Events

### Row Action Event

```typescript
<app-data-table
  [data]="users()"
  [columns]="columns()"
  [actions]="actions()"
  (rowAction)="handleRowAction($event)">
</app-data-table>

handleRowAction(event: RowActionEvent<User>) {
  console.log('Action:', event.action);
  console.log('Row:', event.row);
}
```

### Filter Change Event

```typescript
<app-data-table
  [data]="users()"
  [columns]="columns()"
  (filterChange)="handleFilterChange($event)">
</app-data-table>

handleFilterChange(event: FilterChangeEvent) {
  console.log('Global filter:', event.globalFilter);
}
```

## Customization

### Custom Empty State

```typescript
<app-data-table
  [data]="users()"
  [columns]="columns()"
  [emptyMessage]="'No users found'"
  [emptyIcon]="'pi pi-users'">
  
  <button pButton label="Add User" [emptyActions]></button>
</app-data-table>
```

### Custom Table Actions

```typescript
<app-data-table
  [data]="users()"
  [columns]="columns()">
  
  <div tableActions class="flex gap-2">
    <button pButton label="Export" icon="pi pi-download"></button>
    <button pButton label="Add New" icon="pi pi-plus"></button>
  </div>
</app-data-table>
```

## API Reference

### Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `data` | `T[]` | required | Array of data items |
| `columns` | `TableColumn<T>[]` | required | Column configuration |
| `actions` | `TableAction<T>[]` | `[]` | Row action buttons |
| `loading` | `boolean` | `false` | Loading state |
| `config` | `TableConfig` | see above | Table configuration |
| `emptyMessage` | `string` | `'No records found'` | Empty state message |
| `emptyIcon` | `string` | `'pi pi-inbox'` | Empty state icon |

### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `rowAction` | `RowActionEvent<T>` | Emitted when action clicked |
| `rowSelect` | `T` | Emitted when row selected |
| `filterChange` | `FilterChangeEvent` | Emitted when filters change |

## Best Practices

1. **Use Signals** - Always pass signals to inputs for reactivity
2. **Type Safety** - Specify generic type for full type safety
3. **Custom Templates** - Use templates for complex cell rendering
4. **Formatters** - Use formatters for simple value transformations
5. **Conditional Actions** - Use `visible` and `disabled` for dynamic actions
6. **Performance** - Use `trackBy` in parent component for large datasets
