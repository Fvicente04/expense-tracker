import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../layout/navbar/navbar';
import { CategoryService } from '../../../services/category';
import { LanguageService } from '../../../services/language.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { Category } from '../../../models/category';
import { LucideIconComponent, LUCIDE_ICON_NAMES } from '../../shared/lucide-icon';
import {
  LucidePlus,
  LucideSearch,
  LucideX,
  LucideCircleAlert,
  LucidePencil,
  LucideTrash2,
  LucideTrendingUp,
  LucideTrendingDown,
} from '@lucide/angular';

@Component({
  selector: 'app-category-list',
  imports: [
    CommonModule, NavbarComponent, ReactiveFormsModule, FormsModule, TranslatePipe,
    LucideIconComponent,
    LucidePlus, LucideSearch, LucideX, LucideCircleAlert,
    LucidePencil, LucideTrash2, LucideTrendingUp, LucideTrendingDown,
  ],
  templateUrl: './category-list.html',
  styleUrl: './category-list.css'
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
  selectedIcon = 'wallet';
  selectedColor = '#667eea';
  customColor = '#667eea';
  activeIconGroup = 'Finanças';
  searchQuery = '';
  typeFilter: 'all' | 'expense' | 'income' = 'all';

  readonly lucideIconGroups = [
    { label: 'Finanças',    icons: ['wallet','creditCard','banknote','trendingUp','trendingDown','coins','landmark','chartColumn','piggyBank','dollarSign'] },
    { label: 'Casa',        icons: ['home','sofa','hammer','wrench','zap','flame','shield','key','lock','tv'] },
    { label: 'Transporte',  icons: ['car','plane','trainFront','bike','busFront','ship','truck','fuel','navigation','mapPin'] },
    { label: 'Alimentação', icons: ['utensils','utensilsCrossed','coffee','wine','apple','pizza','cake','shoppingCart','tag','package'] },
    { label: 'Saúde',       icons: ['heart','dumbbell','activity','brain','stethoscope','pill','heartPulse','syringe','eye','baby'] },
    { label: 'Lazer',       icons: ['gamepad2','clapperboard','music','palette','bookOpen','mic','headphones','ticket','camera','sparkles'] },
    { label: 'Compras',     icons: ['shoppingBag','shirt','watch','smartphone','laptop','gem','gift','monitor','star','backpack'] },
    { label: 'Trabalho',    icons: ['briefcase','graduationCap','pencil','fileText','mail','phone','code','bell','smile','globe'] },
    { label: 'Viagem',      icons: ['map','mountain','compass','sun','moon','umbrella','leaf','cloud','pawPrint','flag'] },
  ];

  presetColors = [
    '#ef4444','#f97316','#f59e0b','#eab308',
    '#84cc16','#22c55e','#10b981','#14b8a6',
    '#06b6d4','#0ea5e9','#3b82f6','#6366f1',
    '#8b5cf6','#a855f7','#d946ef','#ec4899',
    '#f43f5e','#64748b','#78716c','#1e2139',
  ];

  get currentIcons(): string[] {
    return this.lucideIconGroups.find(g => g.label === this.activeIconGroup)?.icons ?? [];
  }

  isLucideIcon(icon: string): boolean { return LUCIDE_ICON_NAMES.has(icon); }

  constructor(
    private categoryService: CategoryService,
    private fb: FormBuilder,
    public lang: LanguageService
  ) {
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
    this.selectedIcon = 'wallet';
    this.selectedColor = '#667eea';
    this.customColor = '#667eea';
    this.activeIconGroup = 'Finanças';
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