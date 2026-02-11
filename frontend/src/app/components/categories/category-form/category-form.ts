import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CategoryService } from '../../../services/category';
import { NavbarComponent } from '../../layout/navbar/navbar';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './category-form.html',
  styleUrls: ['./category-form.css']
})
export class CategoryFormComponent implements OnInit {
  categoryForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  isEditMode = false;
  categoryId: string | null = null;
  selectedType: 'income' | 'expense' = 'expense';

  icons = [
    '\u{1F4B0}', '\u{1F4B5}', '\u{1F4B8}', '\u{1F3E0}', 
    '\u{1F697}', '\u{1F354}', '\u{1F3AE}', '\u{1F4DA}', 
    '\u{1F3E5}', '\u{2708}', '\u{1F6CD}', '\u{1F4F1}', 
    '\u{26A1}', '\u{1F4A1}', '\u{1F381}', '\u{1F4C4}'
  ];
  
  colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', 
    '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', 
    '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
  ];

  selectedIcon = '\u{1F4B0}';
  selectedColor = '#667eea';

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    this.categoryId = this.route.snapshot.paramMap.get('id');
    if (this.categoryId) {
      this.isEditMode = true;
      this.loadCategory(this.categoryId);
    }
  }

  initForm(): void {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      type: ['expense', Validators.required]
    });

    this.categoryForm.get('type')?.valueChanges.subscribe((type) => {
      this.selectedType = type;
    });
  }

  loadCategory(id: string): void {
    this.isLoading = true;
    this.categoryService.getById(id).subscribe({
      next: (data: any) => {
        this.categoryForm.patchValue({
          name: data.name,
          type: data.type
        });
        this.selectedIcon = data.icon || '\u{1F4B0}';
        this.selectedColor = data.color || '#667eea';
        this.selectedType = data.type;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading category:', error);
        this.errorMessage = 'Error loading category';
        this.isLoading = false;
      }
    });
  }

  selectIcon(icon: string): void {
    this.selectedIcon = icon;
  }

  selectColor(color: string): void {
    this.selectedColor = color;
  }

  selectType(type: 'income' | 'expense'): void {
    this.categoryForm.patchValue({ type });
  }

  onSubmit(): void {
    if (this.categoryForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const categoryData = {
        ...this.categoryForm.value,
        icon: this.selectedIcon,
        color: this.selectedColor
      };

      if (this.isEditMode && this.categoryId) {
        this.categoryService.update(this.categoryId, categoryData).subscribe({
          next: () => {
            this.router.navigate(['/categories']);
          },
          error: (error: any) => {
            console.error('Error updating category:', error);
            this.isLoading = false;
            this.errorMessage = error.error?.message || 'Error updating category';
          }
        });
      } else {
        this.categoryService.create(categoryData).subscribe({
          next: () => {
            this.router.navigate(['/categories']);
          },
          error: (error: any) => {
            console.error('Error creating category:', error);
            this.isLoading = false;
            this.errorMessage = error.error?.message || 'Error creating category';
          }
        });
      }
    } else {
      Object.keys(this.categoryForm.controls).forEach(key => {
        this.categoryForm.get(key)?.markAsTouched();
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/categories']);
  }
}