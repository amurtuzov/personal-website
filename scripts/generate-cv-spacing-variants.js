#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const zlib = require('node:zlib')

const sourcePdfPath = path.join(__dirname, '../apps/main/public/docs/Anar-Murtuzov-CV-v3.pdf')
const outputDir = path.dirname(sourcePdfPath)
const yAnchor = 795.5508
const pageHeight = 841.89
const yMin = 8

const variants = [
  {
    key: 'balanced',
    yScale: 1.028,
    title: 'Anar Murtuzov - CV v4 (Balanced)',
    subject: 'v4 layout with slightly increased line-height',
  },
  {
    key: 'relaxed',
    yScale: 1.04,
    title: 'Anar Murtuzov - CV v4 (Relaxed)',
    subject: 'v4 layout with relaxed vertical rhythm',
  },
  {
    key: 'roomy',
    yScale: 1.052,
    title: 'Anar Murtuzov - CV v4 (Roomy)',
    subject: 'v4 layout with noticeably roomier spacing',
  },
  {
    key: 'airy',
    yScale: 1.06,
    title: 'Anar Murtuzov - CV v4 (Airy)',
    subject: 'v4 layout with maximum spacing while staying one-page',
  },
]

function readContentStream(pdfBuffer) {
  const objectMarker = Buffer.from('5 0 obj')
  const streamStartMarker = Buffer.from('stream\n')
  const streamEndMarker = Buffer.from('\nendstream')

  const objectIndex = pdfBuffer.indexOf(objectMarker)
  if (objectIndex === -1) {
    throw new Error('Could not find object 5 in source PDF.')
  }

  const streamMarkerIndex = pdfBuffer.indexOf(streamStartMarker, objectIndex)
  if (streamMarkerIndex === -1) {
    throw new Error('Could not find content stream start in source PDF.')
  }

  const streamDataStart = streamMarkerIndex + streamStartMarker.length
  const streamDataEnd = pdfBuffer.indexOf(streamEndMarker, streamDataStart)
  if (streamDataEnd === -1) {
    throw new Error('Could not find content stream end in source PDF.')
  }

  const compressed = pdfBuffer.subarray(streamDataStart, streamDataEnd)
  return zlib.inflateSync(compressed).toString('utf8')
}

function scaleY(y, factor) {
  const scaled = yAnchor - (yAnchor - y) * factor
  return Math.max(yMin, scaled)
}

function formatNumber(value) {
  return Number(value.toFixed(4)).toString()
}

function transformContent(content, factor) {
  let output = content

  output = output.replace(
    /(1 0 0 1\s+)(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)(\s+Tm)/g,
    (_full, prefix, x, y, suffix) => `${prefix}${x} ${formatNumber(scaleY(Number(y), factor))}${suffix}`,
  )

  // Path operators (`m`/`l`) sit in the inverse Y space in this PDF stream.
  // Convert to top-oriented Y, apply the same vertical scaling, convert back.
  output = output.replace(
    /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)(\s+[ml])/g,
    (_full, x, y, suffix) => {
      const pathY = Number(y)
      const topY = pageHeight - pathY
      const scaledTopY = scaleY(topY, factor)
      const scaledPathY = pageHeight - scaledTopY
      return `${x} ${formatNumber(scaledPathY)}${suffix}`
    },
  )

  return output
}

function escapePdfString(value) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function buildPdf(contentStream, metadata) {
  const compressedStream = zlib.deflateSync(Buffer.from(contentStream, 'utf8'))
  const now = new Date()
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const hh = String(now.getUTCHours()).padStart(2, '0')
  const mi = String(now.getUTCMinutes()).padStart(2, '0')
  const ss = String(now.getUTCSeconds()).padStart(2, '0')
  const creationDate = `D:${yyyy}${mm}${dd}${hh}${mi}${ss}Z`
  const fileId = crypto.createHash('md5').update(contentStream).digest('hex')

  const objects = {
    1: '<< /Type /Pages /Count 1 /Kids [7 0 R] >>',
    2: '<< /Dests << /Names [ ] >> >>',
    3: '<< /Type /Catalog /Pages 1 0 R /Names 2 0 R >>',
    4: '<< >>',
    5: Buffer.concat([
      Buffer.from(`<< /Length ${compressedStream.length}\n/Filter /FlateDecode >>\nstream\n`, 'ascii'),
      compressedStream,
      Buffer.from('\nendstream', 'ascii'),
    ]),
    6: '<< /ProcSet [/PDF /Text /ImageB /ImageC /ImageI] /Font << /F2 8 0 R /F1 9 0 R >> /ColorSpace << >> >>',
    7: '<< /Type /Page /Parent 1 0 R /MediaBox [0 0 595.28 841.89] /Contents 5 0 R /Resources 6 0 R >>',
    8: '<< /Type /Font /BaseFont /Helvetica-Bold /Subtype /Type1 /Encoding /WinAnsiEncoding >>',
    9: '<< /Type /Font /BaseFont /Helvetica /Subtype /Type1 /Encoding /WinAnsiEncoding >>',
    10: '<< /Producer 11 0 R /Creator 12 0 R /CreationDate 13 0 R /Title 14 0 R /Author 15 0 R /Subject 16 0 R >>',
    11: '(PDFKit)',
    12: '(Codex CV Variant Generator)',
    13: `(${escapePdfString(creationDate)})`,
    14: `(${escapePdfString(metadata.title)})`,
    15: '(Anar Murtuzov)',
    16: `(${escapePdfString(metadata.subject)})`,
  }

  const parts = [Buffer.from('%PDF-1.3\n', 'ascii')]
  const offsets = new Array(17).fill(0)
  let cursor = parts[0].length

  for (let id = 1; id <= 16; id += 1) {
    offsets[id] = cursor

    const header = Buffer.from(`${id} 0 obj\n`, 'ascii')
    parts.push(header)
    cursor += header.length

    const body = Buffer.isBuffer(objects[id]) ? objects[id] : Buffer.from(`${objects[id]}\n`, 'ascii')
    parts.push(body)
    cursor += body.length

    const footer = Buffer.from('\nendobj\n', 'ascii')
    parts.push(footer)
    cursor += footer.length
  }

  const xrefOffset = cursor
  const xrefLines = ['xref', '0 17', '0000000000 65535 f ']
  for (let id = 1; id <= 16; id += 1) {
    xrefLines.push(`${String(offsets[id]).padStart(10, '0')} 00000 n `)
  }
  const xref = Buffer.from(`${xrefLines.join('\n')}\n`, 'ascii')
  parts.push(xref)
  cursor += xref.length

  const trailer = Buffer.from(
    `trailer\n<< /Size 17 /Root 3 0 R /Info 10 0 R /ID [<${fileId}> <${fileId}>] >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
    'ascii',
  )
  parts.push(trailer)
  cursor += trailer.length

  return Buffer.concat(parts, cursor)
}

function run() {
  if (!fs.existsSync(sourcePdfPath)) {
    throw new Error(`Source PDF not found: ${sourcePdfPath}`)
  }

  const sourceBuffer = fs.readFileSync(sourcePdfPath)
  const sourceContent = readContentStream(sourceBuffer)

  const writtenFiles = []
  for (const variant of variants) {
    const transformed = transformContent(sourceContent, variant.yScale)
    const outputBuffer = buildPdf(transformed, variant)
    const fileName = `Anar-Murtuzov-CV-v4-${variant.key}.pdf`
    const outputPath = path.join(outputDir, fileName)
    fs.writeFileSync(outputPath, outputBuffer)
    writtenFiles.push({ outputPath, yScale: variant.yScale })
  }

  process.stdout.write('Generated CV variants:\n')
  for (const item of writtenFiles) {
    process.stdout.write(`- ${item.outputPath} (yScale=${item.yScale})\n`)
  }
}

run()
