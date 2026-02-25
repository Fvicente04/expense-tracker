import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../layout/navbar/navbar';
import { CategoryService } from '../../../services/category';
import { Category } from '../../../models/category';

const E = '\uFE0F';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, NavbarComponent, ReactiveFormsModule, FormsModule],
  templateUrl: './category-list.html',
  styleUrls: ['./category-list.css']
})
export class CategoryListComponent implements OnInit {
  categories: Category[] = [];
  isLoading = false;
  errorMessage = '';
  showModal = false;
  editMode = false;
  editingId = '';
  form: FormGroup;
  selectedType: 'income' | 'expense' = 'expense';
  selectedIcon = '\u{1F4B0}';
  selectedColor = '#667eea';
  customColor = '#667eea';
  activeIconGroup = 'Finance';
  searchQuery = '';
  typeFilter: 'all' | 'expense' | 'income' = 'all';

  iconGroups = [
    { label: 'Finance',       icons: ['\u{1F4B0}','\u{1F4B5}','\u{1F4B8}','\u{1F4B3}','\u{1F3E6}','\u{1F4C8}','\u{1F4C9}','\u{1FA99}','\u{1F4CA}','\u{1F48E}'] },
    { label: 'Home',          icons: ['\u{1F3E0}','\u{1F3E1}','\u{1F3E2}','\u{1F6CB}'+E,'\u{1FA91}','\u{1F6C1}','\u{1F527}','\u{1F528}','\u{1F4A1}','\u{1F50C}'] },
    { label: 'Transport',     icons: ['\u{1F697}','\u{1F695}','\u{1F699}','\u{1F68C}','\u{2708}'+E,'\u{1F682}','\u{1F6A2}','\u{1F6F5}','\u{1F6B2}','\u{26FD}'+E] },
    { label: 'Food',          icons: ['\u{1F354}','\u{1F355}','\u{1F363}','\u{1F35C}','\u{1F32E}','\u{1F371}','\u{1F957}','\u{1F369}','\u{2615}','\u{1F37A}'] },
    { label: 'Health',        icons: ['\u{1F3E5}','\u{1F48A}','\u{1FA7A}','\u{1F3CB}'+E,'\u{1F9D8}','\u{1F3C3}','\u{26BD}'+E,'\u{1F3C0}','\u{1F3BE}','\u{1FA79}'] },
    { label: 'Entertainment', icons: ['\u{1F3AE}','\u{1F3AC}','\u{1F3B5}','\u{1F3AD}','\u{1F3A8}','\u{1F4DA}','\u{1F4FA}','\u{1F3A4}','\u{1F3A7}','\u{1F3B2}'] },
    { label: 'Shopping',      icons: ['\u{1F6CD}'+E,'\u{1F457}','\u{1F460}','\u{1F45F}','\u{1F45C}','\u{1F48D}','\u{231A}'+E,'\u{1F4F1}','\u{1F4BB}','\u{1F381}'] },
    { label: 'Work',          icons: ['\u{1F4BC}','\u{1F393}','\u{270F}'+E,'\u{1F4DD}','\u{1F4CB}','\u{1F4CC}','\u{1F4CE}','\u{1F5C2}'+E,'\u{1F52C}','\u{1F4D0}'] },
    { label: 'Travel',        icons: ['\u{1F30D}','\u{1F5FA}'+E,'\u{1F3D6}'+E,'\u{1F3D4}'+E,'\u{1F3D5}'+E,'\u{1F334}','\u{1F5FC}','\u{1F3F0}','\u{1F305}','\u{1F9F3}'] },
    { label: 'Other',         icons: ['\u{2B50}','\u{2764}'+E,'\u{1F514}','\u{1F389}','\u{1F43E}','\u{1F331}','\u{2600}'+E,'\u{26A1}'+E,'\u{1F525}','\u{1F340}'] },
  ];

  presetColors = [
    '#ef4444','#f97316','#f59e0b','#eab308',
    '#84cc16','#22c55e','#10b981','#14b8a6',
    '#06b6d4','#0ea5e9','#3b82f6','#6366f1',
    '#8b5cf6','#a855f7','#d946ef','#ec4899',
    '#f43f5e','#64748b','#78716c','#1e2139',
  ];

  get filteredIcons(): string[] {
    return this.iconGroups.find(g => g.label === this.activeIconGroup)?.icons ?? [];
  }

  constructor(private categoryService: CategoryService, private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      type: ['expense', Validators.required]
    });
    this.form.get('type')?.valueChanges.subscribe(t => this.selectedType = t);
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading = true;
    this.categoryService.getAll().subscribe({
      next: (data: any) => { this.categories = data; this.isLoading = false; },
      error: () => { this.errorMessage = 'Error loading categories'; this.isLoading = false; }
    });
  }

  private expenseCats(): Category[] { return this.categories.filter(c => c.type === 'expense'); }
  private incomeCats():  Category[] { return this.categories.filter(c => c.type === 'income');  }

  filteredExpense(): Category[] {
    const q = this.searchQuery.toLowerCase();
    return this.expenseCats().filter(c => c.name.toLowerCase().includes(q));
  }

  filteredIncome(): Category[] {
    const q = this.searchQuery.toLowerCase();
    return this.incomeCats().filter(c => c.name.toLowerCase().includes(q));
  }

  openModal(): void {
    this.showModal = true;
    this.editMode = false;
    this.editingId = '';
    this.selectedType = 'expense';
    this.selectedIcon = '\u{1F4B0}';
    this.selectedColor = '#667eea';
    this.customColor = '#667eea';
    this.activeIconGroup = 'Finance';
    this.errorMessage = '';
    this.form.reset({ type: 'expense' });
  }

  closeModal(): void {
    this.showModal = false;
    this.editMode = false;
    this.editingId = '';
    this.errorMessage = '';
    this.form.reset();
  }

  editCategory(category: Category): void {
    this.showModal = true;
    this.editMode = true;
    this.editingId = category.id;
    this.errorMessage = '';
    this.selectedIcon  = category.icon  || '\u{1F4B0}';
    this.selectedColor = category.color || '#667eea';
    this.customColor   = category.color || '#667eea';
    this.selectedType  = category.type;
    this.form.patchValue({ name: category.name, type: category.type });
  }

  deleteCategory(id: string): void {
    if (!confirm('Are you sure you want to delete this category?')) return;
    this.categoryService.delete(id).subscribe({
      next:  () => this.load(),
      error: () => alert('Cannot delete category. It may have associated transactions.')
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(k => this.form.get(k)?.markAsTouched());
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    const payload = { ...this.form.value, icon: this.selectedIcon, color: this.selectedColor };
    const op = this.editMode
      ? this.categoryService.update(this.editingId, payload)
      : this.categoryService.create(payload);
    op.subscribe({
      next:  () => { this.load(); this.closeModal(); },
      error: (e: any) => {
        this.errorMessage = e.error?.message || `Failed to ${this.editMode ? 'update' : 'create'} category`;
        this.isLoading = false;
      }
    });
  }

  selectType(type: 'income' | 'expense'): void { this.form.patchValue({ type }); }

  selectColor(color: string): void {
    this.selectedColor = color;
    this.customColor   = color;
  }

  onCustomColor(event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    this.selectedColor = v;
    this.customColor   = v;
  }
}