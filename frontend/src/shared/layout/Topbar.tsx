import { Link } from 'react-router-dom'
import { FlaskConical, Menu } from 'lucide-react'
import { MODO_FIXTURES } from '@/lib/config'
import { useDesplazado } from '@/shared/hooks/useDesplazado'
import { Badge } from '@/shared/ui/Badge'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { cn } from '@/shared/ui/cn'
import { AccionesRapidas } from './AccionesRapidas'
import { Campana } from './Campana'
import { ContextoOperacion } from './ContextoOperacion'
import { Logo } from './Logo'
import { MenuUsuario } from './MenuUsuario'

// Topbar: a la izquierda, dónde y cuándo se opera (regional + fecha); a la
// derecha, altas rápidas, avisos y usuario. El título de la pantalla ya está
// en la página. Al bajar la página, el borde se cambia por una sombra corta.
export function Topbar({ alAbrirMenu }: { alAbrirMenu: () => void }) {
  const desplazado = useDesplazado()

  return (
    <header
      className={cn(
        'sticky top-0 z-50 flex h-topbar shrink-0 items-center justify-between gap-3 border-b bg-white px-3 transition-[box-shadow,border-color] duration-200 sm:px-4 lg:px-6',
        desplazado ? 'border-transparent shadow-card' : 'border-borde',
      )}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <BotonIcono etiqueta="Abrir menú" sinTooltip onClick={alAbrirMenu} className="lg:hidden">
          <Menu size={19} />
        </BotonIcono>
        <Link to="/" aria-label="Ir al dashboard" className="hidden shrink-0 rounded-control sm:block lg:hidden">
          <Logo tam={26} />
        </Link>
        <ContextoOperacion />
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
        {MODO_FIXTURES && (
          <span className="hidden lg:inline-flex">
            <Badge variante="alerta">
              <FlaskConical size={12} aria-hidden /> Modo demostración
            </Badge>
          </span>
        )}
        <AccionesRapidas />
        <Campana />
        <span className="hidden h-6 w-px bg-borde sm:block" aria-hidden />
        <MenuUsuario />
      </div>
    </header>
  )
}
