import { aplicarErrorFormulario } from '@/core/errores/errorFormulario'
import type { UsuarioSistema } from '@/core/models/maestros'
import { useFormulario, type Errores } from '@/shared/hooks/useFormulario'
import { Alerta } from '@/shared/ui/Estados'
import { ModalFormulario } from '@/shared/ui/ModalFormulario'
import { toast } from '@/shared/ui/toast'
import { MINIMO_PASSWORD } from '../usuarios.service'
import { useResetearPassword } from '../usuarios.queries'
import { generarPassword } from '../usuarios.utils'
import { CampoPasswordTemporal } from './CampoPasswordTemporal'

interface Valores extends Record<string, unknown> {
  password: string
}

const validar = (v: Valores): Errores<Valores> => ({ password: v.password.length >= MINIMO_PASSWORD ? undefined : `Mínimo ${MINIMO_PASSWORD} caracteres.` })

// Resetear contraseña (CP-01.7): queda una temporal y el usuario debe cambiarla al ingresar.
export function ModalResetPassword({ usuario, alCerrar }: { usuario: UsuarioSistema; alCerrar: () => void }) {
  const resetear = useResetearPassword()
  // Arranca con una generada: no cuenta como cambio sin guardar.
  const form = useFormulario<Valores>({ password: generarPassword() }, validar)

  const guardar = async () => {
    if (!form.validarTodo()) return
    try {
      await resetear.mutateAsync({ id: usuario.id, password: form.valores.password })
      toast.exito(`Contraseña de ${usuario.nombre} reseteada. Comuníquele la temporal.`)
      alCerrar()
    } catch (error) {
      aplicarErrorFormulario(error, ['password'] as const, form.marcarError)
    }
  }

  return (
    <ModalFormulario
      abierto
      titulo={`Resetear la contraseña de ${usuario.nombre}`}
      sucio={form.sucio}
      guardando={resetear.isPending}
      textoGuardar="Resetear contraseña"
      alCerrar={alCerrar}
      alGuardar={guardar}
    >
      <div className="grid gap-4">
        <Alerta tipo="info">{usuario.nombre} deberá cambiarla en su próximo ingreso.</Alerta>
        <CampoPasswordTemporal
          valor={form.valores.password}
          error={form.errores.password}
          alCambiar={(v) => form.cambiar('password', v)}
          alSalir={() => form.tocar('password')}
        />
      </div>
    </ModalFormulario>
  )
}
