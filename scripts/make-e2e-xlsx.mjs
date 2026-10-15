// Genera e2e/fixtures/compras-ejemplo.xlsx: un estado de cuenta minimo y
// sintetico (sin datos reales) para la prueba E2E de importacion.
// Uso: node scripts/make-e2e-xlsx.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { strToU8, zipSync } from 'fflate'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const rows = [
  ['Fecha', 'Descripción', 'Compras'],
  ['04 Oct 2026', 'UBER *TRIP 8005928996 CA', '$ 89.97'],
  ['03 Oct 2026', 'OXXO NENEN SUR CCO 8605231N4', '$ 44.50'],
  ['02 Oct 2026', 'Comision anual', '-$ 120.00'],
]

const shared = rows.flat().filter((value) => typeof value === 'string')
const sharedIndex = new Map(shared.map((value, index) => [value, index]))

function cell(ref, value) {
  const index = sharedIndex.get(value)
  return `<c r="${ref}" t="s"><v>${index}</v></c>`
}

const columns = ['A', 'B', 'C']
const sheetRows = rows
  .map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) =>
      cell(`${columns[columnIndex]}${rowIndex + 1}`, value),
    )
    return `<row r="${rowIndex + 1}">${cells.join('')}</row>`
  })
  .join('')

const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:C${rows.length}"/><sheetData>${sheetRows}</sheetData></worksheet>`

const sharedStrings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${shared.length}" uniqueCount="${shared.length}">${shared.map((value) => `<si><t>${value}</t></si>`).join('')}</sst>`

const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Movimientos" sheetId="1" r:id="rId1"/></sheets></workbook>`

const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`

const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`

const zip = zipSync({
  '[Content_Types].xml': strToU8(contentTypes),
  '_rels/.rels': strToU8(rootRels),
  'xl/workbook.xml': strToU8(workbook),
  'xl/_rels/workbook.xml.rels': strToU8(workbookRels),
  'xl/worksheets/sheet1.xml': strToU8(sheet),
  'xl/sharedStrings.xml': strToU8(sharedStrings),
})

mkdirSync(resolve(root, 'e2e/fixtures'), { recursive: true })
const target = resolve(root, 'e2e/fixtures/compras-ejemplo.xlsx')
writeFileSync(target, zip)
console.log(`Listo: ${target}`)
