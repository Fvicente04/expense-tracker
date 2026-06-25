import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('auth_token');
  if (token) req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

  const router = inject(Router);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        localStorage.removeItem('auth_token');
        router.navigate(['/login'], { queryParams: { reason: 'session_expired' } });
      }
      return throwError(() => err);
    })
  );
};
