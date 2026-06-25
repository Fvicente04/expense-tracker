import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../layout/navbar/navbar';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { BankService } from '../../services/bank';
import { BankConnection } from '../../models/bank-connection';
import { LucideLandmark, LucideRefreshCw, LucideTrash2, LucidePlus, LucideX } from '@lucide/angular';

@Component({
  selector: 'app-bank-connections',
  imports: [CommonModule, FormsModule, NavbarComponent, TranslatePipe, LucideLandmark, LucideRefreshCw, LucideTrash2, LucidePlus, LucideX],
  templateUrl: './bank-connections.html',
  styleUrl: './bank-connections.css'
})
export class BankConnectionsComponent implements OnInit {
  connections: BankConnection[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  showModal = false;
  isSubmitting = false;
  form = { displayName: '' };

  syncingId: string | null = null;
  syncResults: Record<string, string> = {};

  constructor(
    private bankService: BankService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['connected'] === 'true') {
        this.successMessage = '';
        this.bankService.invalidate();
      }
      if (params['error']) {
        this.errorMessage = `Connection failed: ${params['error']}`;
      }
    });
    this.loadConnections();
  }

  loadConnections(): void {
    this.isLoading = true;
    this.bankService.getConnections().subscribe({
      next: data => {
        this.connections = data;
        this.isLoading = false;
        const hasJustConnected = this.connections.some(c => c.status === 'active' && !c.lastSyncedAt);
        if (hasJustConnected) this.successMessage = '';
      },
      error: () => {
        this.errorMessage = 'Failed to load connections';
        this.isLoading = false;
      }
    });
  }

  openModal(): void {
    this.showModal = true;
    this.form = { displayName: '' };
    this.errorMessage = '';
  }

  closeModal(): void {
    this.showModal = false;
    this.form = { displayName: '' };
  }

  connect(): void {
    if (!this.form.displayName.trim()) return;
    this.isSubmitting = true;
    this.errorMessage = '';

    this.bankService.connect(this.form.displayName.trim()).subscribe({
      next: ({ authUrl }) => {
        this.isSubmitting = false;
        this.closeModal();
        window.location.href = authUrl;
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = 'bank.errorConnect';
      }
    });
  }

  sync(connection: BankConnection): void {
    this.syncingId = connection.id;
    delete this.syncResults[connection.id];

    this.bankService.sync(connection.id).subscribe({
      next: ({ imported, skipped }) => {
        this.syncingId = null;
        this.syncResults[connection.id] = `${imported} imported, ${skipped} already existed`;
        this.bankService.invalidate();
        this.loadConnections();
      },
      error: () => {
        this.syncingId = null;
        this.syncResults[connection.id] = 'Sync failed';
      }
    });
  }

  remove(connection: BankConnection): void {
    if (!confirm('Remove this bank connection? Existing transactions will not be deleted.')) return;

    this.bankService.delete(connection.id).subscribe({
      next: () => {
        this.connections = this.connections.filter(c => c.id !== connection.id);
        delete this.syncResults[connection.id];
      },
      error: () => this.errorMessage = 'Failed to remove connection'
    });
  }

  fmtDate(dateStr: string | null): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
