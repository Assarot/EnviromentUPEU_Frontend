# 🎯 Asignación Automática de Ambientes

## 📋 Descripción

El módulo de **Asignación Automática** permite generar automáticamente la asignación de ambientes académicos según la facultad, carrera y ciclo seleccionados. El sistema utiliza reglas inteligentes para asignar los tipos de ambientes más apropiados según las necesidades de cada carrera.

## ✨ Características

- **Selección jerárquica**: Facultad → Carrera → Ciclo
- **Asignación inteligente**: Reglas específicas por tipo de carrera
- **Visualización detallada**: Muestra todos los ambientes asignados con sus características
- **Confirmación de asignación**: Permite revisar antes de guardar
- **Interfaz moderna**: Diseño responsive con animaciones suaves

## 🎓 Facultades Soportadas

### FIA (Facultad de Ingeniería y Arquitectura)
- **Sistemas / Software**: Laboratorios de cómputo, laboratorios, aulas
- **Civil**: Talleres, laboratorios, aulas
- **Arquitectura**: Talleres, aulas de dibujo, aulas
- **Industrial**: Talleres, laboratorios, aulas
- **Ambiental**: Laboratorios, aulas, talleres

### FCS (Facultad de Ciencias de la Salud)
- **Enfermería**: Laboratorios clínicos, laboratorios, aulas
- **Medicina**: Laboratorios clínicos, aulas, auditorios
- **Psicología**: Aulas, salas de terapia, laboratorios

### FCE (Facultad de Ciencias Empresariales)
- **Contabilidad**: Aulas, laboratorios de cómputo, auditorios
- **Administración**: Aulas, salas de reuniones, auditorios
- **Economía**: Aulas, laboratorios de cómputo, auditorios

### FACIHED (Facultad de Ciencias Humanas y Educación)
- **Educación**: Aulas, talleres, laboratorios
- **Teología**: Aulas, auditorios, salas

## 🚀 Cómo Usar

### 1. Acceso al Módulo
Navega a través del menú principal:
- **Menú Admin** → "⚡ Asignación Automática"
- **Menú COOROOMS** → "⚡ Asignación Automática"
- O directamente: `/main/asignacion-automatica`

### 2. Selección de Datos

1. **Selecciona una Facultad**
   - Elige entre FIA, FCS, FCE, FACIHED
   - Las carreras se filtrarán automáticamente

2. **Selecciona una Carrera**
   - Aparecerán solo las carreras de la facultad seleccionada
   - Los ciclos se filtrarán automáticamente

3. **Selecciona un Ciclo**
   - Elige el ciclo académico correspondiente

### 3. Generar Asignación

1. Haz clic en **"⚡ Generar Asignación Automática"**
2. El sistema procesará la solicitud (1-2 segundos)
3. Se mostrará un resumen con:
   - Facultad, Carrera y Ciclo seleccionados
   - Número de ambientes asignados
   - Pabellón asignado (si aplica)

### 4. Revisar Resultados

La pantalla de resultados muestra:

- **Resumen General**: Información de la asignación en un banner destacado
- **Lista de Ambientes**: Cada ambiente incluye:
  - Nombre y tipo del ambiente
  - Icono representativo (💻 🔬 🔧 📚 etc.)
  - Ubicación y capacidad
  - Pabellón y piso
  - Motivo de la asignación

### 5. Confirmar o Reintentar

- **✅ Confirmar y Guardar**: Guarda la asignación en el sistema
- **🔄 Generar Nueva Asignación**: Reinicia el formulario para crear otra asignación

## 🧠 Lógica de Asignación

### Reglas por Carrera

El sistema utiliza reglas específicas para cada carrera:

```typescript
{
  'sistemas': {
    tipos: ['laboratorio de cómputo', 'laboratorio', 'aula'],
    prioridad: ['laboratorio de cómputo', 'laboratorio']
  },
  'arquitectura': {
    tipos: ['taller', 'aula de dibujo', 'aula'],
    prioridad: ['taller', 'aula de dibujo']
  },
  // ... más reglas
}
```

### Proceso de Asignación

1. **Identificación**: Detecta el tipo de carrera por nombre
2. **Filtrado**: Busca ambientes disponibles del tipo requerido
3. **Priorización**: Asigna primero los ambientes prioritarios
4. **Complemento**: Agrega aulas genéricas si es necesario
5. **Pabellón**: Determina el pabellón según la facultad

### Cantidad de Ambientes

- **Mínimo**: 5 ambientes por asignación
- **Prioridad**: 3 ambientes de cada tipo prioritario
- **Complemento**: Aulas genéricas hasta completar 5

## 🎨 Iconos por Tipo de Ambiente

| Tipo | Icono | Descripción |
|------|-------|-------------|
| Laboratorio de Cómputo | 💻 | Equipos informáticos |
| Laboratorio | 🔬 | Laboratorio general |
| Laboratorio Clínico | 🏥 | Prácticas médicas |
| Taller | 🔧 | Trabajo práctico |
| Aula | 📚 | Clase teórica |
| Aula de Dibujo | 🎨 | Diseño y arte |
| Auditorio | 🎭 | Eventos grandes |
| Sala | 🚪 | Sala general |
| Sala de Terapia | 🛋️ | Consultas psicológicas |
| Sala de Reuniones | 👥 | Reuniones grupales |

## 🔧 Configuración Técnica

### Servicios Utilizados

```typescript
- FacultyService: Gestión de facultades
- ProfessionalSchoolService: Gestión de carreras
- CycleService: Gestión de ciclos
- AcademicSpaceService: Gestión de ambientes
- TypeAcademicSpaceService: Tipos de ambientes
- BuildingService: Gestión de pabellones
- CourseSpaceAssignmentService: Asignaciones
```

### Modelos de Datos

```typescript
interface AsignacionAutomatica {
  facultad: Faculty;
  carrera: ProfessionalSchool;
  ciclo: Cycle;
  ambientesAsignados: AmbienteAsignado[];
  pabellon?: Building;
}

interface AmbienteAsignado {
  ambiente: AcademicSpace;
  tipo: string;
  motivo: string;
}
```

## 📱 Responsive Design

El componente es completamente responsive:

- **Desktop**: Grid de 3-4 columnas
- **Tablet**: Grid de 2 columnas
- **Mobile**: Vista de 1 columna con scroll vertical

## 🎯 Estado de Desarrollo

### ✅ Implementado
- Formulario de selección jerárquica
- Reglas de asignación por carrera
- Visualización de resultados
- Interfaz responsive
- Animaciones y transiciones

### ⚠️ Modo Simulación
- Los datos se muestran pero no se guardan en la base de datos
- Se requiere implementar el endpoint de backend para persistencia

### 🔜 Próximas Mejoras
- Integración con backend para guardar asignaciones
- Historial de asignaciones realizadas
- Exportación a PDF/Excel
- Edición manual de asignaciones generadas
- Validación de conflictos de horarios
- Notificaciones por email

## 🐛 Solución de Problemas

### No aparecen carreras
- Verifica que hayas seleccionado una facultad
- Asegúrate de que existan carreras en la base de datos para esa facultad

### No aparecen ciclos
- Verifica que hayas seleccionado una carrera
- Asegúrate de que existan ciclos en la base de datos para esa carrera

### No se generan ambientes
- Verifica que existan ambientes disponibles en el sistema
- Revisa que los tipos de ambiente coincidan con las reglas de asignación

### Error al cargar datos
- Verifica la conexión con el backend
- Revisa la consola del navegador para más detalles
- Asegúrate de que los servicios estén funcionando correctamente

## 📞 Soporte

Para reportar problemas o sugerencias:
- Contacta al equipo de desarrollo
- Revisa la documentación del proyecto
- Consulta los logs del sistema

## 📄 Licencia

Este módulo es parte del sistema EnviromentUPEU y está sujeto a las mismas políticas de uso y licencia del proyecto principal.

---

**Última actualización**: Mayo 2026  
**Versión**: 1.0.0  
**Desarrollado por**: Equipo EnviromentUPEU
