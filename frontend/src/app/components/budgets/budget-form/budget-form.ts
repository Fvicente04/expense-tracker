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
  budgetForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  isEditMode = false;
  budgetId: string | null = null;

  categories: Category[] = [];
  expenseCategories: Category[] = [];

  currentMonth: number = new Date().getMonth() + 1;
  currentYear: number = new Date().getFullYear();

  months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  years: number[] = [];

  constructor(
    private fb: FormBuilder,
    private budgetService: BudgetService,
    private categoryService: CategoryService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Generate years array (current year - 1 to current year + 2)
    for (let i = -1; i <= 2; i++) {
      this.years.push(this.currentYear + i);
    }
  }

  ngOnInit(): void {
    this.initForm();
    this.loadCategories();
    
    // Check if edit mode
    this.budgetId = this.route.snapshot.paramMap.get('id');
    if (this.budgetId) {
      this.isEditMode = true;
      this.loadBudget(this.budgetId);
    }
  }

  initForm(): void {
    this.budgetForm = this.fb.group({
      category_id: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      month: [this.currentMonth, Validators.required],
      year: [this.currentYear, Validators.required]
    });
  }

  loadCategories(): void {
    this.categoryService.getAll().subscribe({
      next: (data: any) => {
        this.categories = data;
        this.expenseCategories = data.filter((c: Category) => c.type === 'expense');
      },
      error: (error: any) => {
        console.error('Error loading categories:', error);
        this.errorMessage = 'Failed to load categories';
      }
    });
  }

  loadBudget(id: string): void {
    this.isLoading = true;
    this.budgetService.getById(id).subscribe({
      next: (data: any) => {
        this.budgetForm.patchValue({
          category_id: data.category_id,
          amount: data.amount,
          month: data.month,
          year: data.year
        });
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading budget:', error);
        this.errorMessage = 'Failed to load budget';
        this.isLoading = false;
      }
    });
  }

  getSelectedCategory(): Category | undefined {
    const categoryId = this.budgetForm.get('category_id')?.value;
    return this.categories.find(c => c.id === categoryId);
  }

  onSubmit(): void {
    if (this.budgetForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const budgetData = this.budgetForm.value;

      if (this.isEditMode && this.budgetId) {
        // Update existing budget
        this.budgetService.update(this.budgetId, budgetData).subscribe({
          next: () => {
            this.router.navigate(['/budgets']);
          },
          error: (error: any) => {
            console.error('Error updating budget:', error);
            this.isLoading = false;
            this.errorMessage = error.error?.message || 'Failed to update budget';
          }
        });
      } else {
        // Create new budget
        this.budgetService.create(budgetData).subscribe({
          next: () => {
            this.router.navigate(['/budgets']);
          },
          error: (error: any) => {
            console.error('Error creating budget:', error);
            this.isLoading = false;
            this.errorMessage = error.error?.message || 'Failed to create budget';
          }
        });
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.budgetForm.controls).forEach(key => {
        this.budgetForm.get(key)?.markAsTouched();
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/budgets']);
  }
}