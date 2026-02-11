import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CategoryService } from '../../../services/category';
import { Category } from '../../../models/category';
import { NavbarComponent } from '../../layout/navbar/navbar';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './category-list.html',
  styleUrls: ['./category-list.css']
})
export class CategoryListComponent implements OnInit {
  categories: Category[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(
    private categoryService: CategoryService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading = true;
    this.categoryService.getAll().subscribe({
      next: (data: any) => {
        this.categories = data;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading categories:', error);
        this.errorMessage = 'Erro ao carregar categorias';
        this.isLoading = false;
      }
    });
  }

  getExpenseCategories(): Category[] {
    return this.categories.filter(c => c.type === 'expense');
  }

  getIncomeCategories(): Category[] {
    return this.categories.filter(c => c.type === 'income');
  }

  deleteCategory(id: string): void {
    if (confirm('Tem certeza que deseja deletar esta categoria?')) {
      this.categoryService.delete(id).subscribe({
        next: () => {
          this.loadCategories();
        },
        error: (error: any) => {
          console.error('Error deleting category:', error);
          alert('Erro ao deletar categoria. Pode haver transações associadas.');
        }
      });
    }
  }

  goToAddCategory(): void {
    this.router.navigate(['/categories/new']);
  }

  editCategory(id: string): void {
    this.router.navigate(['/categories/edit', id]);
  }
}