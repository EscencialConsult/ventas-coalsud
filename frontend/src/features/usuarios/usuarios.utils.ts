// Contraseña temporal legible (sin 0/O ni 1/l/I para dictarla sin confusiones).
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

export function generarPassword(largo = 10): string {
  const azar = crypto.getRandomValues(new Uint32Array(largo))
  return Array.from(azar, (n) => ALFABETO[n % ALFABETO.length]).join('')
}
