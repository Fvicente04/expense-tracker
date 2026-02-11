import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TransactionService } from '../../../services/transaction';
import { CategoryService } from '../../../services/category';
import { Category } from '../../../models/category';
import { CreateTransactionRequest } from '../../../models/transaction';
import { NavbarComponent } from '../../layout/navbar/navbar';

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './transaction-form.html',
  styleUrls: ['./transaction-form.css']
})
export class TransactionFormComponent implements OnInit {
  transactionForm!: FormGroup;
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
    const today = new Date().toISOString().split('T')[0];
    
    this.transactionForm = this.fb.group({
      type: ['expense', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      description: ['', [Validators.required, Validators.minLength(3)]],
      category_id: ['', Validators.required],
      date: [today, Validators.required],
      notes: ['']
    });

    // Listen to type changes
    this.transactionForm.get('type')?.valueChanges.subscribe((type) => {
      this.selectedType = type;
      this.transactionForm.patchValue({ category_id: '' });
    });
  }

  loadCategories(): void {
    this.categoryService.getAll().subscribe({
      next: (data: any) => {
        this.categories = data;
      },
      error: (error: any) => {
        console.error('Error loading categories:', error);
        this.errorMessage = 'Erro ao carregar categorias';
      }
    });
  }

  getFilteredCategories(): Category[] {
    return this.categories.filter(c => c.type === this.selectedType);
  }

  onSubmit(): void {
    if (this.transactionForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const transactionData: CreateTransactionRequest = {
        ...this.transactionForm.value,
        amount: parseFloat(this.transactionForm.value.amount)
      };

      this.transactionService.create(transactionData).subscribe({
        next: () => {
          this.router.navigate(['/transactions']);
        },
        error: (error: any) => {
          console.error('Error creating transaction:', error);
          this.isLoading = false;
          
          if (error.status === 0) {
            this.errorMessage = 'Erro de conexão. Verifique se o backend está rodando.';
          } else {
            this.errorMessage = error.error?.message || 'Erro ao criar transação';
          }
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.transactionForm.controls).forEach(key => {
        this.transactionForm.get(key)?.markAsTouched();
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/transactions']);
  }

  selectType(type: 'income' | 'expense'): void {
    this.transactionForm.patchValue({ type });
  }
}