# Pantallas · 01 — Login y sesión

**Propósito:** CU-02 · RF02, RF41 · RNF-14.

## 1 · Login (`/login`)
```
┌───────────────────────────────────────────┐
│            [logo] COALSUD                 │
│            ONE Comercial                  │
│                                           │
│  CORREO                                   │
│  [________________________]               │
│  CONTRASEÑA                               │
│  [________________________] 👁            │
│                                           │
│  [          Ingresar          ]           │
│                                           │
│  ⓘ ¿Olvidó su contraseña? Pida al         │
│    administrador nacional que la resetee. │
└───────────────────────────────────────────┘
```
- **Datos:** `auth.signInWithPassword` → `rpc('mi_perfil')`.
- **Validación:** correo con formato válido; contraseña no vacía.
- **Errores:**

| CASO | MENSAJE |
|---|---|
| Credenciales inválidas | "Correo o contraseña incorrectos." (sin decir cuál; CP-02.2) |
| `USUARIO_INACTIVO` | "Su usuario está desactivado. Consulte al administrador." |
| Cierre por inactividad | Banner "Su sesión se cerró por inactividad." (viene por query `?motivo=inactividad`) |

- **Después del login:**
  - si `debe_cambiar_password` → `/cambiar-password`;
  - si no → la ruta pedida, o `/`.
- No hay "Recordarme": la sesión de Supabase persiste en `localStorage` y el cierre por inactividad la limita (⚠ SUP-38).

## 1b · Login en modo `fixtures` (⚙ DT-17)
Con `VITE_MODO_DATOS=fixtures`, el formulario se reemplaza por un bloque **"Entrar como…"** con un botón por usuario de ejemplo:

| BOTÓN | SIMULA |
|---|---|
| Irene — Nacional | rol nacional, todas las regionales |
| Ingeniero — Nacional | segundo nacional (⚠ SUP-50) |
| Vanessa — Regional La Paz + Cochabamba | selector de regional activa |
| Fernando — Regional Santa Cruz | regional fija |
| Usuario nuevo — Primer ingreso | `debe_cambiar_password = true` → `/cambiar-password` |

- Un aviso permanente "Modo demostración: datos de ejemplo" queda visible en el login y en el topbar.
- La sesión simulada se guarda en `sessionStorage`: se pierde al cerrar la pestaña.
- El cierre por inactividad funciona igual.

## 2 · Cambiar contraseña (`/cambiar-password`)
```
  Cambie su contraseña para continuar
  NUEVA CONTRASEÑA        [__________]   mínimo 8 caracteres
  REPETIR CONTRASEÑA      [__________]
  [ Guardar y continuar ]                 [Salir]
```
- **Acciones:** `auth.updateUser({ password })` → `rpc('marcar_password_cambiado')` → refrescar el perfil → `/`.
- **Validación:** ≥ 8 caracteres; las dos iguales; distinta de la temporal (la verifica Supabase si se configura; si no, solo las dos primeras).
- Si `debe_cambiar_password`, es la única ruta navegable (CP-02.6). También se llega desde el menú del avatar.

## 3 · Aviso de inactividad (modal global)
```
  ⏱ Su sesión se cerrará en 60 segundos por inactividad.
  [ Seguir conectado ]   [ Salir ahora ]
```
Al minuto 29 (`VITE_INACTIVIDAD_MIN − 1`). Ver [Arquitectura §2](../02-Arquitectura_Frontend.md).

**E2E:** CP-02.1, CP-02.2, CP-02.5, CP-02.6.
