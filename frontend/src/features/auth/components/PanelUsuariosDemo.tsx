import { useState } from 'react'
import { ChevronRight, FlaskConical } from 'lucide-react'
import type { UsuarioDemo } from '@/fixtures/organizacion'
import { Avatar } from '@/shared/ui/Avatar'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { ChipIcono } from '@/shared/ui/ChipIcono'

interface Props {
  usuarios: UsuarioDemo[]
  /** Devuelve la promesa del ingreso: el botón queda en loading hasta que termine. */
  alElegir: (usuarioId: string) => Promise<void>
}

// "Entrar como…" del login en modo fixtures (06-pantallas/01 §1b, ⚙ DT-17).
export function PanelUsuariosDemo({ usuarios, alElegir }: Props) {
  // Mientras entra uno, los demás quedan deshabilitados (sin doble ingreso).
  const [entrando, setEntrando] = useState(false)
  const elegir = async (usuarioId: string) => {
    setEntrando(true)
    try {
      await alElegir(usuarioId)
    } finally {
      setEntrando(false)
    }
  }

  return (
    <section className="mt-4 rounded-card border border-borde bg-white p-5 shadow-card sm:p-6" aria-labelledby="titulo-demo">
      <div className="mb-1 flex items-center gap-3">
        <ChipIcono icono={FlaskConical} tono="alerta" tam="sm" />
        <h2 id="titulo-demo" className="flex-1 text-subtitulo font-semibold">
          Entrar como…
        </h2>
        <Badge variante="alerta">Modo demostración</Badge>
      </div>
      <p className="mb-4 text-chico text-texto-3">Datos de ejemplo. Elija un usuario o ingrese con su correo y cualquier contraseña.</p>
      <ul className="space-y-2">
        {usuarios.map(({ perfil, descripcion }) => (
          <li key={perfil.id}>
            <Button variante="opcion" disabled={entrando} onClick={() => elegir(perfil.id)}>
              <Avatar nombre={perfil.nombre} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{perfil.nombre}</span>
                <span className="block truncate text-chico font-normal text-texto-3">{descripcion}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-texto-3" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
