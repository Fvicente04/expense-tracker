import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavbarComponent } from '../../layout/navbar/navbar';
import { GoalService } from '../../../services/goal';
import { LanguageService } from '../../../services/language.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { Goal } from '../../../models/goal';
import { LucideIconComponent, LUCIDE_ICON_NAMES } from '../../shared/lucide-icon';

@Component({
  selector: 'app-goal-list',
  imports: [CommonModule, NavbarComponent, ReactiveFormsModule, FormsModule, TranslatePipe, LucideIconComponent],
  templateUrl: './goal-list.html',
  styleUrl: './goal-list.css'
})
export class GoalListComponent implements OnInit {
  goals: Goal[] = [];
  isLoading = false;
  errorMessage = '';

  showModal = false;
  editMode = false;
  editingId = '';
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
  activeIconGroup = 'Finanças';

  get currentIcons(): string[] {
    return this.lucideIconGroups.find(g => g.label === this.activeIconGroup)?.icons ?? [];
  }

  isLucideIcon(icon: string): boolean { return LUCIDE_ICON_NAMES.has(icon); }

  showDepositModal = false;
  depositGoal: Goal | null = null;
  depositAmount = '';
  depositSaving = false;

  form: FormGroup;

  constructor(
    private goalService: GoalService,
    private fb: FormBuilder,
    public lang: LanguageService
  ) {
    this.form = this.fb.group({
      name:         ['', [Validators.required, Validators.maxLength(100)]],
      icon:         ['wallet'],
      targetAmount: ['', [Validators.required, Validators.min(0.01)]],
      savedAmount:  [0, [Validators.min(0)]],
      deadline:     [null]
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.goalService.getAll().subscribe({
      next:  (data) => { this.goals = data; this.isLoading = false; },
      error: () => { this.errorMessage = 'Failed to load goals'; this.isLoading = false; }
    });
  }

  totalSaved():   number { return this.goals.reduce((s, g) => s + (Number(g.savedAmount)  || 0), 0); }
  totalTarget():  number { return this.goals.reduce((s, g) => s + (Number(g.targetAmount) || 0), 0); }
  totalAchieved(): number { return this.goals.filter(g => Number(g.savedAmount) >= Number(g.targetAmount)).length; }

  progressPct(g: Goal): number {
    const t = Number(g.targetAmount);
    if (!t) return 0;
    return Math.min((Number(g.savedAmount) / t) * 100, 100);
  }

  progressColor(g: Goal): string {
    const p = this.progressPct(g);
    if (p >= 100) return '#f59e0b';
    if (p >= 80)  return '#667eea';
    if (p >= 50)  return '#3b82f6';
    return '#22c55e';
  }

  monthsLeft(g: Goal): number | null {
    if (!g.deadline) return null;
    const now = new Date();
    const dl  = new Date(g.deadline);
    const diff = (dl.getFullYear() - now.getFullYear()) * 12 + (dl.getMonth() - now.getMonth());
    return diff;
  }

  neededPerMonth(g: Goal): number | null {
    const months = this.monthsLeft(g);
    if (months === null || months <= 0) return null;
    const remaining = Number(g.targetAmount) - Number(g.savedAmount);
    if (remaining <= 0) return 0;
    return remaining / months;
  }

  currencySymbol(): string {
    return '€';
  }

  fmt(value: any): string { return (Number(value) || 0).toFixed(2); }

  openModal(): void {
    this.showModal    = true;
    this.editMode     = false;
    this.editingId    = '';
    this.errorMessage = '';
    this.form.reset({ icon: 'wallet', savedAmount: 0, deadline: null });
  }

  openEditModal(g: Goal): void {
    this.showModal    = true;
    this.editMode     = true;
    this.editingId    = g.id;
    this.errorMessage = '';
    this.form.patchValue({
      name:         g.name,
      icon:         g.icon,
      targetAmount: g.targetAmount,
      savedAmount:  g.savedAmount,
      deadline:     g.deadline ?? null
    });
  }

  closeModal(): void {
    this.showModal    = false;
    this.editMode     = false;
    this.editingId    = '';
    this.errorMessage = '';
    this.form.reset();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(k => this.form.get(k)?.markAsTouched());
      return;
    }
    this.isLoading    = true;
    this.errorMessage = '';
    const v = this.form.value;
    const payload = { ...v, deadline: v.deadline || null };
    const op = this.editMode
      ? this.goalService.update(this.editingId, payload)
      : this.goalService.create(payload);
    op.subscribe({
      next:  () => { this.load(); this.closeModal(); },
      error: () => { this.errorMessage = `Failed to ${this.editMode ? 'update' : 'create'} goal`; this.isLoading = false; }
    });
  }

  openDeposit(g: Goal): void {
    this.depositGoal   = g;
    this.depositAmount = '';
    this.depositSaving = false;
    this.showDepositModal = true;
  }

  closeDeposit(): void {
    this.showDepositModal = false;
    this.depositGoal      = null;
  }

  confirmDeposit(): void {
    if (!this.depositGoal || !this.depositAmount || parseFloat(this.depositAmount) <= 0) return;
    this.depositSaving = true;
    this.goalService.deposit(this.depositGoal.id, parseFloat(this.depositAmount)).subscribe({
      next:  () => { this.load(); this.closeDeposit(); },
      error: () => { this.depositSaving = false; }
    });
  }

  deleteGoal(id: string): void {
    if (!confirm(this.lang.t('goals.deleteConfirm'))) return;
    this.goalService.delete(id).subscribe({
      next:  () => this.load(),
      error: () => { this.errorMessage = 'Failed to delete goal'; }
    });
  }
}
