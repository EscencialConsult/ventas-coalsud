import { useLayoutEffect, useRef } from 'react'

const DURACION_MS = 700

function prefiereSinMovimiento(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/**
 * Cifra que cuenta desde lo que se ve hasta el valor nuevo (KPIs). Escribe el
 * texto directo en el nodo en cada cuadro, sin re-renderizar React. Si el
 * valor no cambia (p. ej. un refetch con el mismo dato), no anima.
 */
export function NumeroAnimado({ valor, formato }: { valor: number; formato: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null)
  // Último valor escrito en pantalla: si cambia a mitad de animación, sigue desde ahí.
  const mostrado = useRef(0)
  const formatoRef = useRef(formato)

  useLayoutEffect(() => {
    formatoRef.current = formato
  })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const escribir = (n: number) => {
      mostrado.current = n
      el.textContent = formatoRef.current(n)
    }
    const desde = mostrado.current
    if (desde === valor || prefiereSinMovimiento()) {
      escribir(valor)
      return
    }
    const inicio = performance.now()
    let cuadro = 0
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / DURACION_MS)
      escribir(desde + (valor - desde) * (1 - (1 - t) ** 3))
      if (t < 1) cuadro = requestAnimationFrame(paso)
    }
    el.textContent = formatoRef.current(desde)
    cuadro = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(cuadro)
  }, [valor])

  return <span ref={ref}>{formato(valor)}</span>
}
