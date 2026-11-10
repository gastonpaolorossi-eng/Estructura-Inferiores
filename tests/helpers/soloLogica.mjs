// Normaliza código fuente para comparar solo su lógica entre versiones.
// Borra lo que el rediseño visual cambia a propósito (imports, colores, fuentes,
// clases, formato de fechas para mostrar y la constante del escudo) y deja intactos
// consultas, permisos, estados, cálculos y guardados.

// Cualquier token de color, con o sin valor de respaldo, y cualquier hex.
const COLOR = /var\(--[\w-]+(?:,\s*(?:[^()]|\([^()]*\))*)?\)|#[\da-fA-F]{3,8}\b/g

export function soloLogica(texto) {
  return texto
    .replaceAll('\r', '')
    .replace(/^import .*\n/gm, '')
    .replace(/^const ESCUDO(?:_CLUB)?_URL =\s*\n?\s*'[^']*'\n/gm, '')
    .replaceAll('ESCUDO_CLUB_URL', 'ESCUDO_URL')
    .replace(/fontFamily: 'var\(--fuente-titulo\)', fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase'/g, 'fontFamily: «titulo»')
    .replace(/fontFamily: "'Archivo Black', sans-serif"/g, 'fontFamily: «titulo»')
    .replace(COLOR, '«color»')
    .replace(/className="[^"]*"/g, 'className=«»')
    .replace(/fechaHora\(([^(),]+), [^(),]+\)/g, '$1')
    .replace(/fecha(?:Corta|Larga)\(([^()]+)\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
}
