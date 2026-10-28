import { Mail, UserRound } from 'lucide-react'
import { aplicarErrorFormulario } from '@/core/errores/errorFormulario'
import type { UsuarioSistema } from '@/core/models/maestros'
import type { Rol } from '@/core/models/organizacion'
import { useFormulario, type Errores } from '@/shared/hooks/useFormulario'
import { Casilla } from '@/shared/ui/Casilla'
import { Input } from '@/shared/ui/Campo'
import { ModalFormulario } from '@/shared/ui/ModalFormulario'
import { Segmentado } from '@/shared/ui/Segmentado'
import { toast } from '@/shared/ui/toast'
import { useRegionales } from '@/features/configuracion/configuracion.queries'
import { EMAIL_VALIDO, MINIMO_PASSWORD } from '../usuarios.service'
import { useActualizarUsuario, useCrearUsuario } from '../usuarios.queries'
import { generarPassword } from '../usuarios.utils'
import { CampoPasswordTemporal } from './CampoPasswordTemporal'

interface Valores extends Record<string, unknown> {
  nombre: string
  email: string
  rol: Rol
  regionales: string[]
  password_temporal: string
}

const CAMPOS = ['nombre', 'email', 'regionales', 'password_temporal'] as const

function validar(esAlta: boolean) {
  return (v: Valores): Errores<Valores> => ({
    nombre: v.nombre.trim() ? undefined : 'Ingrese el nombre.',
    email: !esAlta ? undefined : !v.email.trim() ? 'Ingrese el correo.' : EMAIL_VALIDO.test(v.email.trim()) ? undefined : 'El correo no tiene un formato válido.',
    // CP-01.5: un regional necesita al menos una regional.
    regionales: v.rol === 'regional' && !v.regionales.length ? 'Elija al menos una regional.' : undefined,
    password_temporal: !esAlta || v.password_temporal.length >= MINIMO_PASSWORD ? undefined : `Mínimo ${MINIMO_PASSWORD} caracteres.`,
  })
}

// Alta / edición de usuario (06-pantallas/03): modal md. El correo no se edita
// después del alta; la contraseña temporal solo se pide al crear.
export function ModalUsuario({ usuario, alCerrar }: { usuario: UsuarioSistema | null; alCerrar: () => void }) {
  const esAlta = usuario === null
  const regionales = useRegionales()
  const crear = useCrearUsuario()
  const actualizar = useActualizarUsuario()
  const form = useFormulario<Valores>(
    {
      nombre: usuario?.nombre ?? '',
      email: usuario?.email ?? '',
      rol: usuario?.rol ?? 'regional',
      regionales: usuario?.regionales ?? [],
      password_temporal: esAlta ? generarPassword() : '',
    },
    validar(esAlta),
  )
  const { valores } = form

  const guardar = async () => {
    if (!form.validarTodo()) return
    const datos = { nombre: valores.nombre.trim(), rol: valores.rol, regionales: valores.rol === 'regional' ? valores.regionales : [] }
    try {
      if (esAlta) {
        await crear.mutateAsync({ ...datos, email: valores.email.trim(), password_temporal: valores.password_temporal })
        toast.exito(`Usuario ${datos.nombre} creado. Comuníquele su contraseña temporal.`)
      } else {
        await actualizar.mutateAsync({ id: usuario.id, datos })
        toast.exito('Usuario actualizado.')
      }
      alCerrar()
    } catch (error) {
      aplicarErrorFormulario(error, CAMPOS, form.marcarError)
    }
  }

  const alternarRegional = (id: string, marcada: boolean) =>
    form.cambiar('regionales', marcada ? [...valores.regionales, id] : valores.regionales.filter((r) => r !== id))

  return (
    <ModalFormulario
      abierto
      titulo={esAlta ? 'Nuevo usuario' : `Editar a ${usuario.nombre}`}
      sucio={form.sucio}
      guardando={crear.isPending || actualizar.isPending}
      textoGuardar={esAlta ? 'Crear usuario' : 'Guardar'}
      alCerrar={alCerrar}
      alGuardar={guardar}
    >
      <div className="grid gap-4">
        <Input label="Nombre" requerido icono={UserRound} autoComplete="off" {...form.texto('nombre')} />
        <Input
          label="Correo"
          requerido={esAlta}
          type="email"
          icono={Mail}
          autoComplete="off"
          disabled={!esAlta}
          ayuda={esAlta ? undefined : 'El correo no se puede cambiar.'}
          {...form.texto('email')}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-chico font-semibold text-texto-2">
            Rol <span className="text-rojo">*</span>
          </span>
          <Segmentado
            etiqueta="Rol"
            valor={valores.rol}
            alCambiar={(rol) => form.cambiar('rol', rol)}
            opciones={[
              { valor: 'regional', etiqueta: 'Regional' },
              { valor: 'nacional', etiqueta: 'Nacional' },
            ]}
          />
          <p className="text-chico text-texto-3">
            {valores.rol === 'nacional' ? 'Ve las tres regionales; administra usuarios, catálogo y configuración.' : 'Opera (vende, cobra, cierra el día) en las regionales que se le asignen.'}
          </p>
        </div>

        {valores.rol === 'regional' && (
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-chico font-semibold text-texto-2">
              Regionales <span className="text-rojo">*</span>
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {regionales.data
                ?.filter((r) => r.activo || valores.regionales.includes(r.id))
                .map((r) => (
                  <Casilla key={r.id} marcada={valores.regionales.includes(r.id)} alCambiar={(m) => alternarRegional(r.id, m)}>
                    <span className="font-medium">{r.nombre}</span> <span className="text-chico text-texto-3">{r.codigo}</span>
                  </Casilla>
                ))}
            </div>
            {form.errores.regionales && <p className="text-chico text-error">{form.errores.regionales}</p>}
          </fieldset>
        )}

        {esAlta && (
          <CampoPasswordTemporal
            valor={valores.password_temporal}
            error={form.errores.password_temporal}
            alCambiar={(v) => form.cambiar('password_temporal', v)}
            alSalir={() => form.tocar('password_temporal')}
          />
        )}
      </div>
    </ModalFormulario>
  )
}
