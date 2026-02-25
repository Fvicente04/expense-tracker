import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { ThemeService } from '../../../services/theme';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  isExpanded = false;
  mobileOpen = false;
  isMobile   = false;

  userName     = '';
  userInitials = '';

  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private auth: AuthService,
    private theme: ThemeService
  ) {}

  ngOnInit(): void {
    this.checkMobile();

    this.subs.push(
      this.auth.currentUser$.subscribe(user => {
        if (user) {
          this.userName     = user.name || user.email || 'User';
          this.userInitials = this.userName
            .split(' ')
            .map((n: string) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
        } else {
          this.userName     = '';
          this.userInitials = '';
        }
      })
    );

    this.subs.push(
      this.router.events
        .pipe(filter(e => e instanceof NavigationEnd))
        .subscribe(() => this.mobileOpen = false)
    );
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  @HostListener('window:resize')
  checkMobile(): void {
    this.isMobile = window.innerWidth <= 768;
    if (!this.isMobile) this.mobileOpen = false;
  }

  toggleMobileMenu(): void { this.mobileOpen = !this.mobileOpen; }
  toggleTheme():      void { this.theme.toggle(); }
  logout():           void { this.auth.logout(); }

  get isDark(): boolean { return this.theme.isDark(); }
}