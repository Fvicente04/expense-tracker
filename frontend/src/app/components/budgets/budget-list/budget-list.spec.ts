import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BudgetListComponent } from './budget-list';

describe('BudgetListComponent', () => {
  let component: BudgetListComponent;
  let fixture: ComponentFixture<BudgetListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BudgetListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });
     
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});