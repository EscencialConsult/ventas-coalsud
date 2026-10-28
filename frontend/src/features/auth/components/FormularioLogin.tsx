import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, LockKeyhole, LogIn, Mail } from 'lucide-react'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Campo'

interface Props {
  /** Lanza el error si el ingreso falla; la página lo muestra. */
  alIngresar: (email: string, password: string) => Promise<void>
  alErrorValidacion: (mensaje: string) => void
}

export function FormularioLogin({ alIngresar, alErrorValidacion }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (enviando) return
    if (!email.trim() || !password) {
      alErrorValidacion('Ingrese su correo y su contraseña.')
      return
    }
    setEnviando(true)
    try {
      await alIngresar(email, password)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <Input label="Correo" type="email" autoComplete="username" icono={Mail} placeholder="usuario@coalsud.bo" value={email} onChange={(e) => setEmail(e.target.value)} requerido />
      <Input
        label="Contraseña"
        type={verPassword ? 'text' : 'password'}
        autoComplete="current-password"
        icono={LockKeyhole}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        requerido
        sufijo={
          <BotonIcono etiqueta={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} variante="interno" onClick={() => setVerPassword((v) => !v)}>
            {verPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </BotonIcono>
        }
      />
      <Button type="submit" tam="lg" className="mt-2 w-full" cargando={enviando} icono={<LogIn size={16} />}>
        Ingresar
      </Button>
    </form>
  )
}
