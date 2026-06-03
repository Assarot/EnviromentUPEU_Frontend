# 🔌 Instrucciones para Conectar con el Backend

## 📍 Estado Actual

**MODO:** Simulación (localStorage)  
**RAZÓN:** El endpoint `/reservations` no existe aún en el backend (404 Not Found)

## 🎯 Cuando el Backend Esté Listo

### Paso 1: Verificar que el Endpoint Funcione

Prueba con curl o Postman:

```bash
curl -X POST http://146.181.39.73:8080/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "id_academic_space": 1,
    "start_datetime": "2026-01-15T08:00:00",
    "end_datetime": "2026-01-15T10:00:00",
    "reason": "Clase de programación",
    "description": "Personas: 30. Equipamiento: Proyector 4K"
  }'
```

**Respuesta esperada (200 OK):**
```json
{
  "id_reservation": 123,
  "start_datetime": "2026-01-15T08:00:00",
  "end_datetime": "2026-01-15T10:00:00",
  "reason": "Clase de programación",
  "description": "Personas: 30. Equipamiento: Proyector 4K",
  "resquested_at": "2026-01-10T10:30:00",
  "id_user_profile": 456,
  "id_academic_space": 1,
  "id_state": 1
}
```

### Paso 2: Activar la Conexión en el Frontend

En `consultar-disponibilidad.component.ts`, línea ~330:

**COMENTAR** el código de simulación (líneas 332-390):
```typescript
// ✅ SIMULACIÓN: Guardar en localStorage
// this.misReservas.unshift(data);
// ... todo el bloque de simulación
```

**DESCOMENTAR** el código de backend (líneas 303-330):
```typescript
// Combinar fecha y hora en formato ISO 8601 (datetime)
const startDatetime = `${data.fecha}T${data.horaInicio}:00`;
// ... todo el bloque de backend
```

### Paso 3: Verificar CORS

Asegúrate que el backend permita peticiones desde:
```
http://localhost:4200
```

En Spring Boot (ejemplo):
```java
@CrossOrigin(origins = "http://localhost:4200")
@RestController
@RequestMapping("/reservations")
public class ReservationController {
    // ...
}
```

### Paso 4: Probar

1. Completa el formulario de reserva
2. Click en "Confirmar Reserva"
3. Deberías ver el SweetAlert con el ID real del backend
4. Verifica en la base de datos que se guardó

## 📊 Estructura de Datos

### Request (Frontend → Backend)

```json
{
  "id_academic_space": 1,
  "start_datetime": "2026-01-15T08:00:00",
  "end_datetime": "2026-01-15T10:00:00",
  "reason": "Clase de programación",
  "description": "Personas: 30. Equipamiento: Proyector 4K"
}
```

### Response (Backend → Frontend)

```json
{
  "id_reservation": 123,
  "start_datetime": "2026-01-15T08:00:00",
  "end_datetime": "2026-01-15T10:00:00",
  "reason": "Clase de programación",
  "description": "Personas: 30. Equipamiento: Proyector 4K",
  "resquested_at": "2026-01-10T10:30:00Z",
  "id_user_profile": 456,
  "id_academic_space": 1,
  "id_state": 1
}
```

## 🗄️ Tabla de Base de Datos

```sql
CREATE TABLE RESERVATION (
  id_reservation INT PRIMARY KEY AUTO_INCREMENT,
  start_datetime DATETIME NOT NULL,
  end_datetime DATETIME NOT NULL,
  reason VARCHAR(255) NOT NULL,
  description TEXT,
  resquested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  id_user_profile INT NOT NULL,
  id_academic_space INT NOT NULL,
  id_state INT NOT NULL,
  FOREIGN KEY (id_user_profile) REFERENCES USER_PROFILE(id_user_profile),
  FOREIGN KEY (id_academic_space) REFERENCES ACADEMIC_SPACE(id_academic_space),
  FOREIGN KEY (id_state) REFERENCES STATE(id_state)
);
```

## 🔐 Autenticación

El backend debe obtener `id_user_profile` del token JWT del usuario autenticado.

**NO** enviar `id_user_profile` desde el frontend por seguridad.

## ✅ Checklist Backend

- [ ] Endpoint POST `/reservations` creado
- [ ] Acepta JSON con los campos correctos
- [ ] Valida datos (fechas, horarios, disponibilidad)
- [ ] Guarda en la tabla RESERVATION
- [ ] Retorna la reserva creada con ID
- [ ] CORS habilitado para localhost:4200
- [ ] Autenticación JWT implementada
- [ ] Obtiene id_user_profile del token

## 📞 Contacto

Si necesitas ayuda para implementar el backend, contacta al equipo de backend.

---

**Última actualización:** 2026-01-10  
**Estado:** Modo Simulación Activo
