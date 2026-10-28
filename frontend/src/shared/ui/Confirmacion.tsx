import { useState } from 'react'
import { Button } from './Button'
import { Textarea } from './Campo'
import { Modal } from './Modal'

interface Props {
  abierto: boolean
  titulo: string
  /** Lo que va a pasar, en el idioma del negocio ("Se repondrá el stock de 3 productos…"). */
  consecuencias: string[]
  textoConfirmar: string
  peligro?: boolean
  campoMotivo?: 'opcional' | 'obligatorio'
  cargando?: boolean
  alConfirmar: (motivo: string) => void
  alCancelar: () => void
}

// Para acciones irreversibles: anular, cerrar, devolver, reabrir, desactivar
// (04-Sistema_de_Diseno §4). El botón dice qué hace; nunca "Aceptar".
export function Confirmacion({ abierto, titulo, consecuencias, textoConfirmar, peligro = false, campoMotivo, cargando = false, alConfirmar, alCancelar }: Props) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string>()

  const confirmar = () => {
    if (campoMotivo === 'obligatorio' && !motivo.trim()) {
      setError('El motivo es obligatorio.')
      return
    }
    alConfirmar(motivo.trim())
  }

  const cancelar = () => {
    setMotivo('')
    setError(undefined)
    alCancelar()
  }

  return (
    <Modal
      abierto={abierto}
      titulo={titulo}
      alCerrar={cancelar}
      bloqueado={cargando}
      pie={
        <>
          <Button variante="secundario" onClick={cancelar} disabled={cargando}>
            Cancelar
          </Button>
          <Button variante={peligro ? 'peligro' : 'primario'} onClick={confirmar} cargando={cargando}>
            {textoConfirmar}
          </Button>
        </>
      }
    >
      <ul className="mb-4 list-disc space-y-1.5 pl-5 text-cuerpo text-texto-2">
        {consecuencias.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      {campoMotivo && (
        <Textarea
          label={campoMotivo === 'obligatorio' ? 'Motivo' : 'Motivo (opcional)'}
          requerido={campoMotivo === 'obligatorio'}
          value={motivo}
          error={error}
          onChange={(e) => {
            setMotivo(e.target.value)
            setError(undefined)
          }}
        />
      )}
    </Modal>
  )
}
