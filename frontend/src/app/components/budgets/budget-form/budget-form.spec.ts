import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BudgetForm } from './budget-form';

describe('BudgetForm', () => {
  let component: BudgetForm;
  let fixture: ComponentFixture<BudgetForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BudgetForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
