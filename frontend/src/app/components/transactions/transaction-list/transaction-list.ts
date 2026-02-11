import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../layout/navbar/navbar';
import { TransactionService } from '../../../services/transaction';
import { CategoryService } from '../../../services/category';
import { Transaction } from '../../../models/transaction';
import { Category } from '../../../models/category';

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NavbarComponent],
  templateUrl: './transaction-list.html',
  styleUrls: ['./transaction-list.css']
})
export class TransactionListComponent implements OnInit {
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  categories: Category[] = [];
  isLoading = false;
  errorMessage = '';
  
  showModal = false;
  isEditMode = false;
  editingId = '';
  transactionForm: FormGroup;

  filters = {
    type: '',
    categoryId: '',
    startDate: '',
    endDate: ''
  };

  constructor(
    private transactionService: TransactionService,
    private categoryService: CategoryService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.transactionForm = this.fb.group({
      type: ['income', Validators.required],
      amount: ['', [Validators.required, Validators.min(0)]],
      date: [this.getTodayDate(), Validators.required],
      categoryId: ['', Validators.required],
      description: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadTransactions();
  }

  loadCategories(): void {
    this.categoryService.getAll().subscribe({
      next: (data) => {
        this.categories = data;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  loadTransactions(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.transactionService.getAll().subscribe({
      next: (data) => {
        this.transactions = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading transactions:', error);
        this.errorMessage = 'Failed to load transactions';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredTransactions = this.transactions.filter(t => {
      const typeMatch = !this.filters.type || t.type === this.filters.type;
      const categoryMatch = !this.filters.categoryId || String(t.categoryId) === String(this.filters.categoryId);
      
      let dateMatch = true;
      if (this.filters.startDate) {
        dateMatch = dateMatch && new Date(t.date) >= new Date(this.filters.startDate);
      }
      if (this.filters.endDate) {
        dateMatch = dateMatch && new Date(t.date) <= new Date(this.filters.endDate);
      }
      
      return typeMatch && categoryMatch && dateMatch;
    });
  }

  clearFilters(): void {
    this.filters = {
      type: '',
      categoryId: '',
      startDate: '',
      endDate: ''
    };
    this.applyFilters();
  }

  getTotalIncome(): number {
    return this.filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }

  getTotalExpenses(): number {
    return this.filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }

  getBalance(): number {
    return this.getTotalIncome() - this.getTotalExpenses();
  }

  formatCurrency(value: any): string {
    return Number(value || 0).toFixed(2);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  getFilteredCategories(): Category[] {
    const type = this.transactionForm.get('type')?.value;
    return this.categories.filter(c => c.type === type);
  }

  getCategoryColor(transaction: Transaction): string {
    return transaction.category?.color || '#6b7280';
  }

  getCategoryIcon(transaction: Transaction): string {
    return transaction.category?.icon || '';
  }

  getCategoryName(transaction: Transaction): string {
    return transaction.category?.name || 'Unknown';
  }

  openModal(): void {
    this.showModal = true;
    this.isEditMode = false;
    this.editingId = '';
    this.transactionForm.reset({
      type: 'income',
      date: this.getTodayDate()
    });
    this.errorMessage = '';
  }

  closeModal(): void {
    this.showModal = false;
    this.isEditMode = false;
    this.editingId = '';
    this.transactionForm.reset();
    this.errorMessage = '';
  }

  editTransaction(transaction: Transaction): void {
    this.showModal = true;
    this.isEditMode = true;
    this.editingId = transaction.id;
    this.errorMessage = '';

    this.transactionForm.patchValue({
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date,
      categoryId: transaction.categoryId,
      description: transaction.description
    });
  }

  onSubmit(): void {
    if (this.transactionForm.invalid) {
      Object.keys(this.transactionForm.controls).forEach(key => {
        this.transactionForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formData = this.transactionForm.value;

    if (this.isEditMode) {
      this.transactionService.update(this.editingId, formData).subscribe({
        next: () => {
          this.loadTransactions();
          this.closeModal();
        },
        error: (error) => {
          console.error('Error updating transaction:', error);
          this.errorMessage = 'Failed to update transaction';
          this.isLoading = false;
        }
      });
    } else {
      this.transactionService.create(formData).subscribe({
        next: () => {
          this.loadTransactions();
          this.closeModal();
        },
        error: (error) => {
          console.error('Error creating transaction:', error);
          this.errorMessage = 'Failed to create transaction';
          this.isLoading = false;
        }
      });
    }
  }

  deleteTransaction(id: string): void {
    if (confirm('Are you sure you want to delete this transaction?')) {
      this.transactionService.delete(id).subscribe({
        next: () => {
          this.loadTransactions();
        },
        error: (error) => {
          console.error('Error deleting transaction:', error);
          this.errorMessage = 'Failed to delete transaction';
        }
      });
    }
  }
}