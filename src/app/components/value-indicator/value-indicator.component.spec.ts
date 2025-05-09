import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValueIndicatorComponent } from './value-indicator.component';

describe('ValueIndicatorComponent', () => {
  let component: ValueIndicatorComponent;
  let fixture: ComponentFixture<ValueIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValueIndicatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValueIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
