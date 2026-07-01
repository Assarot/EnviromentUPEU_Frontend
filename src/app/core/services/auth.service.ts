import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, switchMap, tap, map } from 'rxjs';
import {
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  LoginResponseSnake,
  LoginRememberResponseSnake,
  RefreshResponseSnake,
  LogoutRequestSnake,
  User,
  AuthUserDTO,
  CreateAuthUserRequest,
  UpdateAuthUserRequest
} from '../models/auth.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  
  private readonly API_URL = `${environment.apiUrl}/microservice-auth/api/auth`;
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user';
  
  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  public isRefreshing = false;
  public refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor() {}

  /**
   * Login: sin recordar (POST /login) o con recordar (POST /login/remember)
   */
  login(credentials: LoginRequest, remember: boolean): Observable<void> {
    const url = remember ? `${this.API_URL}/login/remember` : `${this.API_URL}/login`;
    return this.http.post<LoginResponseSnake | LoginRememberResponseSnake>(url, credentials).pipe(
      tap((resp) => {
        // Guardar access en sessionStorage
        const access = (resp as LoginResponseSnake).access_token;
        this.saveAccessToken(access);

        // Guardar refresh en localStorage si viene (remember)
        const refresh = (resp as LoginRememberResponseSnake).refresh_token;
        if (refresh) {
          this.saveRefreshToken(refresh);
        } else {
          this.removeRefreshToken();
        }
      }),
      switchMap(() => this.fetchAndSetCurrentUser())
    );
  }

  /**
   * Registro (POST /register) - respuesta camelCase con usuario
   */
  register(data: RegisterRequest): Observable<void> {
    return this.http.post<RegisterResponse>(`${this.API_URL}/register`, data).pipe(
      tap((resp) => {
        this.saveAccessToken(resp.accessToken);
        if (resp.refreshToken) this.saveRefreshToken(resp.refreshToken);
        this.saveUser(resp.user);
        this.currentUserSubject.next(resp.user);
      }),
      switchMap(() => of(void 0))
    );
  }

  /**
   * Realiza el logout del usuario (snake_case body)
   */
  logout(): Observable<any> {
    const access = this.getAccessToken();
    const refresh = this.getRefreshToken();

    if (!access && !refresh) {
      this.clearSession();
      return of(null);
    }

    const body: LogoutRequestSnake = refresh
      ? { access_token: access ?? '', refresh_token: refresh }
      : { access_token: access ?? '' };

    return this.http.post(`${this.API_URL}/logout`, body).pipe(
      tap(() => this.clearSession())
    );
  }

  /**
   * Refresh access token con refresh_token
   */
  refreshAccessToken(): Observable<string> {
    const refresh = this.getRefreshToken();
    if (!refresh) return of('');
    return this.http.post<RefreshResponseSnake>(`${this.API_URL}/refresh`, { refresh_token: refresh }).pipe(
      tap((resp) => this.saveAccessToken(resp.access_token)),
      switchMap((resp) => of(resp.access_token))
    );
  }

  /**
   * Guarda access en sessionStorage
   */
  private saveAccessToken(access: string): void {
    if (access) sessionStorage.setItem(this.ACCESS_TOKEN_KEY, access);
  }

  private saveRefreshToken(refresh: string): void {
    if (refresh) localStorage.setItem(this.REFRESH_TOKEN_KEY, refresh);
  }

  private removeRefreshToken(): void {
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Guarda el usuario en localStorage
   */
  private saveUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Limpia la sesión del usuario
   */
  private clearSession(): void {
    sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  /**
   * Obtiene el access token
   */
  getAccessToken(): string | null {
    return sessionStorage.getItem(this.ACCESS_TOKEN_KEY) || localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Obtiene el refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Obtiene el usuario desde localStorage
   */
  private getUserFromStorage(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Obtiene el usuario actual
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Verifica si el usuario tiene un rol específico
   */
  hasRole(roleName: string): boolean {
    const user = this.getCurrentUser();
    return user?.roles.some(role => role.name === roleName) ?? false;
  }

  /**
   * Obtiene el usuario autenticado desde el backend y lo guarda
   */
  fetchAndSetCurrentUser(): Observable<void> {
    return this.http.get<User>(`${this.API_URL}/me`).pipe(
      tap((user) => {
        this.saveUser(user);
        this.currentUserSubject.next(user);
      }),
      switchMap(() => of(void 0))
    );
  }

  /**
   * Manejo público de no autorizado
   */
  public handleUnauthorized(): void {
    this.clearSession();
  }

  // =================== User Management (Auth) ===================
  getAuthUser(id: number | string): Observable<AuthUserDTO> {
    return this.http.get<AuthUserDTO>(`${this.API_URL}/users/${id}`);
  }

  // Optional helper (if backend supports it). If not, caller should ignore errors.
  getAuthUserByProfileId(profileId: number | string): Observable<AuthUserDTO> {
    return this.http.get<AuthUserDTO>(`${environment.apiUrl}/api/users/auth/by-profile/${profileId}`);
  }

  createAuthUser(payload: CreateAuthUserRequest): Observable<AuthUserDTO> {
    return this.http.post<AuthUserDTO>(`${this.API_URL}/users`, payload);
  }

  updateAuthUser(id: number | string, payload: UpdateAuthUserRequest): Observable<AuthUserDTO> {
    return this.http.put<AuthUserDTO>(`${this.API_URL}/users/${id}`, payload);
  }

  deleteAuthUser(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/users/${id}`);
  }

  assignRoleToUser(userId: number | string, roleName: string): Observable<AuthUserDTO> {
    return this.http.post<AuthUserDTO>(`${this.API_URL}/users/${userId}/roles/${roleName}`, {});
  }

  removeRoleFromUser(userId: number | string, roleName: string): Observable<AuthUserDTO> {
    return this.http.delete<AuthUserDTO>(`${this.API_URL}/users/${userId}/roles/${roleName}`);
  }
}
