import { ChevronDown, KeyRound, LogOut } from 'lucide-react'
import { useSesion } from '@/core/auth/useSesion'
import { Avatar } from '@/shared/ui/Avatar'
import { Badge } from '@/shared/ui/Badge'
import { cn } from '@/shared/ui/cn'
import { Desplegable, ItemDesplegable } from '@/shared/ui/Desplegable'
import { RELIEVE } from '@/shared/ui/neumorfismo'
import { descripcionRol } from './usuario'

export function MenuUsuario() {
  const { perfil, salir } = useSesion()
  if (!perfil) return null

  return (
    <Desplegable
      etiqueta="Menú de usuario"
      className="w-64"
      disparador={(props, abierto) => (
        <button
          type="button"
          {...props}
          aria-label="Menú de usuario"
          className={cn('flex items-center gap-1 rounded-full p-px pr-1.5 transition-[background-color,box-shadow] duration-200', RELIEVE)}
        >
          <Avatar nombre={perfil.nombre} />
          <ChevronDown size={14} className={cn('text-texto-3 transition-transform duration-200', abierto && 'rotate-180')} aria-hidden />
        </button>
      )}
    >
      {(cerrar) => (
        <>
          <div className="flex items-center gap-3 border-b border-borde px-2.5 pt-1.5 pb-3">
            <Avatar nombre={perfil.nombre} tam="lg" />
            <div className="min-w-0">
              <div className="truncate font-semibold">{perfil.nombre}</div>
              <div className="truncate text-chico text-texto-3">{perfil.email}</div>
              <Badge variante={perfil.rol === 'nacional' ? 'marca' : 'info'} className="mt-1.5">
                {descripcionRol(perfil)}
              </Badge>
            </div>
          </div>
          <div className="pt-1.5">
            <ItemDesplegable a="/cambiar-password" onClick={cerrar} icono={<KeyRound />}>
              Cambiar contraseña
            </ItemDesplegable>
            <ItemDesplegable peligro onClick={() => salir()} icono={<LogOut className="text-error" />}>
              Salir
            </ItemDesplegable>
          </div>
        </>
      )}
    </Desplegable>
  )
}
