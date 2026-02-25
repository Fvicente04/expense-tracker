import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { ThemeService } from '../../../services/theme';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent implements OnInit {
  isExpanded = false;
  mobileOpen = false;
  isMobile = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private theme: ThemeService
  ) {}

  ngOnInit(): void {
    this.checkMobile();
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.mobileOpen = false);
  }

  @HostListener('window:resize')
  checkMobile(): void {
    this.isMobile = window.innerWidth <= 768;
    if (!this.isMobile) this.mobileOpen = false;
  }

  toggleSidebar(): void {
    if (!this.isMobile) this.isExpanded = !this.isExpanded;
  }

  toggleMobileMenu(): void { this.mobileOpen = !this.mobileOpen; }

  logout(): void {
    this.authService.logout();
  }

  toggleTheme(): void { this.theme.toggle(); }

  get isDark(): boolean { return this.theme.isDark(); }
}