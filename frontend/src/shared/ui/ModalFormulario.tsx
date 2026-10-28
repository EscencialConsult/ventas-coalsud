import { useId, useState, type ReactNode } from 'react'
import { Button } from './Button'
import { Confirmacion } from './Confirmacion'
import { Modal } from './Modal'

interface Props {
  abierto: boolean
  titulo: ReactNode
  tam?: 'md' | 'lg' | 'xl'
  /** Hay cambios sin guardar: al cerrar se pregunta "¿Descartar los cambios?". */
  sucio: boolean
  guardando: boolean
  textoGuardar?: string
  alCerrar: () => void
  alGuardar: () => void
  children: ReactNode
}

// Formulario en modal (06-pantallas/00 §3): Enter envía, "Guardar" muestra el
// loading y no se puede cerrar mientras guarda; si hay cambios, cerrar pide
// confirmación para no perderlos.
export function ModalFormulario({ abierto, titulo, tam = 'md', sucio, guardando, textoGuardar = 'Guardar', alCerrar, alGuardar, children }: Props) {
  const idFormulario = useId()
  const [confirmando, setConfirmando] = useState(false)

  const intentarCerrar = () => {
    if (guardando) return
    if (sucio) setConfirmando(true)
    else alCerrar()
  }

  return (
    <>
      <Modal
        abierto={abierto}
        titulo={titulo}
        tam={tam}
        alCerrar={intentarCerrar}
        bloqueado={guardando || confirmando}
        pie={
          <>
            <Button variante="secundario" onClick={intentarCerrar} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" form={idFormulario} cargando={guardando}>
              {textoGuardar}
            </Button>
          </>
        }
      >
        <form
          id={idFormulario}
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            if (!guardando) alGuardar()
          }}
        >
          {children}
        </form>
      </Modal>
      <Confirmacion
        abierto={confirmando}
        titulo="¿Descartar los cambios?"
        consecuencias={['Los datos que cargó en este formulario no se guardarán.']}
        textoConfirmar="Descartar"
        peligro
        alConfirmar={() => {
          setConfirmando(false)
          alCerrar()
        }}
        alCancelar={() => setConfirmando(false)}
      />
    </>
  )
}
