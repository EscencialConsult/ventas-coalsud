// Total en letras para la nota impresa (⚠ SUP-01): "Son: Seiscientos veintiuno 00/100 Bolivianos".
// Solo para mostrar: el importe lo calcula la base.

const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']
const DIEZ_A_VEINTINUEVE = [
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
  'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete',
  'veintiocho', 'veintinueve',
]
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
const CENTENAS = [
  '', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos',
  'ochocientos', 'novecientos',
]

function hasta99(n: number): string {
  if (n < 10) return UNIDADES[n]
  if (n < 30) return DIEZ_A_VEINTINUEVE[n - 10]
  const u = n % 10
  return DECENAS[Math.floor(n / 10)] + (u ? ` y ${UNIDADES[u]}` : '')
}

function hasta999(n: number): string {
  if (n === 100) return 'cien'
  return [CENTENAS[Math.floor(n / 100)], hasta99(n % 100)].filter(Boolean).join(' ')
}

// "veintiuno mil" → "veintiún mil", "ciento uno millones" → "ciento un millones"
function apocopar(texto: string): string {
  return texto.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un')
}

function hasta999999(n: number): string {
  const miles = Math.floor(n / 1000)
  const resto = n % 1000
  const parteMiles = miles === 0 ? '' : miles === 1 ? 'mil' : `${apocopar(hasta999(miles))} mil`
  return [parteMiles, hasta999(resto)].filter(Boolean).join(' ')
}

export function enteroALetras(n: number): string {
  if (n === 0) return 'cero'
  const millones = Math.floor(n / 1_000_000)
  const resto = n % 1_000_000
  const parteMillones =
    millones === 0 ? '' : millones === 1 ? 'un millón' : `${apocopar(hasta999999(millones))} millones`
  return [parteMillones, hasta999999(resto)].filter(Boolean).join(' ')
}

export function numeroALetras(importe: number): string {
  const totalCentavos = Math.round(Math.abs(importe) * 100)
  const entero = Math.floor(totalCentavos / 100)
  const centavos = String(totalCentavos % 100).padStart(2, '0')
  const letras = enteroALetras(entero)
  return `${letras.charAt(0).toUpperCase()}${letras.slice(1)} ${centavos}/100 Bolivianos`
}
