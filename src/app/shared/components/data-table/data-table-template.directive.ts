import { Directive, input, TemplateRef, inject } from '@angular/core';

@Directive({
  selector: 'ng-template[appDataTableTemplate]'
})
export class DataTableTemplateDirective {
  /**
   * The field name of the column this template belongs to.
   */
  name = input.required<string>({ alias: 'appDataTableTemplate' });
  
  templateRef = inject(TemplateRef<unknown>);
}
