import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

function promesaControlada() {
  let resolver: () => void = () => {}
  const promesa = new Promise<void>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

describe('Button (regla 33)', () => {
  it('queda en loading mientras la promesa del onClick está en curso y evita el doble envío', async () => {
    const { promesa, resolver } = promesaControlada()
    const alClic = vi.fn(() => promesa)
    render(<Button onClick={alClic}>Cerrar el día</Button>)
    const boton = screen.getByRole('button', { name: 'Cerrar el día' })

    await userEvent.click(boton)
    expect(boton).toBeDisabled()
    expect(boton).toHaveAttribute('aria-busy', 'true')

    await userEvent.click(boton)
    expect(alClic).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolver()
      await promesa
    })
    expect(boton).toBeEnabled()
    expect(boton).not.toHaveAttribute('aria-busy')
  })

  it('un onClick síncrono no activa el loading', async () => {
    render(<Button onClick={() => undefined}>Guardar</Button>)
    const boton = screen.getByRole('button', { name: 'Guardar' })
    await userEvent.click(boton)
    expect(boton).toBeEnabled()
  })

  it('cargando controlado desde afuera', () => {
    render(<Button cargando>Guardar</Button>)
    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveAttribute('aria-busy', 'true')
  })
})
