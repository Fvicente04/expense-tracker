import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TransactionService } from '../../../services/transaction';
import { CategoryService } from '../../../services/category';
import { Category } from '../../../models/category';
import { NavbarComponent } from '../../layout/navbar/navbar';

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './transaction-form.html',
  styleUrls: ['./transaction-form.css']
})
export class TransactionFormComponent implements OnInit {
  form!: FormGroup;
  categories: Category[] = [];
  isLoading = false;
  errorMessage = '';
  selectedType: 'income' | 'expense' = 'expense';

  constructor(
    private fb: FormBuilder,
    private transactionService: TransactionService,
    private categoryService: CategoryService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadCategories();
  }

  initForm(): void {
    this.form = this.fb.group({
      type:               ['expense', Validators.required],
      amount:             ['', [Validators.required, Validators.min(0.01)]],
      description:        ['', [Validators.required, Validators.minLength(3)]],
      categoryId:         ['', Validators.required],
      date:               [new Date().toISOString().split('T')[0], Validators.required],
      notes:              [''],
      isRecurring:        [false],
      recurringFrequency: ['monthly'],
      recurringEndDate:   [null]
    });

    this.form.get('type')?.valueChanges.subscribe(type => {
      this.selectedType = type;
      this.form.patchValue({ categoryId: '' });
    });
  }

  loadCategories(): void {
    this.categoryService.getAll().subscribe({
      next: data => this.categories = data,
      error: () => this.errorMessage = 'Error loading categories'
    });
  }

  filteredCats(): Category[] {
    return this.categories.filter(c => c.type === this.selectedType);
  }

  toggleRecurring(): void {
    const curr = this.form.get('isRecurring')?.value;
    this.form.patchValue({
      isRecurring: !curr,
      recurringFrequency: !curr ? 'monthly' : null,
      recurringEndDate: null
    });
  }

  setFrequency(freq: 'weekly' | 'monthly' | 'yearly'): void {
    this.form.patchValue({ recurringFrequency: freq });
  }

  recurringPreview(): string {
    const freq  = this.form.get('recurringFrequency')?.value;
    const end   = this.form.get('recurringEndDate')?.value;
    const start = this.form.get('date')?.value;
    if (!freq || !start) return '';

    const label: Record<string, string> = { weekly: 'week', monthly: 'month', yearly: 'year' };

    if (end) {
      const endDate = new Date(end);
      const curr = new Date(start);
      let count = 0;
      while (count < 60) {
        if (freq === 'weekly')       curr.setDate(curr.getDate() + 7);
        else if (freq === 'monthly') curr.setMonth(curr.getMonth() + 1);
        else                         curr.setFullYear(curr.getFullYear() + 1);
        if (curr > endDate) break;
        count++;
      }
      const fmt = endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return `Repeats every ${label[freq]} · ${count} occurrence${count !== 1 ? 's' : ''} until ${fmt}`;
    }

    return `Repeats every ${label[freq]} indefinitely (up to 60 occurrences)`;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(k => this.form.get(k)?.markAsTouched());
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    const v = this.form.value;

    const payload: any = {
      type:               v.type,
      amount:             parseFloat(v.amount),
      description:        v.description,
      categoryId:         v.categoryId,
      date:               v.date,
      notes:              v.notes || null,
      isRecurring:        v.isRecurring,
      recurringFrequency: v.isRecurring ? v.recurringFrequency : null,
      recurringEndDate:   v.isRecurring && v.recurringEndDate ? v.recurringEndDate : null
    };

    this.transactionService.create(payload).subscribe({
      next: () => this.router.navigate(['/transactions']),
      error: err => {
        this.isLoading = false;
        this.errorMessage = err.status === 0
          ? 'Connection error. Check if the backend is running.'
          : err.error?.message || 'Error creating transaction';
      }
    });
  }

  cancel(): void { this.router.navigate(['/transactions']); }
  selectType(type: 'income' | 'expense'): void { this.form.patchValue({ type }); }
}