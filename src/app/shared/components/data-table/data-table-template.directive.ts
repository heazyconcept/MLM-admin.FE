import { Directive, input, TemplateRef } from '@angular/core';

@Directive({
  selector: 'ng-template[appDataTableTemplate]',
  standalone: true
})
export class DataTableTemplateDirective {
  /**
   * The field name of the column this template belongs to.
   */
  name = input.required<string>({ alias: 'appDataTableTemplate' });
  
  constructor(public templateRef: TemplateRef<any>) {}
}
