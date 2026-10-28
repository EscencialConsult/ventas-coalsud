import { Timer } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { ChipIcono } from '@/shared/ui/ChipIcono'
import { Modal } from '@/shared/ui/Modal'

// Aviso un minuto antes del cierre por inactividad (06-pantallas/01 §3).
export function AvisoInactividad({ segundos, alSeguir, alSalir }: { segundos: number | null; alSeguir: () => void; alSalir: () => void }) {
  return (
    <Modal
      abierto={segundos !== null}
      titulo="¿Sigue ahí?"
      alCerrar={alSeguir}
      pie={
        <>
          <Button variante="secundario" onClick={alSalir}>
            Salir ahora
          </Button>
          <Button onClick={alSeguir}>Seguir conectado</Button>
        </>
      }
    >
      <div className="flex items-center gap-3 text-cuerpo">
        <ChipIcono icono={Timer} tono="alerta" />
        <p>
          Su sesión se cerrará en <b className="tabular-nums">{segundos ?? 0}</b> segundos por inactividad.
        </p>
      </div>
    </Modal>
  )
}
