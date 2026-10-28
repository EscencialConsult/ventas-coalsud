import { describe, expect, it } from 'vitest'
import type { Perfil } from '@/core/models/organizacion'
import { REGIONALES } from '@/fixtures/organizacion'
import { puede, type Accion } from './permisos'

const [LP, CBBA, SCZ] = REGIONALES

const perfil = (rol: Perfil['rol'], regionales = REGIONALES, activo = true): Perfil => ({
  id: 'u', nombre: 'U', email: 'u@x', rol, activo, debe_cambiar_password: false, regionales,
})

const nacional = perfil('nacional')
const vanessa = perfil('regional', [LP, CBBA])
const fernando = perfil('regional', [SCZ])

const SOLO_NACIONAL: Accion[] = ['usuarios.administrar', 'catalogo.editar', 'configuracion.editar', 'cartera.cargar', 'eecc.ver', 'auditoria.ver', 'liquidacion.reabrir']
const TRANSACCIONALES: Accion[] = ['inventario.operar', 'nota.emitir', 'nota.anular', 'nota.factura', 'nota.devolver', 'cobranza.registrar', 'cobranza.anular', 'liquidacion.cerrar', 'clientes.editar', 'vendedores.editar']

describe('permisos (Seguridad RLS §11)', () => {
  it.each(SOLO_NACIONAL)('%s: solo el nacional', (accion) => {
    expect(puede(accion, nacional, null)).toBe(true)
    expect(puede(accion, nacional, LP.id)).toBe(true)
    expect(puede(accion, vanessa, LP.id)).toBe(false)
  })

  it.each(TRANSACCIONALES)('%s: el regional en sus regionales; el nacional nunca (⚠ SUP-31)', (accion) => {
    expect(puede(accion, vanessa, LP.id)).toBe(true)
    expect(puede(accion, vanessa, CBBA.id)).toBe(true)
    expect(puede(accion, vanessa, SCZ.id)).toBe(false)
    expect(puede(accion, fernando, SCZ.id)).toBe(true)
    expect(puede(accion, nacional, LP.id)).toBe(false)
    expect(puede(accion, nacional, null)).toBe(false)
  })

  it('el regional necesita una regional concreta para escribir', () => {
    expect(puede('nota.emitir', vanessa, null)).toBe(false)
  })

  it('presupuesto: ambos roles (⚠ SUP-33)', () => {
    expect(puede('presupuesto.editar', nacional, null)).toBe(true)
    expect(puede('presupuesto.editar', fernando, SCZ.id)).toBe(true)
    expect(puede('presupuesto.editar', fernando, LP.id)).toBe(false)
  })

  it('un usuario inactivo no puede nada', () => {
    expect(puede('nota.emitir', perfil('regional', [LP], false), LP.id)).toBe(false)
    expect(puede('eecc.ver', perfil('nacional', REGIONALES, false), null)).toBe(false)
  })

  it('sin sesión no puede nada', () => {
    expect(puede('eecc.ver', null, null)).toBe(false)
  })
})
