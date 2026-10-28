import { KeyRound, RefreshCw } from 'lucide-react'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { Input } from '@/shared/ui/Campo'
import { generarPassword } from '../usuarios.utils'
import { MINIMO_PASSWORD } from '../usuarios.service'

interface Props {
  valor: string
  error?: string
  alCambiar: (valor: string) => void
  alSalir: () => void
}

// Contraseña temporal visible (se comunica al usuario una sola vez), con
// botón para generar una al azar.
export function CampoPasswordTemporal({ valor, error, alCambiar, alSalir }: Props) {
  return (
    <Input
      label="Contraseña temporal"
      requerido
      icono={KeyRound}
      autoComplete="off"
      spellCheck={false}
      value={valor}
      onChange={(e) => alCambiar(e.target.value)}
      onBlur={alSalir}
      error={error}
      ayuda={`Mínimo ${MINIMO_PASSWORD} caracteres. Se muestra una sola vez: comuníquela al usuario; deberá cambiarla al ingresar.`}
      sufijo={
        <BotonIcono etiqueta="Generar una contraseña" variante="interno" onClick={() => alCambiar(generarPassword())}>
          <RefreshCw size={14} />
        </BotonIcono>
      }
    />
  )
}
