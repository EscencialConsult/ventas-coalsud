import { NavLink } from 'react-router-dom'
import * as m from 'motion/react-m'
import { LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { useAvisos } from '@/core/avisos/useAvisos'
import { usePermisos } from '@/core/auth/usePermisos'
import { useSesion } from '@/core/auth/useSesion'
import { Avatar } from '@/shared/ui/Avatar'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { cn } from '@/shared/ui/cn'
import { useTooltip } from '@/shared/ui/useTooltip'
import { Logo, Marca } from './Logo'
import { MENU, type ItemMenu } from './navegacion'
import { descripcionRol } from './usuario'

interface Props {
  /** Solo íconos (escritorio, preferencia del usuario). */
  compacto?: boolean
  /** Si se pasa, se muestra el botón para contraer/expandir (escritorio). */
  alAlternarCompacto?: () => void
  /** Si se pasa, se muestra el botón para cerrar (drawer en pantallas chicas). */
  alCerrar?: () => void
  alNavegar?: () => void
}

export function Sidebar({ compacto = false, alAlternarCompacto, alCerrar, alNavegar }: Props) {
  const { perfil, salir } = useSesion()
  const puede = usePermisos()
  const { data: avisos } = useAvisos()

  const valorBadge = (item: ItemMenu): number => {
    if (!avisos || !item.badge) return 0
    return item.badge === 'dias_pendientes' ? avisos.dias_pendientes.length : avisos[item.badge]
  }

  return (
    <aside className={cn('flex h-full flex-col bg-sidebar transition-[width] duration-200 ease-out', compacto ? 'w-sidebar-mini' : 'w-sidebar')}>
      <div className={cn('flex h-topbar shrink-0 items-center border-b border-white/[0.06]', compacto ? 'justify-center' : 'justify-between gap-2 pr-3 pl-4')}>
        {compacto && alAlternarCompacto ? (
          <BotonExpandir alExpandir={alAlternarCompacto} />
        ) : (
          <Marca compacto={compacto} />
        )}
        {!compacto && alAlternarCompacto && (
          <BotonIcono etiqueta="Contraer menú" variante="oscuro" ladoTooltip="derecha" onClick={alAlternarCompacto}>
            <PanelLeftClose size={17} />
          </BotonIcono>
        )}
        {alCerrar && (
          <BotonIcono etiqueta="Cerrar menú" variante="oscuro" sinTooltip onClick={alCerrar}>
            <X size={17} />
          </BotonIcono>
        )}
      </div>

      <nav className="scroll-fino-oscuro flex-1 overflow-x-hidden overflow-y-auto px-3 py-4" aria-label="Menú principal">
        {MENU.map((grupo, indice) => {
          const items = grupo.items.filter((i) => !i.visibleCon || puede(i.visibleCon))
          if (!items.length) return null
          // Un grupo de un solo ítem no necesita título: basta un separador.
          const conTitulo = !compacto && items.length > 1
          return (
            <div key={grupo.titulo} className="mb-4 last:mb-0">
              {conTitulo ? (
                <div className="px-3 pb-2 text-micro font-semibold tracking-[1.5px] text-white/30 uppercase">{grupo.titulo}</div>
              ) : (
                indice > 0 && <div className={cn('mb-3 border-t border-white/[0.07]', compacto ? 'mx-2' : 'mx-3')} aria-hidden />
              )}
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.ruta}>
                    <ItemNav item={item} badge={valorBadge(item)} compacto={compacto} alNavegar={alNavegar} />
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-white/[0.06] p-3">
        {perfil && (
          <div className={cn('flex items-center gap-2.5 rounded-control bg-white/[0.04] p-2', compacto && 'flex-col p-1.5')}>
            <Avatar nombre={perfil.nombre} />
            {!compacto && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-cuerpo font-semibold text-white">{perfil.nombre}</div>
                <div className="truncate text-mini text-white/40">{descripcionRol(perfil)}</div>
              </div>
            )}
            <BotonIcono etiqueta="Salir" variante="oscuro" ladoTooltip={compacto ? 'derecha' : 'arriba'} onClick={() => salir()}>
              <LogOut size={15} />
            </BotonIcono>
          </div>
        )}
      </div>
    </aside>
  )
}

// Sidebar contraído: el logo es el botón para expandir; al pasar el mouse (o
// con el foco) muestra el ícono de expandir en su lugar.
function BotonExpandir({ alExpandir }: { alExpandir: () => void }) {
  const { propsDisparador, tooltip } = useTooltip<HTMLButtonElement>('Expandir menú', { lado: 'derecha' })
  return (
    <>
      <button
        type="button"
        aria-label="Expandir menú"
        onClick={alExpandir}
        {...propsDisparador}
        className="group relative flex size-10 items-center justify-center rounded-control transition-colors hover:bg-white/[0.07] focus-visible:bg-white/[0.07] active:bg-white/10"
      >
        <span className="transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0">
          <Logo tam={28} />
        </span>
        <PanelLeftOpen size={18} className="absolute text-white/85 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
      </button>
      {tooltip}
    </>
  )
}

function ItemNav({ item, badge, compacto, alNavegar }: { item: ItemMenu; badge: number; compacto: boolean; alNavegar?: () => void }) {
  const { propsDisparador, tooltip } = useTooltip<HTMLAnchorElement>(badge ? `${item.etiqueta} (${badge})` : item.etiqueta, { lado: 'derecha', desactivado: !compacto })

  return (
    <>
      <NavLink
        to={item.ruta}
        end={item.exacta}
        onClick={alNavegar}
        {...propsDisparador}
        className={({ isActive }) =>
          cn(
            'relative flex h-9 items-center gap-3 rounded-control text-cuerpo font-medium transition-colors outline-offset-[-2px]',
            compacto ? 'justify-center' : 'px-3',
            isActive ? 'text-white' : 'text-white/55 hover:bg-white/[0.05] hover:text-white/90',
          )
        }
      >
        {({ isActive }) => (
          <>
            {/* El indicador del ítem activo se desliza de un ítem al otro. */}
            {isActive && (
              <m.span layoutId="nav-activo" className="absolute inset-0 rounded-control bg-white/[0.08]" transition={{ type: 'spring', stiffness: 500, damping: 40 }} aria-hidden>
                <span className="absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-rojo-2" />
              </m.span>
            )}
            <item.icono size={17} className={cn('relative shrink-0', isActive && 'text-rojo-2')} aria-hidden />
            <span className={cn('relative flex-1 truncate', compacto && 'sr-only')}>{item.etiqueta}</span>
            {badge > 0 &&
              (compacto ? (
                <span className="absolute top-1 right-1.5 size-2 rounded-full bg-rojo-2 ring-2 ring-sidebar" aria-hidden />
              ) : (
                <span className="relative min-w-5 rounded-full bg-rojo px-1.5 py-px text-center text-micro font-bold text-white" aria-hidden>
                  {badge}
                </span>
              ))}
            {badge > 0 && <span className="sr-only">, {badge} pendientes</span>}
          </>
        )}
      </NavLink>
      {tooltip}
    </>
  )
}
