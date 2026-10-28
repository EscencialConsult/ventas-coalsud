import { useEffect, useState, type ReactNode } from 'react'
import { Printer, X } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import './print.css'

interface Props {
  titulo: string
  /** Datos listos: dispara el diálogo de impresión una vez cargadas las fuentes. */
  listo: boolean
  /** Aviso antes de imprimir (p. ej. "cada copia ocupa una hoja"). */
  aviso?: ReactNode
  children: ReactNode
}

// Pestaña de impresión sin shell (07-Impresion §1): carga, espera las fuentes,
// abre el diálogo y, al terminar, ofrece cerrar la pestaña. La barra no se imprime.
export function PrintLayout({ titulo, listo, aviso, children }: Props) {
  const [impreso, setImpreso] = useState(false)

  useEffect(() => {
    document.title = titulo
  }, [titulo])

  useEffect(() => {
    if (!listo) return
    let cancelado = false
    const imprimir = () => {
      if (!cancelado) window.print()
    }
    // Si las fuentes fallan, se imprime igual con las del sistema.
    document.fonts.ready.then(imprimir, imprimir)
    return () => {
      cancelado = true
    }
  }, [listo])

  useEffect(() => {
    const terminar = () => setImpreso(true)
    window.addEventListener('afterprint', terminar)
    return () => window.removeEventListener('afterprint', terminar)
  }, [])

  return (
    <div className="min-h-screen bg-fondo-3 print:min-h-0 print:bg-fondo">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-borde bg-fondo px-4 py-3 print:hidden">
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold">{titulo}</h1>
          <p className="text-chico text-texto-3">En el diálogo: márgenes «Ninguno» y «Gráficos de fondo» activado.</p>
          {aviso && <p className="mt-1 text-chico font-medium text-alerta">{aviso}</p>}
        </div>
        <Button icono={<Printer size={15} />} disabled={!listo} onClick={() => window.print()}>
          Imprimir
        </Button>
        {impreso && (
          <Button variante="secundario" icono={<X size={15} />} onClick={() => window.close()}>
            Cerrar pestaña
          </Button>
        )}
      </header>
      <main className="flex flex-col items-center gap-6 py-6 print:block print:p-0">{children}</main>
    </div>
  )
}

/** Una hoja A4 en pantalla (sombra) y en papel (sin sombra, salto de página después). */
export function HojaA4({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`relative w-[210mm] bg-fondo text-texto shadow-card break-after-page last:break-after-auto print:shadow-none ${className}`}>{children}</section>
}
