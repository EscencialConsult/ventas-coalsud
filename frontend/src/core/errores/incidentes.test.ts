import { afterEach, describe, expect, it } from 'vitest'
import { ErrorNegocio } from './ErrorNegocio'
import {
  crearIncidente, descartarIncidente, esRuido, fijarUsuarioIncidentes, reportarIncidente, suscribirIncidentes, textoIncidente,
  type Incidente,
} from './incidentes'

function incidentesActuales(): Incidente[] {
  let actuales: Incidente[] = []
  const desuscribir = suscribirIncidentes((lista) => {
    actuales = lista
  })
  desuscribir()
  return actuales
}

afterEach(() => {
  incidentesActuales().forEach((i) => descartarIncidente(i.codigo))
  fijarUsuarioIncidentes(null)
})

describe('incidentes (regla 34)', () => {
  it('ignora cancelaciones y ruido de extensiones', () => {
    expect(esRuido(new DOMException('aborted', 'AbortError'))).toBe(true)
    expect(esRuido({ name: 'CancelledError' })).toBe(true)
    expect(esRuido(new Error('ResizeObserver loop completed with undelivered notifications.'))).toBe(true)
    expect(esRuido(new Error('x'), 'chrome-extension://abc/script.js')).toBe(true)
    expect(esRuido(new Error('boom'))).toBe(false)
  })

  it('el incidente lleva código, usuario, pantalla, error y stack', () => {
    fijarUsuarioIncidentes('Vanessa <vanessa@coalsud.demo> (regional)')
    const i = crearIncidente(new TypeError('No se pudo leer total'))
    expect(i.codigo).toMatch(/^ERR-/)
    expect(i.usuario).toContain('Vanessa')
    expect(i.nombre).toBe('TypeError')
    const texto = textoIncidente(i)
    expect(texto).toContain('No se pudo leer total')
    expect(texto).toContain(`Código: ${i.codigo}`)
  })

  it('usa el error original de un ErrorNegocio inesperado', () => {
    const original = new RangeError('fuera de rango')
    const i = crearIncidente(new ErrorNegocio('DESCONOCIDO', 'genérico', undefined, original))
    expect(i.nombre).toBe('RangeError')
  })

  it('una regla de negocio sin catch no crea incidente (va a su toast)', () => {
    reportarIncidente(new ErrorNegocio('DIA_CERRADO', 'El día está cerrado.'))
    expect(incidentesActuales()).toHaveLength(0)
  })

  it('un error inesperado sí crea incidente', () => {
    reportarIncidente(new Error('boom'))
    expect(incidentesActuales()).toHaveLength(1)
  })
})
