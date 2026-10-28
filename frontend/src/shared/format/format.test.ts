import { describe, expect, it } from 'vitest'
import { formatoBs, formatoMontoEntero, formatoPct } from './moneda'
import { formatoCantidad } from './cantidad'
import { formatoFecha, formatoFechaHora, formatoPeriodo, hoyBolivia, sumarDias } from './fecha'
import { numeroALetras } from './numeroALetras'

describe('formatoBs', () => {
  it('usa coma de miles y punto decimal (⚠ SUP-39)', () => {
    expect(formatoBs(1234.5)).toBe('Bs 1,234.50')
    expect(formatoBs(4300)).toBe('Bs 4,300.00')
    expect(formatoBs(0)).toBe('Bs 0.00')
    expect(formatoBs(-0)).toBe('Bs 0.00')
    expect(formatoBs(-120)).toBe('Bs -120.00')
  })
  it('entero para resúmenes', () => {
    expect(formatoMontoEntero(198420.4)).toBe('198,420')
    expect(formatoMontoEntero(1224.6)).toBe('1,225')
    expect(formatoMontoEntero(-0.2)).toBe('0')
  })
  it('porcentaje', () => {
    expect(formatoPct(82.4)).toBe('82 %')
    expect(formatoPct(null)).toBe('—')
  })
})

describe('formatoCantidad', () => {
  it('enteros sin decimales, fracciones con dos', () => {
    expect(formatoCantidad(12)).toBe('12')
    expect(formatoCantidad(1500)).toBe('1,500')
    expect(formatoCantidad(12.5)).toBe('12.50')
  })
})

describe('fechas', () => {
  it('formatea sin corrimiento de zona', () => {
    expect(formatoFecha('2026-06-11')).toBe('11/06/2026')
    expect(formatoFecha(null)).toBe('—')
  })
  it('instante en hora de Bolivia (UTC−4)', () => {
    expect(formatoFechaHora('2026-06-12T01:14:00Z')).toBe('11/06/2026 21:14')
  })
  it('hoy en Bolivia aunque en UTC ya sea mañana', () => {
    expect(hoyBolivia(new Date('2026-06-12T02:00:00Z'))).toBe('2026-06-11')
  })
  it('sumarDias cruza meses', () => {
    expect(sumarDias('2026-06-30', 1)).toBe('2026-07-01')
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('período', () => {
    expect(formatoPeriodo('2026-10')).toBe('Octubre 2026')
  })
})

describe('numeroALetras', () => {
  it.each([
    [0, 'Cero 00/100 Bolivianos'],
    [1, 'Uno 00/100 Bolivianos'],
    [15, 'Quince 00/100 Bolivianos'],
    [21, 'Veintiuno 00/100 Bolivianos'],
    [31, 'Treinta y uno 00/100 Bolivianos'],
    [100, 'Cien 00/100 Bolivianos'],
    [101, 'Ciento uno 00/100 Bolivianos'],
    [621, 'Seiscientos veintiuno 00/100 Bolivianos'],
    [621.5, 'Seiscientos veintiuno 50/100 Bolivianos'],
    [1000, 'Mil 00/100 Bolivianos'],
    [1001, 'Mil uno 00/100 Bolivianos'],
    [1224.6, 'Mil doscientos veinticuatro 60/100 Bolivianos'],
    [4300, 'Cuatro mil trescientos 00/100 Bolivianos'],
    [21000, 'Veintiún mil 00/100 Bolivianos'],
    [101000, 'Ciento un mil 00/100 Bolivianos'],
    [1_000_000, 'Un millón 00/100 Bolivianos'],
    [2_500_000, 'Dos millones quinientos mil 00/100 Bolivianos'],
  ])('%d → %s', (importe, esperado) => {
    expect(numeroALetras(importe)).toBe(esperado)
  })
})
