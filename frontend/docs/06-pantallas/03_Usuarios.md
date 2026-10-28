# Pantallas · 03 — Usuarios (`/usuarios`) · solo nacional

**Propósito:** CU-01 · RF01, RF41 · ⚠ SUP-30, SUP-31.

```
 Usuarios                                                       [+ Nuevo usuario]
 [Buscar nombre o correo…]  [Rol ▾]  [Estado ▾]
 ┌──────────────┬───────────────────────┬──────────┬──────────────┬─────────┬──────────────────┐
 │ Nombre       │ Correo                │ Rol      │ Regionales   │ Estado  │                  │
 │ Irene …      │ irene@coalsud…        │ Nacional │ Todas        │ Activo  │ ✎  🔑  ⏸         │
 │ Vanessa …    │ vanessa@…             │ Regional │ LP · CBBA    │ Activo  │ ✎  🔑  ⏸         │
 └──────────────┴───────────────────────┴──────────┴──────────────┴─────────┴──────────────────┘
```

## Alta / edición (modal `md`)
| CAMPO | TIPO | VALIDACIÓN |
|---|---|---|
| Nombre * | texto | requerido |
| Correo * | email | formato; único (`DUPLICADO`); no editable después del alta |
| Rol * | `Nacional` / `Regional` | |
| Regionales * | checkboxes LP · CBBA · SCZ | requerido si el rol es regional; oculto si es nacional (CP-01.5) |
| Contraseña temporal * (solo en el alta) | texto + botón "Generar" | ≥ 8 caracteres; se muestra una vez para comunicarla al usuario |

## Acciones
| ACCIÓN | LLAMADA | CONFIRMACIÓN |
|---|---|---|
| Crear / editar | `functions.invoke('admin-usuarios', { accion: 'crear' \| 'actualizar', … })` | — |
| Resetear contraseña 🔑 | `accion: 'resetear_password'` + contraseña temporal nueva | "El usuario deberá cambiarla al ingresar" |
| Desactivar ⏸ / Reactivar | `accion: 'desactivar' \| 'reactivar'` | "Se cerrarán sus sesiones abiertas" |

## Errores
- `ULTIMO_NACIONAL` → "Debe quedar al menos un usuario nacional activo." (CP-01.3)
- `DUPLICADO` → marca el correo (CP-01.4).

**Datos:** `usuario` + `usuario_regional` (select; RLS: solo el nacional ve todos).

**Implementación (FE-06):** la lista es corta y se pide entera una vez; los filtros (texto, rol, estado) van en la URL y se aplican en pantalla, sin un request por filtro. La contraseña temporal se genera al abrir el alta (o con el botón) y se muestra para comunicarla. Desactivar/reactivar pide confirmación y no es optimista.

**E2E:** CP-01.1, CP-01.2, CP-01.3, CP-01.4, CP-01.7.
