import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../layout/navbar/navbar';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { CategoryRuleService } from '../../services/category-rule.service';
import { CategoryService } from '../../services/category';
import { CategoryRule } from '../../models/category-rule';
import { Category } from '../../models/category';
import { LucidePlus, LucideTrash2, LucideX, LucideShuffle, LucidePlay } from '@lucide/angular';

@Component({
  selector: 'app-category-rules',
  imports: [CommonModule, FormsModule, NavbarComponent, TranslatePipe, LucidePlus, LucideTrash2, LucideX, LucideShuffle, LucidePlay],
  templateUrl: './category-rules.html',
  styleUrl: './category-rules.css'
})
export class CategoryRulesComponent implements OnInit {
  rules: CategoryRule[] = [];
  categories: Category[] = [];
  isLoading = false;
  errorMessage = '';

  showModal = false;
  isSubmitting = false;
  isApplying = false;
  applyUpdated: number | null = null;
  applyError = false;
  form = { keyword: '', categoryId: '' };

  constructor(
    private ruleService: CategoryRuleService,
    private categoryService: CategoryService
  ) {}

  ngOnInit(): void {
    this.load();
    this.categoryService.getAll().subscribe({
      next: (cats: any) => this.categories = cats,
      error: () => {}
    });
  }

  load(): void {
    this.isLoading = true;
    this.ruleService.getRules().subscribe({
      next: data => { this.rules = data; this.isLoading = false; },
      error: () => { this.errorMessage = 'rules.errorLoad'; this.isLoading = false; }
    });
  }

  openModal(): void {
    this.showModal = true;
    this.form = { keyword: '', categoryId: '' };
    this.errorMessage = '';
  }

  closeModal(): void {
    this.showModal = false;
  }

  save(): void {
    if (!this.form.keyword.trim() || !this.form.categoryId) return;
    this.isSubmitting = true;
    this.errorMessage = '';

    this.ruleService.createRule({ keyword: this.form.keyword.trim(), categoryId: this.form.categoryId }).subscribe({
      next: rule => {
        this.rules = [...this.rules, rule];
        this.isSubmitting = false;
        this.closeModal();
      },
      error: () => {
        this.errorMessage = 'rules.errorCreate';
        this.isSubmitting = false;
      }
    });
  }

  applyToExisting(): void {
    this.isApplying = true;
    this.applyUpdated = null;
    this.applyError = false;
    this.ruleService.applyRules().subscribe({
      next: ({ updated }) => {
        this.isApplying = false;
        this.applyUpdated = updated;
      },
      error: () => {
        this.isApplying = false;
        this.applyError = true;
      }
    });
  }

  remove(rule: CategoryRule): void {
    this.ruleService.deleteRule(rule.id).subscribe({
      next: () => this.rules = this.rules.filter(r => r.id !== rule.id),
      error: () => this.errorMessage = 'rules.errorDelete'
    });
  }
}
