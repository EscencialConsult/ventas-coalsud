import { describe, expect, it, vi } from 'vitest'
import { compartirPeticion } from './peticion'

describe('compartirPeticion (regla 28)', () => {
  it('dos llamadas con la misma clave en curso comparten la petición', async () => {
    const ejecutar = vi.fn(async () => 42)
    const [a, b] = await Promise.all([compartirPeticion('k', ejecutar), compartirPeticion('k', ejecutar)])
    expect(a).toBe(42)
    expect(b).toBe(42)
    expect(ejecutar).toHaveBeenCalledTimes(1)
  })

  it('no cachea: terminada la petición, la siguiente vuelve a ejecutar', async () => {
    const ejecutar = vi.fn(async () => 1)
    await compartirPeticion('k2', ejecutar)
    await compartirPeticion('k2', ejecutar)
    expect(ejecutar).toHaveBeenCalledTimes(2)
  })

  it('libera la clave también si falla', async () => {
    const falla = vi.fn(async () => {
      throw new Error('x')
    })
    await expect(compartirPeticion('k3', falla)).rejects.toThrow('x')
    await expect(compartirPeticion('k3', falla)).rejects.toThrow('x')
    expect(falla).toHaveBeenCalledTimes(2)
  })
})
