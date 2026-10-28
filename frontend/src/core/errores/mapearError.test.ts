import { describe, expect, it } from 'vitest'
import { CODIGOS_CONTRATO } from './codigos'
import { ErrorNegocio } from './ErrorNegocio'
import { MENSAJE_DESCONOCIDO, mapearError } from './mapearError'

describe('mapearError (Contrato de API §2)', () => {
  it.each(CODIGOS_CONTRATO)('P0001 con hint %s', (codigo) => {
    const e = mapearError({ code: 'P0001', hint: codigo, message: 'Mensaje de la base.', details: '{"fecha":"2026-06-11"}' })
    expect(e).toBeInstanceOf(ErrorNegocio)
    expect(e.codigo).toBe(codigo)
    expect(e.message).toBe('Mensaje de la base.')
    expect(e.detalle).toEqual({ fecha: '2026-06-11' })
  })

  it('tolera details que no es JSON', () => {
    expect(mapearError({ code: 'P0001', hint: 'DIA_CERRADO', message: 'x', details: 'texto' }).detalle).toBeUndefined()
  })

  it.each([
    ['23505', 'DUPLICADO'],
    ['23514', 'VALIDACION'],
    ['42501', 'NO_AUTORIZADO'],
    ['PGRST301', 'SESION_VENCIDA'],
  ])('errores nativos %s → %s', (code, codigo) => {
    expect(mapearError({ code, message: 'x' }).codigo).toBe(codigo)
  })

  it('credenciales inválidas de Auth', () => {
    expect(mapearError({ name: 'AuthApiError', status: 400, message: 'Invalid login credentials' }).codigo).toBe('CREDENCIALES_INVALIDAS')
  })

  it('error de red', () => {
    expect(mapearError(new TypeError('Failed to fetch')).codigo).toBe('RED')
  })

  it('desconocido → mensaje genérico, con el original en causa', () => {
    const original = new Error('boom')
    const e = mapearError(original)
    expect(e.codigo).toBe('DESCONOCIDO')
    expect(e.esInesperado).toBe(true)
    expect(e.message).toBe(MENSAJE_DESCONOCIDO)
    expect(e.causa).toBe(original)
  })

  it('una regla de negocio no es inesperada', () => {
    expect(mapearError({ code: 'P0001', hint: 'DIA_CERRADO', message: 'x' }).esInesperado).toBe(false)
  })

  it('un ErrorNegocio pasa tal cual', () => {
    const original = new ErrorNegocio('STOCK_INSUFICIENTE', 'No alcanza.', { disponible: 20 })
    expect(mapearError(original)).toBe(original)
  })
})
