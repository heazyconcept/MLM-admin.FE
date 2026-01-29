# Data Table Component - Quick Start

## Installation

The component is located at:
```
src/app/shared/components/data-table/
```

## Basic Usage

### 1. Import the Component

```typescript
import { DataTableComponent } from '@shared/components/data-table/data-table.component';
import { TableColumn, TableAction } from '@shared/components/data-table/data-table.types';
```

### 2. Define Your Data Model

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  status: string;
}
```

### 3. Configure Columns

```typescript
columns = signal<TableColumn<User>[]>([
  { field: 'id', header: 'ID', width: '100px', sortable: true },
  { field: 'name', header: 'Name', sortable: true },
  { field: 'email', header: 'Email', sortable: true },
  { field: 'status', header: 'Status', align: 'center' }
]);
```

### 4. Configure Actions (Optional)

```typescript
actions = signal<TableAction<User>[]>([
  {
    icon: 'pi pi-eye',
    tooltip: 'View',
    command: (user) => this.viewUser(user)
  },
  {
    icon: 'pi pi-pencil',
    tooltip: 'Edit',
    command: (user) => this.editUser(user)
  }
]);
```

### 5. Add to Template

```html
<app-data-table
  [data]="users()"
  [columns]="columns()"
  [actions]="actions()">
</app-data-table>
```

## Common Patterns

### With Custom Cell Template

```typescript
@ViewChild('customCell') customCellTemplate!: TemplateRef<any>;

ngAfterViewInit() {
  this.columns.set([
    {
      field: 'name',
      header: 'User',
      template: this.customCellTemplate
    }
  ]);
}
```

```html
<app-data-table [data]="users()" [columns]="columns()">
  <ng-template #customCell let-user>
    <div class="flex items-center gap-2">
      <img [src]="user.avatar" class="w-8 h-8 rounded-full">
      <span>{{ user.name }}</span>
    </div>
  </ng-template>
</app-data-table>
```

### With Value Formatter

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

### With Conditional Actions

```typescript
actions = signal<TableAction<User>[]>([
  {
    icon: 'pi pi-ban',
    tooltip: 'Suspend',
    severity: 'danger',
    visible: (user) => user.status === 'Active',
    command: (user) => this.suspendUser(user)
  },
  {
    icon: 'pi pi-check',
    tooltip: 'Activate',
    severity: 'success',
    visible: (user) => user.status === 'Suspended',
    command: (user) => this.activateUser(user)
  }
]);
```

### With Custom Configuration

```typescript
tableConfig = signal<TableConfig>({
  paginator: true,
  rows: 25,
  rowsPerPageOptions: [10, 25, 50, 100],
  globalFilter: true,
  globalFilterPlaceholder: 'Search users...',
  size: 'small'
});
```

```html
<app-data-table
  [data]="users()"
  [columns]="columns()"
  [config]="tableConfig()">
</app-data-table>
```

## Full Example

```typescript
@Component({
  selector: 'app-users-list',
  imports: [DataTableComponent],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-4">Users</h1>
      
      <app-data-table
        [data]="users()"
        [columns]="columns()"
        [actions]="actions()"
        [loading]="loading()">
        
        <div tableActions>
          <button pButton label="Add User" icon="pi pi-plus"></button>
        </div>
      </app-data-table>
    </div>
  `
})
export class UsersListComponent {
  users = signal<User[]>([]);
  loading = signal(false);
  
  columns = signal<TableColumn<User>[]>([
    { field: 'id', header: 'ID', width: '100px', sortable: true },
    { field: 'name', header: 'Name', sortable: true },
    { field: 'email', header: 'Email', sortable: true },
    { field: 'status', header: 'Status', align: 'center' }
  ]);
  
  actions = signal<TableAction<User>[]>([
    {
      icon: 'pi pi-eye',
      tooltip: 'View',
      command: (user) => this.router.navigate(['/users', user.id])
    }
  ]);
}
```

## Tips

- Always use signals for reactive data
- Specify generic type for type safety: `TableColumn<User>`
- Use templates for complex cell rendering
- Use formatters for simple value transformations
- Use `visible` and `disabled` functions for dynamic actions
- Add `tableActions` slot for custom buttons above the table

For more details, see [README.md](./README.md)
