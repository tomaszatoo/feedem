import { TestBed } from '@angular/core/testing';

import { LlmsService } from './llms.service';

describe('LlmsService', () => {
  let service: LlmsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LlmsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
