---
name: coding-standards
description: Apply repetitive coding standards and best practices for Angular/TypeScript based on user guidelines.
---

# Coding Standards & Best Practices

You must follow these standards when writing code for this project.

## TypeScript

- **Strict Type Checking**: Always use strict types.
- **Type Inference**: Prefer inference when the type is obvious.
- **Avoid `any`**: Use `unknown` if the type is uncertain, never `any`.

## Angular

- **Standalone Components**: Always use standalone components (`standalone: true` is default in v19+, do not explicitly set it if using v19+ logic, but user said v20+ default so be careful. User said "Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.").
- **Signals**: Use signals for state management.
- **Lazy Loading**: Implement lazy loading for feature routes.
- **Host Bindings**: Do NOT use `@HostBinding` or `@HostListener`. Use the `host` property in `@Component`/`@Directive`.
- **Images**: Use `NgOptimizedImage` for static images (except inline base64).

## Accessibility (A11y)

- **AXE Checks**: Must pass all AXE checks.
- **WCAG AA**: Must follow WCAG AA minimums (contrast, focus, ARIA).

## Components

- **Single Responsibility**: Keep components small.
- **Inputs/Outputs**: Use `input()` and `output()` functions, not decorators.
- **Derived State**: Use `computed()`.
- **Change Detection**: `changeDetection: ChangeDetectionStrategy.OnPush`.
- **Inline Templates**: Prefer for small components.
- **Forms**: Reactive forms > Template-driven.
- **Class/Style**: Use `class` and `style` bindings (no `ngClass`/`ngStyle`).
- **Relative Paths**: Use relative paths for external templates/styles.
- **Mobile Friendly**: Ensure responsiveness.

## State Management

- **Local State**: Use signals.
- **Derived State**: Use `computed()`.
- **immutability**: Do NOT use `mutate` on signals; use `update` or `set`.

## Templates

- **Control Flow**: Use `@if`, `@for`, `@switch`.
- **Async Pipe**: Handle observables with `| async`.
- **No Globals**: Avoid globals like `new Date()` in templates.
- **No Arrow Functions**: Do not use arrow functions in templates.

## Services

- **Single Responsibility**: One purpose per service.
- **Singleton**: `providedIn: 'root'`.
- **Injection**: Use `inject()` function.

## Styling (Tailwind CSS)

- **Exclusive Use**: Use Tailwind CSS exclusively.
- **No Hardcoded Colors**: Use Tailwind config colors.
- **Consistency**: Maintain consistent spacing/typography.

## UI/UX

- **Design**: Modern, polished, professional.
- **Icons**: PrimeIcons or Font Awesome only.
- **Aesthetics**: Premium, avoiding generic looks.

## Development

- **Naming**: Consistent naming conventions.
- **Clean Code**: Readable, commented where necessary.
