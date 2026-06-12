import { inflateRawSync } from 'node:zlib'
import type { SupportedDocumentType } from '~/types'

type OfficeDocumentType = Extract<SupportedDocumentType, 'pptx' | 'xlsx'>

type ZipEntry = {
  name: string
  flags: number
  compressionMethod: number
  compressedSize: number
  uncompressedSize: number
  localHeaderOffset: number
}

type ZipArchive = {
  bytes: Uint8Array
  entries: Map<string, ZipEntry>
}

export type OfficeDocumentExtractionResult = {
  markdown: string
  pageCount: number
}

const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50
const MAX_ZIP_COMMENT_BYTES = 0xffff
const MAX_XML_ENTRY_BYTES = 25 * 1024 * 1024
const MAX_TOTAL_XML_BYTES = 75 * 1024 * 1024
const textDecoder = new TextDecoder('utf-8')

const readUInt16 = (view: DataView, offset: number): number => {
  if (offset < 0 || offset + 2 > view.byteLength) {
    throw new Error('Malformed OOXML ZIP: unexpected end of file')
  }
  return view.getUint16(offset, true)
}

const readUInt32 = (view: DataView, offset: number): number => {
  if (offset < 0 || offset + 4 > view.byteLength) {
    throw new Error('Malformed OOXML ZIP: unexpected end of file')
  }
  return view.getUint32(offset, true)
}

const toUint8Array = (input: ArrayBuffer | Uint8Array): Uint8Array => {
  return input instanceof Uint8Array ? input : new Uint8Array(input)
}

const normalizeZipPath = (path: string): string => {
  return path.replace(/\\/g, '/').replace(/^\/+/, '')
}

const findEndOfCentralDirectory = (bytes: Uint8Array, view: DataView): number => {
  const minimumOffset = Math.max(0, bytes.length - 22 - MAX_ZIP_COMMENT_BYTES)
  for (let offset = bytes.length - 22; offset >= minimumOffset; offset--) {
    if (readUInt32(view, offset) === EOCD_SIGNATURE) {
      return offset
    }
  }

  throw new Error('Malformed OOXML ZIP: missing central directory')
}

const parseZipArchive = (input: ArrayBuffer | Uint8Array): ZipArchive => {
  const bytes = toUint8Array(input)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const eocdOffset = findEndOfCentralDirectory(bytes, view)
  const diskNumber = readUInt16(view, eocdOffset + 4)
  const centralDirectoryDisk = readUInt16(view, eocdOffset + 6)
  const entriesOnDisk = readUInt16(view, eocdOffset + 8)
  const entryCount = readUInt16(view, eocdOffset + 10)
  const centralDirectorySize = readUInt32(view, eocdOffset + 12)
  const centralDirectoryOffset = readUInt32(view, eocdOffset + 16)

  if (
    diskNumber !== 0 ||
    centralDirectoryDisk !== 0 ||
    entriesOnDisk !== entryCount ||
    entryCount === 0xffff ||
    centralDirectorySize === 0xffffffff ||
    centralDirectoryOffset === 0xffffffff
  ) {
    throw new Error('Unsupported OOXML ZIP: multi-disk or ZIP64 archives are not supported')
  }

  if (centralDirectoryOffset + centralDirectorySize > bytes.length) {
    throw new Error('Malformed OOXML ZIP: central directory exceeds file size')
  }

  const entries = new Map<string, ZipEntry>()
  let offset = centralDirectoryOffset

  for (let i = 0; i < entryCount; i++) {
    if (readUInt32(view, offset) !== CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error('Malformed OOXML ZIP: invalid central directory entry')
    }

    const flags = readUInt16(view, offset + 8)
    const compressionMethod = readUInt16(view, offset + 10)
    const compressedSize = readUInt32(view, offset + 20)
    const uncompressedSize = readUInt32(view, offset + 24)
    const fileNameLength = readUInt16(view, offset + 28)
    const extraFieldLength = readUInt16(view, offset + 30)
    const commentLength = readUInt16(view, offset + 32)
    const localHeaderOffset = readUInt32(view, offset + 42)
    const nameStart = offset + 46
    const nameEnd = nameStart + fileNameLength

    if (nameEnd > bytes.length) {
      throw new Error('Malformed OOXML ZIP: entry name exceeds file size')
    }

    if ((flags & 0x1) !== 0 || (flags & 0x40) !== 0) {
      throw new Error('Unsupported OOXML ZIP: encrypted entries are not supported')
    }

    if (compressionMethod !== 0 && compressionMethod !== 8) {
      throw new Error(`Unsupported OOXML ZIP: compression method ${compressionMethod} is not supported`)
    }

    const name = normalizeZipPath(textDecoder.decode(bytes.subarray(nameStart, nameEnd)))
    if (name.length > 0 && !name.endsWith('/')) {
      entries.set(name, {
        name,
        flags,
        compressionMethod,
        compressedSize,
        uncompressedSize,
        localHeaderOffset
      })
    }

    offset = nameEnd + extraFieldLength + commentLength
  }

  return { bytes, entries }
}

const readZipEntry = (archive: ZipArchive, entry: ZipEntry, maxBytes: number): Uint8Array => {
  if (entry.uncompressedSize > maxBytes) {
    throw new Error(`OOXML XML entry ${entry.name} exceeds the ${maxBytes} byte limit`)
  }

  const view = new DataView(archive.bytes.buffer, archive.bytes.byteOffset, archive.bytes.byteLength)
  const localOffset = entry.localHeaderOffset
  if (readUInt32(view, localOffset) !== LOCAL_FILE_HEADER_SIGNATURE) {
    throw new Error(`Malformed OOXML ZIP: missing local header for ${entry.name}`)
  }

  const localFileNameLength = readUInt16(view, localOffset + 26)
  const localExtraFieldLength = readUInt16(view, localOffset + 28)
  const dataStart = localOffset + 30 + localFileNameLength + localExtraFieldLength
  const dataEnd = dataStart + entry.compressedSize
  if (dataStart < 0 || dataEnd > archive.bytes.length) {
    throw new Error(`Malformed OOXML ZIP: entry ${entry.name} exceeds file size`)
  }

  const compressed = archive.bytes.subarray(dataStart, dataEnd)
  const decompressed = entry.compressionMethod === 0
    ? compressed
    : inflateRawSync(compressed, { maxOutputLength: maxBytes + 1 } as never)

  if (decompressed.length > maxBytes) {
    throw new Error(`OOXML XML entry ${entry.name} exceeds the ${maxBytes} byte limit`)
  }

  if (entry.uncompressedSize !== 0 && decompressed.length !== entry.uncompressedSize) {
    throw new Error(`Malformed OOXML ZIP: entry ${entry.name} size mismatch`)
  }

  return decompressed instanceof Uint8Array ? decompressed : new Uint8Array(decompressed)
}

const readZipText = (archive: ZipArchive, path: string, totalBytes: { value: number }): string => {
  const entry = archive.entries.get(path)
  if (!entry) {
    throw new Error(`Malformed OOXML: missing ${path}`)
  }

  const bytes = readZipEntry(archive, entry, MAX_XML_ENTRY_BYTES)
  totalBytes.value += bytes.length
  if (totalBytes.value > MAX_TOTAL_XML_BYTES) {
    throw new Error(`OOXML XML content exceeds the ${MAX_TOTAL_XML_BYTES} byte limit`)
  }

  return textDecoder.decode(bytes)
}

const tryReadZipText = (archive: ZipArchive, path: string, totalBytes: { value: number }): string | null => {
  return archive.entries.has(path) ? readZipText(archive, path, totalBytes) : null
}

const decodeXmlEntities = (value: string): string => {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity: string) => {
    const normalized = entity.toLowerCase()
    if (normalized === 'amp') return '&'
    if (normalized === 'lt') return '<'
    if (normalized === 'gt') return '>'
    if (normalized === 'quot') return '"'
    if (normalized === 'apos') return "'"
    if (normalized.startsWith('#x')) {
      const codePoint = Number.parseInt(normalized.slice(2), 16)
      return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : ''
    }
    if (normalized.startsWith('#')) {
      const codePoint = Number.parseInt(normalized.slice(1), 10)
      return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : ''
    }
    return ''
  })
}

const normalizeTextFragment = (value: string): string => {
  return decodeXmlEntities(value)
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
}

const normalizeText = (value: string): string => {
  return normalizeTextFragment(value)
    .trim()
}

const tagPattern = (localName: string): string => `(?:[A-Za-z_][\\w.-]*:)?${localName}`

const getElementBlocks = (xml: string, localName: string): string[] => {
  const tag = tagPattern(localName)
  const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g')
  const blocks: string[] = []
  let match: RegExpExecArray | null

  while ((match = pattern.exec(xml)) !== null) {
    blocks.push(match[1] ?? '')
  }

  return blocks
}

const getSelfClosingOrBlockAttributes = (xml: string, localName: string): string[] => {
  const tag = tagPattern(localName)
  const pattern = new RegExp(`<${tag}\\b([^>]*?)(?:\\/>|>[\\s\\S]*?<\\/${tag}>)`, 'g')
  const attributes: string[] = []
  let match: RegExpExecArray | null

  while ((match = pattern.exec(xml)) !== null) {
    attributes.push(match[1] ?? '')
  }

  return attributes
}

const getTextNodes = (xml: string): string[] => {
  return getElementBlocks(xml, 't')
    .map(normalizeTextFragment)
    .filter(value => value.trim().length > 0)
}

const getFirstElementText = (xml: string, localName: string): string | null => {
  const value = getElementBlocks(xml, localName)[0]
  return value === undefined ? null : normalizeText(value)
}

const parseAttributes = (rawAttributes: string): Record<string, string> => {
  const attributes: Record<string, string> = {}
  const pattern = /([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(rawAttributes)) !== null) {
    const key = match[1] ?? ''
    const value = match[2] ?? match[3] ?? ''
    attributes[key] = decodeXmlEntities(value)
  }

  return attributes
}

const getAttribute = (attributes: Record<string, string>, localName: string): string | undefined => {
  return Object.entries(attributes).find(([key]) => key === localName || key.endsWith(`:${localName}`))?.[1]
}

const sortOoxmlPartPaths = (prefix: string, suffix: string) => (left: string, right: string): number => {
  const numberFromPath = (path: string) => {
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = path.match(new RegExp(`^${escapedPrefix}(\\d+)${escapedSuffix}$`))
    return match?.[1] ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER
  }

  const leftNumber = numberFromPath(left)
  const rightNumber = numberFromPath(right)
  return leftNumber === rightNumber ? left.localeCompare(right) : leftNumber - rightNumber
}

const extractPptxMarkdown = (archive: ZipArchive): OfficeDocumentExtractionResult => {
  const slidePaths = [...archive.entries.keys()]
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort(sortOoxmlPartPaths('ppt/slides/slide', '.xml'))

  if (slidePaths.length === 0) {
    throw new Error('Malformed PPTX: missing slides')
  }

  const totalBytes = { value: 0 }
  const sections = slidePaths.map((path, index) => {
    const xml = readZipText(archive, path, totalBytes)
    const paragraphs = getElementBlocks(xml, 'p')
      .map(paragraph => normalizeText(getTextNodes(paragraph).join('')))
      .filter(value => value.length > 0)
    const slideText = paragraphs.length > 0
      ? paragraphs.join('\n\n')
      : getTextNodes(xml).join('\n\n')

    return [`## Slide ${index + 1}`, slideText].filter(Boolean).join('\n\n')
  })

  return {
    markdown: sections.join('\n\n').trim(),
    pageCount: slidePaths.length
  }
}

const resolveRelationshipTarget = (baseDir: string, target: string): string => {
  const normalizedTarget = target.replace(/\\/g, '/')
  const parts = normalizedTarget.startsWith('/')
    ? normalizedTarget.split('/')
    : `${baseDir}/${normalizedTarget}`.split('/')
  const resolved: string[] = []

  for (const part of parts) {
    if (!part || part === '.') continue
    if (part === '..') {
      resolved.pop()
      continue
    }
    resolved.push(part)
  }

  return resolved.join('/')
}

const parseWorkbookRelationships = (xml: string): Map<string, string> => {
  const relationships = new Map<string, string>()
  for (const rawAttributes of getSelfClosingOrBlockAttributes(xml, 'Relationship')) {
    const attributes = parseAttributes(rawAttributes)
    const id = getAttribute(attributes, 'Id')
    const target = getAttribute(attributes, 'Target')
    if (id && target) {
      relationships.set(id, resolveRelationshipTarget('xl', target))
    }
  }
  return relationships
}

const parseWorkbookSheets = (
  archive: ZipArchive,
  workbookXml: string,
  totalBytes: { value: number }
): Array<{ name: string, path: string }> => {
  const relationshipsXml = tryReadZipText(archive, 'xl/_rels/workbook.xml.rels', totalBytes)
  const relationships = relationshipsXml ? parseWorkbookRelationships(relationshipsXml) : new Map<string, string>()
  const sheets = getSelfClosingOrBlockAttributes(workbookXml, 'sheet').flatMap((rawAttributes, index) => {
    const attributes = parseAttributes(rawAttributes)
    const name = getAttribute(attributes, 'name') || `Sheet ${index + 1}`
    const relationshipId = getAttribute(attributes, 'id')
    const sheetId = getAttribute(attributes, 'sheetId')
    const relationshipPath = relationshipId ? relationships.get(relationshipId) : undefined
    const fallbackPath = sheetId ? `xl/worksheets/sheet${sheetId}.xml` : `xl/worksheets/sheet${index + 1}.xml`
    const path = relationshipPath ?? fallbackPath

    return archive.entries.has(path) ? [{ name, path }] : []
  })

  if (sheets.length > 0) {
    return sheets
  }

  return [...archive.entries.keys()]
    .filter(name => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
    .sort(sortOoxmlPartPaths('xl/worksheets/sheet', '.xml'))
    .map((path, index) => ({ name: `Sheet ${index + 1}`, path }))
}

const columnNameToIndex = (columnName: string): number => {
  let index = 0
  for (const character of columnName.toUpperCase()) {
    index = index * 26 + character.charCodeAt(0) - 64
  }
  return index
}

const columnIndexToName = (index: number): string => {
  let remaining = index
  let name = ''

  while (remaining > 0) {
    const mod = (remaining - 1) % 26
    name = String.fromCharCode(65 + mod) + name
    remaining = Math.floor((remaining - 1) / 26)
  }

  return name || 'A'
}

const getCellPosition = (cellRef: string | undefined, rowIndex: number, fallbackColumn: number): { row: number, column: number } => {
  const match = cellRef?.match(/^([A-Za-z]+)(\d+)$/)
  if (!match) {
    return { row: rowIndex, column: fallbackColumn }
  }

  return {
    row: Number.parseInt(match[2] ?? `${rowIndex}`, 10),
    column: columnNameToIndex(match[1] ?? 'A')
  }
}

const getCellValue = (cellXml: string, attributes: Record<string, string>, sharedStrings: string[]): string => {
  const cellType = getAttribute(attributes, 't')

  if (cellType === 'inlineStr') {
    return normalizeText(getTextNodes(cellXml).join(''))
  }

  const rawValue = getFirstElementText(cellXml, 'v')
  if (rawValue !== null) {
    if (cellType === 's') {
      const sharedStringIndex = Number.parseInt(rawValue, 10)
      return Number.isInteger(sharedStringIndex) ? sharedStrings[sharedStringIndex] ?? '' : ''
    }

    if (cellType === 'b') {
      return rawValue === '1' ? 'TRUE' : rawValue === '0' ? 'FALSE' : rawValue
    }

    return rawValue
  }

  return normalizeText(getTextNodes(cellXml).join(''))
}

const escapeMarkdownCell = (value: string): string => {
  return value.replace(/\r\n?/g, '\n').replace(/\n+/g, '<br>').replace(/\|/g, '\\|').trim()
}

const sheetRowsToMarkdown = (rows: Map<number, Map<number, string>>): string => {
  if (rows.size === 0) return ''

  const rowNumbers = [...rows.keys()].sort((left, right) => left - right)
  const usedColumns = [...rows.values()].flatMap(row => [...row.keys()])
  const minColumn = Math.min(...usedColumns)
  const maxColumn = Math.max(...usedColumns)
  const headers = Array.from({ length: maxColumn - minColumn + 1 }, (_, index) => columnIndexToName(minColumn + index))
  const bodyRows = rowNumbers.map(rowNumber => {
    const row = rows.get(rowNumber)!
    return headers.map((_, index) => escapeMarkdownCell(row.get(minColumn + index) ?? ''))
  })

  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...bodyRows.map(row => `| ${row.join(' | ')} |`)
  ].join('\n')
}

const parseWorksheetRows = (xml: string, sharedStrings: string[]): Map<number, Map<number, string>> => {
  const rows = new Map<number, Map<number, string>>()
  const rowTag = tagPattern('row')
  const cellTag = tagPattern('c')
  const rowPattern = new RegExp(`<${rowTag}\\b([^>]*)>([\\s\\S]*?)<\\/${rowTag}>`, 'g')
  let rowMatch: RegExpExecArray | null
  let fallbackRowIndex = 1

  while ((rowMatch = rowPattern.exec(xml)) !== null) {
    const rowAttributes = parseAttributes(rowMatch[1] ?? '')
    const rowIndex = Number.parseInt(getAttribute(rowAttributes, 'r') ?? `${fallbackRowIndex}`, 10)
    const rowCells = new Map<number, string>()
    const cellPattern = new RegExp(`<${cellTag}\\b([^>]*)>([\\s\\S]*?)<\\/${cellTag}>`, 'g')
    let cellMatch: RegExpExecArray | null
    let fallbackColumnIndex = 1

    while ((cellMatch = cellPattern.exec(rowMatch[2] ?? '')) !== null) {
      const cellAttributes = parseAttributes(cellMatch[1] ?? '')
      const position = getCellPosition(getAttribute(cellAttributes, 'r'), rowIndex, fallbackColumnIndex)
      const value = getCellValue(cellMatch[2] ?? '', cellAttributes, sharedStrings)
      if (value.length > 0) {
        rowCells.set(position.column, value)
      }
      fallbackColumnIndex = position.column + 1
    }

    if (rowCells.size > 0) {
      rows.set(rowIndex, rowCells)
    }
    fallbackRowIndex = rowIndex + 1
  }

  return rows
}

const extractSharedStrings = (archive: ZipArchive, totalBytes: { value: number }): string[] => {
  const xml = tryReadZipText(archive, 'xl/sharedStrings.xml', totalBytes)
  if (!xml) return []

  return getElementBlocks(xml, 'si')
    .map(sharedString => normalizeText(getTextNodes(sharedString).join('')))
}

const extractXlsxMarkdown = (archive: ZipArchive): OfficeDocumentExtractionResult => {
  const totalBytes = { value: 0 }
  const workbookXml = tryReadZipText(archive, 'xl/workbook.xml', totalBytes)
  const sheets = workbookXml
    ? parseWorkbookSheets(archive, workbookXml, totalBytes)
    : parseWorkbookSheets(archive, '', totalBytes)

  if (sheets.length === 0) {
    throw new Error('Malformed XLSX: missing worksheets')
  }

  const sharedStrings = extractSharedStrings(archive, totalBytes)
  const sections = sheets.map(sheet => {
    const worksheetXml = readZipText(archive, sheet.path, totalBytes)
    const table = sheetRowsToMarkdown(parseWorksheetRows(worksheetXml, sharedStrings))
    return [`## Sheet: ${sheet.name}`, table].filter(Boolean).join('\n\n')
  })

  return {
    markdown: sections.join('\n\n').trim(),
    pageCount: sheets.length
  }
}

export const extractOfficeDocumentToMarkdown = (
  input: ArrayBuffer | Uint8Array,
  documentType: OfficeDocumentType
): OfficeDocumentExtractionResult => {
  const archive = parseZipArchive(input)

  if (documentType === 'pptx') {
    return extractPptxMarkdown(archive)
  }

  return extractXlsxMarkdown(archive)
}
