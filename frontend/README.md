# COALSUD — Frontend

App React del Sistema Comercial de COALSUD S.R.L. Documentación: [`docs/`](docs/README.md).

## Arrancar

```bash
npm install
npm run dev        # http://localhost:5173 — modo fixtures (datos de ejemplo, sin backend)
```

En modo fixtures, el login muestra **"Entrar como…"** para simular al usuario: Irene o el ingeniero (nacional), Vanessa (LP + CBBA), Fernando (SCZ) o un usuario en su primer ingreso (⚙ DT-17).

Para usar el backend real, copiar `.env.example` a `.env` con `VITE_MODO_DATOS=supabase` y las variables de Supabase.

## Scripts

| SCRIPT | QUÉ HACE |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Chequeo de tipos + build de producción (`dist/`) |
| `npm run lint` | oxlint |
| `npm run typecheck` | `tsc -b` |
| `npm test` | Vitest (unitarios y de componentes) |

En desarrollo, `/dev/ui` muestra todos los componentes del sistema de diseño.
