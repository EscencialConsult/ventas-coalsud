import type { OpcionesPeticion } from '@/lib/peticion'

// Los fixtures responden con una demora parecida a la red, para que los estados
// de carga (Skeleton, botones "cargando") se vean igual que con Supabase, y
// respetan el AbortSignal igual que supabase-js.
export function esperar(opciones?: OpcionesPeticion, ms = 150 + Math.random() * 250): Promise<void> {
  const signal = opciones?.signal
  const demora = import.meta.env.MODE === 'test' ? 0 : ms
  return new Promise((resolver, rechazar) => {
    if (signal?.aborted) {
      rechazar(signal.reason)
      return
    }
    const temporizador = setTimeout(resolver, demora)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(temporizador)
        rechazar(signal.reason)
      },
      { once: true },
    )
  })
}

/** Devuelve una copia (para que nadie mute los datos en memoria) tras la demora. */
export async function responder<T>(valor: T, opciones?: OpcionesPeticion): Promise<T> {
  await esperar(opciones)
  return structuredClone(valor)
}

/** Filtra por regional: null = todas las que el usuario puede leer. */
export function deRegional<T extends { regional_id: string }>(filas: T[], regionalId: string | null): T[] {
  return regionalId ? filas.filter((f) => f.regional_id === regionalId) : filas
}
