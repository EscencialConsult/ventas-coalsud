import { useRef, useState, type ChangeEvent } from 'react'
import { FileUp, FileText, Save } from 'lucide-react'
import { aplicarErrorFormulario } from '@/core/errores/errorFormulario'
import { mapearError } from '@/core/errores/mapearError'
import type { NotaDetalle } from '@/core/models/nota-venta'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Campo'
import { Card } from '@/shared/ui/Card'
import { toast } from '@/shared/ui/toast'
import { useRegistrarFactura } from '../notas.queries'
import { MAX_PDF_BYTES, notasService } from '../notas.service'

/** Abre el PDF con su URL firmada. La pestaña se abre con el clic: después del await el navegador la bloquearía. */
async function verPdf(ruta: string) {
  const ventana = window.open('', '_blank')
  try {
    const url = await notasService.urlFactura(ruta)
    if (ventana) ventana.location.href = url
  } catch (error) {
    ventana?.close()
    const e = mapearError(error)
    if (!e.esInesperado) toast.error(e.message)
  }
}

// Factura de la nota (06-pantallas/07 §3): N° y PDF (≤ 10 MB). Se puede cargar
// aunque el día esté cerrado (⚠ SUP-06); un N° repetido se acepta con aviso (⚠ SUP-41).
export function FacturaNota({ nota, editable }: { nota: NotaDetalle; editable: boolean }) {
  const registrar = useRegistrarFactura()
  const [numero, setNumero] = useState(nota.numero_factura ?? '')
  const [pdf, setPdf] = useState<File | null>(null)
  const [errores, setErrores] = useState<{ numero_factura?: string; pdf?: string }>({})
  const archivo = useRef<HTMLInputElement>(null)
  const sinCambios = numero.trim() === (nota.numero_factura ?? '') && !pdf

  const elegir = (e: ChangeEvent<HTMLInputElement>) => {
    const elegido = e.target.files?.[0] ?? null
    e.target.value = ''
    if (!elegido) return
    if (elegido.type !== 'application/pdf') return setErrores((x) => ({ ...x, pdf: 'Tiene que ser un PDF.' }))
    if (elegido.size > MAX_PDF_BYTES) return setErrores((x) => ({ ...x, pdf: 'El PDF supera los 10 MB.' }))
    setErrores((x) => ({ ...x, pdf: undefined }))
    setPdf(elegido)
  }

  const guardar = async () => {
    if (!numero.trim()) return setErrores((x) => ({ ...x, numero_factura: 'Ingrese el N° de factura.' }))
    try {
      const r = await registrar.mutateAsync({ nota, numero, pdf })
      setPdf(null)
      toast.exito('Factura guardada')
      if (r.advertencia_duplicado) toast.info(`La factura ${r.numero_factura} ya está en otra nota.`)
    } catch (error) {
      aplicarErrorFormulario(error, ['numero_factura', 'pdf'] as const, (campo, mensaje) => setErrores((x) => ({ ...x, [campo]: mensaje })))
    }
  }

  if (!editable) {
    return (
      <Card titulo="Factura">
        <p className="font-medium">{nota.numero_factura ?? <span className="font-normal text-texto-3">Sin factura</span>}</p>
        {nota.factura_pdf_path && (
          <Button variante="secundario" tam="sm" className="mt-3" icono={<FileText size={14} />} onClick={() => verPdf(nota.factura_pdf_path ?? '')}>
            Ver PDF
          </Button>
        )}
      </Card>
    )
  }

  return (
    <Card titulo="Factura">
      <div className="grid gap-3">
        <Input
          label="N° de factura"
          placeholder="F-1465"
          maxLength={30}
          value={numero}
          error={errores.numero_factura}
          onChange={(e) => {
            setNumero(e.target.value)
            setErrores((x) => ({ ...x, numero_factura: undefined }))
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <input ref={archivo} type="file" accept="application/pdf" className="sr-only" tabIndex={-1} aria-hidden onChange={elegir} />
          <Button variante="secundario" tam="sm" icono={<FileUp size={14} />} onClick={() => archivo.current?.click()}>
            {pdf ? 'Cambiar PDF' : nota.factura_pdf_path ? 'Reemplazar PDF' : 'Adjuntar PDF'}
          </Button>
          {pdf && <span className="min-w-0 truncate text-chico text-texto-2">{pdf.name}</span>}
          {!pdf && nota.factura_pdf_path && (
            <Button variante="secundario" tam="sm" icono={<FileText size={14} />} onClick={() => verPdf(nota.factura_pdf_path ?? '')}>
              Ver PDF
            </Button>
          )}
        </div>
        {errores.pdf && <p className="text-chico text-error">{errores.pdf}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="text-chico text-texto-3">Se puede cargar aunque el día esté cerrado.</span>
          <Button tam="sm" icono={<Save size={14} />} disabled={sinCambios} cargando={registrar.isPending} onClick={guardar}>
            Guardar factura
          </Button>
        </div>
      </div>
    </Card>
  )
}
