import { useMemo, useState } from 'react'
import { KeyRound, Pause, Pencil, Play, Plus, UsersRound } from 'lucide-react'
import type { UsuarioSistema } from '@/core/models/maestros'
import { useFiltrosUrl } from '@/shared/hooks/useFiltrosUrl'
import { Badge } from '@/shared/ui/Badge'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { Button } from '@/shared/ui/Button'
import { CampoBusqueda } from '@/shared/ui/CampoBusqueda'
import { Card } from '@/shared/ui/Card'
import { Confirmacion } from '@/shared/ui/Confirmacion'
import { DosLineas } from '@/shared/ui/DosLineas'
import { EstadoBadge } from '@/shared/ui/EstadoBadge'
import { EmptyState } from '@/shared/ui/Estados'
import { BarraFiltros, FiltroSelect } from '@/shared/ui/FiltroSelect'
import { Pagina } from '@/shared/ui/Pagina'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { toast } from '@/shared/ui/toast'
import { useRegionales } from '@/features/configuracion/configuracion.queries'
import { ModalResetPassword } from './components/ModalResetPassword'
import { ModalUsuario } from './components/ModalUsuario'
import { useCambiarActivoUsuario, useUsuarios } from './usuarios.queries'

const FILTROS = { q: '', rol: '', estado: 'activos' }

type Dialogo = { tipo: 'alta' } | { tipo: 'editar' | 'password' | 'estado'; usuario: UsuarioSistema } | null

function coincide(u: UsuarioSistema, f: typeof FILTROS): boolean {
  const q = f.q.toLowerCase()
  if (q && !u.nombre.toLowerCase().includes(q) && !u.email.includes(q)) return false
  if (f.rol && u.rol !== f.rol) return false
  if (f.estado === 'activos' && !u.activo) return false
  if (f.estado === 'inactivos' && u.activo) return false
  return true
}

// Usuarios (06-pantallas/03, CU-01) · solo nacional.
export default function UsuariosPage() {
  const consulta = useUsuarios()
  const regionales = useRegionales()
  const cambiarActivo = useCambiarActivoUsuario()
  const [filtros, cambiarFiltros] = useFiltrosUrl(FILTROS)
  const [dialogo, setDialogo] = useState<Dialogo>(null)

  const codigos = useMemo(() => new Map(regionales.data?.map((r) => [r.id, r.codigo])), [regionales.data])

  const columnas: Columna<UsuarioSistema>[] = [
    { clave: 'nombre', titulo: 'Usuario', principalMovil: true, render: (u) => <DosLineas principal={<span className="font-medium">{u.nombre}</span>} secundario={u.email} /> },
    { clave: 'rol', titulo: 'Rol', render: (u) => <Badge variante={u.rol === 'nacional' ? 'marca' : 'info'}>{u.rol === 'nacional' ? 'Nacional' : 'Regional'}</Badge> },
    {
      clave: 'regionales',
      titulo: 'Regionales',
      render: (u) => (u.rol === 'nacional' ? <span className="text-texto-3">Todas</span> : u.regionales.map((id) => codigos.get(id) ?? '—').join(' · ')),
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      render: (u) => (
        <span className="inline-flex flex-wrap justify-end gap-1">
          <EstadoBadge estado={u.activo ? 'activo' : 'inactivo'} />
          {u.activo && u.debe_cambiar_password && <Badge variante="alerta">Contraseña temporal</Badge>}
        </span>
      ),
    },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      acciones: true,
      render: (u) => (
        <span className="inline-flex gap-0.5">
          <BotonIcono etiqueta={`Editar a ${u.nombre}`} onClick={() => setDialogo({ tipo: 'editar', usuario: u })}>
            <Pencil size={15} />
          </BotonIcono>
          <BotonIcono etiqueta={`Resetear la contraseña de ${u.nombre}`} disabled={!u.activo} onClick={() => setDialogo({ tipo: 'password', usuario: u })}>
            <KeyRound size={15} />
          </BotonIcono>
          <BotonIcono etiqueta={u.activo ? `Desactivar a ${u.nombre}` : `Reactivar a ${u.nombre}`} onClick={() => setDialogo({ tipo: 'estado', usuario: u })}>
            {u.activo ? <Pause size={15} /> : <Play size={15} />}
          </BotonIcono>
        </span>
      ),
    },
  ]

  const usuarioEstado = dialogo?.tipo === 'estado' ? dialogo.usuario : null

  return (
    <Pagina
      titulo="Usuarios"
      subtitulo="Accesos al sistema y regionales de cada usuario"
      acciones={
        <Button icono={<Plus size={16} />} onClick={() => setDialogo({ tipo: 'alta' })}>
          Nuevo usuario
        </Button>
      }
    >
      <Card sinPadding>
        <BarraFiltros>
          <CampoBusqueda etiqueta="Buscar usuarios" placeholder="Buscar nombre o correo…" valor={filtros.q} alCambiar={(q) => cambiarFiltros({ q }, { reemplazar: true })} />
          <FiltroSelect
            etiqueta="Rol"
            valor={filtros.rol}
            alCambiar={(rol) => cambiarFiltros({ rol })}
            opciones={[
              { valor: '', etiqueta: 'Todos los roles' },
              { valor: 'nacional', etiqueta: 'Nacional' },
              { valor: 'regional', etiqueta: 'Regional' },
            ]}
          />
          <FiltroSelect
            etiqueta="Estado"
            valor={filtros.estado}
            alCambiar={(estado) => cambiarFiltros({ estado })}
            opciones={[
              { valor: 'activos', etiqueta: 'Activos' },
              { valor: 'inactivos', etiqueta: 'Inactivos' },
              { valor: 'todos', etiqueta: 'Todos' },
            ]}
          />
        </BarraFiltros>
        <SeccionConsulta consulta={consulta}>
          {(usuarios) => (
            <Tabla
              etiqueta="Usuarios"
              columnas={columnas}
              filas={usuarios.filter((u) => coincide(u, filtros))}
              claveFila={(u) => u.id}
              filaApagada={(u) => !u.activo}
              vacio={<EmptyState icono={UsersRound} titulo="No hay usuarios con esos filtros" />}
            />
          )}
        </SeccionConsulta>
      </Card>

      {(dialogo?.tipo === 'alta' || dialogo?.tipo === 'editar') && <ModalUsuario usuario={dialogo.tipo === 'editar' ? dialogo.usuario : null} alCerrar={() => setDialogo(null)} />}
      {dialogo?.tipo === 'password' && <ModalResetPassword usuario={dialogo.usuario} alCerrar={() => setDialogo(null)} />}
      <Confirmacion
        abierto={usuarioEstado !== null}
        titulo={usuarioEstado?.activo ? `¿Desactivar a ${usuarioEstado.nombre}?` : `¿Reactivar a ${usuarioEstado?.nombre ?? ''}?`}
        consecuencias={
          usuarioEstado?.activo
            ? ['No podrá ingresar al sistema.', 'Se cerrarán sus sesiones abiertas.']
            : ['Podrá volver a ingresar con su contraseña actual.']
        }
        textoConfirmar={usuarioEstado?.activo ? 'Desactivar usuario' : 'Reactivar usuario'}
        peligro={usuarioEstado?.activo}
        cargando={cambiarActivo.isPending}
        alCancelar={() => setDialogo(null)}
        alConfirmar={() => {
          if (!usuarioEstado) return
          cambiarActivo.mutate(
            { id: usuarioEstado.id, activo: !usuarioEstado.activo },
            {
              onSuccess: (u) => {
                toast.exito(u.activo ? `${u.nombre} reactivado.` : `${u.nombre} desactivado.`)
                setDialogo(null)
              },
              // ULTIMO_NACIONAL u otro rechazo: el toast global lo muestra; se cierra la confirmación.
              onError: () => setDialogo(null),
            },
          )
        }}
      />
    </Pagina>
  )
}
