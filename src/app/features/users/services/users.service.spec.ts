import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  UI_STATUS_TO_API,
  UsersListQuery,
  UsersService,
} from './users.service';

describe('UsersService.getUsers — status filter query', () => {
  let service: UsersService;
  let apiGet: jasmine.Spy;

  beforeEach(() => {
    apiGet = jasmine.createSpy('get').and.returnValue(
      of({ users: [], total: 0, limit: 20, offset: 0 })
    );

    TestBed.configureTestingModule({
      providers: [
        UsersService,
        { provide: ApiService, useValue: { get: apiGet } },
      ],
    });

    service = TestBed.inject(UsersService);
  });

  function lastParams(): UsersListQuery {
    expect(apiGet).toHaveBeenCalled();
    const [, params] = apiGet.calls.mostRecent().args as [string, UsersListQuery];
    expect(apiGet.calls.mostRecent().args[0]).toBe('admin/users');
    return params;
  }

  it('maps UI statuses to API status values', () => {
    expect(UI_STATUS_TO_API['Registered']).toBe('REGISTERED');
    expect(UI_STATUS_TO_API['Activated']).toBe('ACTIVATED');
    expect(UI_STATUS_TO_API['Active']).toBe('ACTIVE');
    expect(UI_STATUS_TO_API['Inactive']).toBe('INACTIVE');
    expect(UI_STATUS_TO_API['Suspended']).toBe('SUSPENDED');
  });

  it('sends status=SUSPENDED without isActive/isRegistrationPaid', () => {
    service.getUsers({ status: 'SUSPENDED', limit: 20, offset: 0 }).subscribe();
    const params = lastParams();
    expect(params.status).toBe('SUSPENDED');
    expect(params.isActive).toBeUndefined();
    expect(params.isRegistrationPaid).toBeUndefined();
  });

  it('sends status=REGISTERED', () => {
    service.getUsers({ status: 'REGISTERED', limit: 20, offset: 0 }).subscribe();
    expect(lastParams().status).toBe('REGISTERED');
  });

  it('sends status=ACTIVATED', () => {
    service.getUsers({ status: 'ACTIVATED', limit: 20, offset: 0 }).subscribe();
    expect(lastParams().status).toBe('ACTIVATED');
  });

  it('sends status=ACTIVE (distinct from ACTIVATED / INACTIVE)', () => {
    service.getUsers({ status: 'ACTIVE', limit: 20, offset: 0 }).subscribe();
    expect(lastParams().status).toBe('ACTIVE');
  });

  it('sends status=INACTIVE', () => {
    service.getUsers({ status: 'INACTIVE', limit: 20, offset: 0 }).subscribe();
    expect(lastParams().status).toBe('INACTIVE');
  });

  it('combines status with package', () => {
    service
      .getUsers({ status: 'ACTIVE', package: 'GOLD', limit: 20, offset: 0 })
      .subscribe();
    const params = lastParams();
    expect(params.status).toBe('ACTIVE');
    expect(params.package).toBe('GOLD');
  });

  it('combines status with search', () => {
    service
      .getUsers({ status: 'INACTIVE', search: 'ada', limit: 20, offset: 0 })
      .subscribe();
    const params = lastParams();
    expect(params.status).toBe('INACTIVE');
    expect(params.search).toBe('ada');
  });

  it('combines status with package and search', () => {
    service
      .getUsers({
        status: 'ACTIVE',
        package: 'SILVER',
        search: 'john',
        limit: 20,
        offset: 0,
      })
      .subscribe();
    const params = lastParams();
    expect(params).toEqual(
      jasmine.objectContaining({
        status: 'ACTIVE',
        package: 'SILVER',
        search: 'john',
        limit: 20,
        offset: 0,
      })
    );
  });

  it('omits status when listing without a status filter', () => {
    service.getUsers({ limit: 20, offset: 0 }).subscribe();
    expect(lastParams().status).toBeUndefined();
  });
});
