import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, KeyRound, LockKeyhole } from 'lucide-react'
import { useSesion } from '@/core/auth/useSesion'
import { procesarError } from '@/core/errores/procesarError'
import { Button, BotonEnlace } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Campo'
import { Alerta } from '@/shared/ui/Estados'
import { toast } from '@/shared/ui/toast'
import { EncabezadoAuth, LayoutAuth } from './components/LayoutAuth'

const MINIMO = 8

// Cambio de contraseña (06-pantallas/01 §2, RF41). Si debe_cambiar_password,
// es la única ruta navegable (CP-02.6).
export default function CambiarPasswordPage() {
  const { perfil, cambiarPassword, salir } = useSesion()
  const navigate = useNavigate()
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [errores, setErrores] = useState<{ nueva?: string; repetida?: string; general?: string }>({})
  const [enviando, setEnviando] = useState(false)
  const obligatorio = perfil?.debe_cambiar_password ?? false

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const nuevosErrores: typeof errores = {}
    if (nueva.length < MINIMO) nuevosErrores.nueva = `Mínimo ${MINIMO} caracteres.`
    if (repetida !== nueva) nuevosErrores.repetida = 'Las contraseñas no coinciden.'
    setErrores(nuevosErrores)
    if (Object.keys(nuevosErrores).length) return

    setEnviando(true)
    try {
      await cambiarPassword(nueva)
      toast.exito('Contraseña actualizada.')
      navigate('/', { replace: true })
    } catch (err) {
      const error = procesarError(err)
      setErrores(error.codigo === 'VALIDACION' ? { nueva: error.message } : { general: error.message })
      setEnviando(false)
    }
  }

  return (
    <LayoutAuth>
      <section className="rounded-card border border-borde bg-white p-6 shadow-card sm:p-8">
        <EncabezadoAuth
          icono={<KeyRound size={20} className="text-rojo" aria-hidden />}
          titulo={obligatorio ? 'Cambie su contraseña' : 'Cambiar contraseña'}
          subtitulo={obligatorio ? 'Está usando una contraseña temporal. Elija una nueva para continuar.' : perfil?.email}
        />

        {errores.general && (
          <Alerta tipo="error" className="mb-4">
            {errores.general}
          </Alerta>
        )}

        <form onSubmit={enviar} className="space-y-4" noValidate>
          <Input
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            icono={LockKeyhole}
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            error={errores.nueva}
            ayuda={`Mínimo ${MINIMO} caracteres.`}
            requerido
          />
          <Input
            label="Repetir contraseña"
            type="password"
            autoComplete="new-password"
            icono={LockKeyhole}
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            error={errores.repetida}
            requerido
          />
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            {obligatorio ? (
              <Button variante="secundario" onClick={() => salir()}>
                Salir
              </Button>
            ) : (
              <BotonEnlace a="/" variante="secundario" icono={<ArrowLeft size={15} />}>
                Volver
              </BotonEnlace>
            )}
            <Button type="submit" cargando={enviando}>
              {obligatorio ? 'Guardar y continuar' : 'Guardar'}
            </Button>
          </div>
        </form>
      </section>
    </LayoutAuth>
  )
}
