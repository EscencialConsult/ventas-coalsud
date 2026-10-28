// Fuente de datos (⚙ DT-17). Sin la variable: fixtures en `npm run dev` y
// supabase en el build. Así, un despliegue sin configurar nunca muestra
// datos de ejemplo como si fueran reales.
const modo = import.meta.env.VITE_MODO_DATOS ?? (import.meta.env.DEV ? 'fixtures' : 'supabase')

export const MODO_FIXTURES = modo === 'fixtures'

// ⚠ SUP-38: cierre de sesión por inactividad.
export const INACTIVIDAD_MIN = Number(import.meta.env.VITE_INACTIVIDAD_MIN) || 30
