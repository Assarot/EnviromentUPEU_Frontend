import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReservationService, Reservation } from '../../core/services/reservation.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UserService } from '../../core/services/user.service';
import { AcademicSpaceService } from '../../core/services/academic-space.service';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-mis-solicitudes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-solicitudes.component.html',
  styleUrls: ['./mis-solicitudes.component.css']
})
export class MisSolicitudesComponent implements OnInit {
  private reservationService = inject(ReservationService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private userService = inject(UserService);
  private spaceService = inject(AcademicSpaceService);

  reservations: Reservation[] = [];
  userMap = new Map<number, string>();
  spaceMap = new Map<number, string>();
  isLoading = false;
  isCoorooms = false;
  
  activeTab: 'PENDING' | 'HISTORY' = 'PENDING';

  get pendingReservations(): Reservation[] {
    return this.reservations.filter(r => r.status.idStatus === 1 || r.status.name === 'Pendiente');
  }

  get historyReservations(): Reservation[] {
    return this.reservations.filter(r => r.status.idStatus !== 1 && r.status.name !== 'Pendiente');
  }

  ngOnInit(): void {
    this.isCoorooms = this.authService.hasRole('COOROOMS') || this.authService.hasRole('ADMIN');
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    
    // Cargar metadatos
    forkJoin({
      users: this.userService.getUsers(),
      spaces: this.spaceService.getAcademicSpaces()
    }).subscribe({
      next: (data) => {
        data.users.forEach(u => this.userMap.set(u.id, `${u.names} ${u.lastName}`));
        data.spaces.forEach(s => {
          if (s.id_academic_space) this.spaceMap.set(s.id_academic_space, s.space_name);
        });
        
        // Ahora cargamos reservas
        this.loadReservations();
      },
      error: () => {
        this.toastService.error('Error al cargar datos auxiliares');
        this.loadReservations(); // Intentar cargar reservas igual
      }
    });
  }

  loadReservations(): void {
    if (this.isCoorooms) {
      this.fetchReservations(this.reservationService.getAllReservations());
    } else {
      this.authService.currentUser$.subscribe(user => {
        if (user && user.userProfileId) {
          this.fetchReservations(this.reservationService.getMyReservations(user.userProfileId));
        } else {
          this.isLoading = false;
          this.toastService.error('No se pudo identificar tu perfil de usuario.');
        }
      });
    }
  }

  getUserName(id: number): string {
    return this.userMap.get(id) || `Usuario ID: ${id}`;
  }

  getSpaceName(id: number): string {
    return this.spaceMap.get(id) || `Ambiente ID: ${id}`;
  }

  private fetchReservations(fetchObs: any): void {
    fetchObs.subscribe({
      next: (data: Reservation[]) => {
        this.reservations = data.sort((a, b) => {
          const dateA = new Date(a.requestedAt || a.startDatetime).getTime();
          const dateB = new Date(b.requestedAt || b.startDatetime).getTime();
          return dateA - dateB; // Más antigua primero (Ascendente)
        });
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error fetching reservations', err);
        this.toastService.error('Error al cargar las solicitudes de reserva.');
        this.isLoading = false;
      }
    });
  }

  approveReservation(id: number): void {
    Swal.fire({
      title: '¿Aprobar reserva?',
      text: "El ambiente quedará asignado oficialmente para este horario.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#BFC621',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-lg', cancelButton: 'rounded-lg' }
    }).then((result) => {
      if (result.isConfirmed) {
        this.reservationService.approveReservation(id).subscribe({
          next: () => {
            this.toastService.success('Reserva aprobada exitosamente.');
            this.loadReservations();
          },
          error: (err) => {
            console.error('Error approving reservation', err);
            this.toastService.error(err.error?.message || 'No se pudo aprobar la reserva.');
          }
        });
      }
    });
  }

  rejectReservation(id: number): void {
    Swal.fire({
      title: 'Motivo de rechazo',
      input: 'textarea',
      inputPlaceholder: 'Escribe el motivo por el cual rechazas esta reserva...',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return '¡Debes ingresar un motivo!';
        }
        return null;
      },
      customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-lg', cancelButton: 'rounded-lg', input: 'rounded-lg resize-none' }
    }).then((result) => {
      if (result.isConfirmed) {
        this.reservationService.rejectReservation(id, result.value).subscribe({
          next: () => {
            this.toastService.success('Reserva rechazada.');
            this.loadReservations();
          },
          error: (err) => {
            console.error('Error rejecting reservation', err);
            this.toastService.error(err.error?.message || 'No se pudo rechazar la reserva.');
          }
        });
      }
    });
  }

  revertToPending(id: number) {
    Swal.fire({
      title: '¿Deshacer decisión?',
      text: 'La solicitud volverá al estado Pendiente. Si estaba aprobada, el horario ocupado será liberado.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, deshacer',
      cancelButtonText: 'Mantener decisión',
      confirmButtonColor: '#3b82f6', // blue-500
      cancelButtonColor: '#94a3b8',
      customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-lg', cancelButton: 'rounded-lg' }
    }).then((result) => {
      if (result.isConfirmed) {
        this.reservationService.revertToPending(id).subscribe({
          next: () => {
            this.toastService.success('Decisión revertida, la solicitud vuelve a estar Pendiente.');
            this.loadReservations();
          },
          error: (err) => {
            console.error('Error al revertir', err);
            this.toastService.error(err.error?.message || 'Error al deshacer la decisión.');
          }
        });
      }
    });
  }

  getBadgeClass(stateId: number | string): string {
    // Si state_id es 1 (Pendiente), 2 (Aprobada), 3 (Rechazada) etc. Asumiendo ids numéricos
    // Si state.name no viene, nos guiamos por ID si no lo conocemos.
    // Asumiremos 1=Pendiente, 2=Aprobada, 3=Rechazada
    if (stateId === 1 || String(stateId).toLowerCase() === 'pendiente') {
      return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200';
    }
    if (stateId === 2 || String(stateId).toLowerCase() === 'aprobada') {
      return 'bg-green-100 text-green-800 ring-1 ring-green-200';
    }
    if (stateId === 3 || String(stateId).toLowerCase() === 'rechazada') {
      return 'bg-red-100 text-red-800 ring-1 ring-red-200';
    }
    return 'bg-slate-100 text-slate-800 ring-1 ring-slate-200';
  }

  getStateName(stateId: number | string): string {
    if (stateId === 1 || String(stateId).toLowerCase() === 'pendiente') return 'Pendiente';
    if (stateId === 2 || String(stateId).toLowerCase() === 'aprobada') return 'Aprobada';
    if (stateId === 3 || String(stateId).toLowerCase() === 'rechazada') return 'Rechazada';
    return String(stateId);
  }

  formatDateTime(isoString: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
