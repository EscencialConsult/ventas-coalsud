import { FileDown } from 'lucide-react'
import { mapearError } from '@/core/errores/mapearError'
import { Button } from './Button'
import { toast } from './toast'

/** Botón "Excel" (RF29): mientras arma el archivo queda en carga; si falla, avisa. */
export function BotonExcel({ alExportar, disabled = false, tam = 'md' }: { alExportar: () => Promise<void>; disabled?: boolean; tam?: 'sm' | 'md' }) {
  const exportar = async () => {
    try {
      await alExportar()
    } catch (error) {
      toast.error(`No se pudo generar el Excel: ${mapearError(error).message}`)
    }
  }
  return (
    <Button variante="secundario" tam={tam} icono={<FileDown size={tam === 'sm' ? 14 : 15} />} disabled={disabled} onClick={exportar}>
      Excel
    </Button>
  )
}
