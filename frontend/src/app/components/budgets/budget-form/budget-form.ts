import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BudgetService } from '../../../services/budget';
import { CategoryService } from '../../../services/category';
import { Category } from '../../../models/category';
import { NavbarComponent } from '../../layout/navbar/navbar';

@Component({
  selector: 'app-budget-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './budget-form.html',
  styleUrls: ['./budget-form.css']
})
export class BudgetFormComponent implements OnInit {
  form!: FormGroup;
  isLoading = false;
  errorMessage = '';
  editMode = false;
  budgetId: string | null = null;

  categories: Category[] = [];
  expenseCats: Category[] = [];

  currentMonth = new Date().getMonth() + 1;
  currentYear  = new Date().getFullYear();

  months = [
    { value: 1,  label: 'January'   },
    { value: 2,  label: 'February'  },
    { value: 3,  label: 'March'     },
    { value: 4,  label: 'April'     },
    { value: 5,  label: 'May'       },
    { value: 6,  label: 'June'      },
    { value: 7,  label: 'July'      },
    { value: 8,  label: 'August'    },
    { value: 9,  label: 'September' },
    { value: 10, label: 'October'   },
    { value: 11, label: 'November'  },
    { value: 12, label: 'December'  },
  ];

  years: number[] = [];

  constructor(
    private fb: FormBuilder,
    private budgetService: BudgetService,
    private categoryService: CategoryService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    for (let i = -1; i <= 2; i++) this.years.push(this.currentYear + i);
  }

  ngOnInit(): void {
    this.init();
    this.loadCats();
    this.budgetId = this.route.snapshot.paramMap.get('id');
    if (this.budgetId) { this.editMode = true; this.loadById(this.budgetId); }
  }

  private init(): void {
    this.form = this.fb.group({
      category_id: ['',   Validators.required],
      amount:      [null, [Validators.required, Validators.min(0.01)]],
      month:       [this.currentMonth, Validators.required],
      year:        [this.currentYear,  Validators.required]
    });
  }

  private loadCats(): void {
    this.categoryService.getAll().subscribe({
      next: (data: any) => {
        this.categories  = data;
        this.expenseCats = data.filter((c: Category) => c.type === 'expense');
      },
      error: () => { this.errorMessage = 'Failed to load categories'; }
    });
  }

  private loadById(id: string): void {
    this.isLoading = true;
    this.budgetService.getById(id).subscribe({
      next: (data: any) => {
        this.form.patchValue({
          category_id: data.category_id,
          amount:      data.amount,
          month:       data.month,
          year:        data.year
        });
        this.isLoading = false;
      },
      error: () => { this.errorMessage = 'Failed to load budget'; this.isLoading = false; }
    });
  }

  selectedCat(): Category | undefined {
    return this.categories.find(c => c.id === this.form.get('category_id')?.value);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(k => this.form.get(k)?.markAsTouched());
      return;
    }
    this.isLoading    = true;
    this.errorMessage = '';
    const payload     = this.form.value;
    const op = (this.editMode && this.budgetId)
      ? this.budgetService.update(this.budgetId, payload)
      : this.budgetService.create(payload);
    op.subscribe({
      next:  () => this.router.navigate(['/budgets']),
      error: (e: any) => {
        this.isLoading    = false;
        this.errorMessage = e.error?.message || `Failed to ${this.editMode ? 'update' : 'create'} budget`;
      }
    });
  }

  cancel(): void { this.router.navigate(['/budgets']); }
}