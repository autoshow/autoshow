export type OutputBlock = string | readonly string[]

type OptionalOutputBlock = OutputBlock | null | undefined | false

export interface BoxTableRow {
  left: string
  right: string
  notes?: readonly string[]
}

export interface TwoColumnBoxTableOptions {
  header: string
  rows: readonly BoxTableRow[]
  emptyMessage: string
  totalRight: string
  leftHeader?: string
  rightHeader?: string
  maxLeftWidth?: number
  notePrefix?: string
}

function normalizeBlock(block: OutputBlock): string {
  return typeof block === "string" ? block : block.join("\n")
}

function coerceBlock(block: OptionalOutputBlock): string | null {
  if (!block) {
    return null
  }

  const text = normalizeBlock(block)
  return text.length > 0 ? text : ""
}

export function joinOutputBlocks(
  blocks: readonly OptionalOutputBlock[],
  separator = "\n\n"
): string {
  const textBlocks = blocks
    .map(coerceBlock)
    .filter((block): block is string => block !== null)

  return textBlocks.join(separator)
}

export function renderLines(lines: readonly string[]): string {
  return lines.join("\n")
}

export function writeStdout(block: OutputBlock): void {
  console.log(normalizeBlock(block))
}

export function writeStderr(block: OutputBlock): void {
  console.error(normalizeBlock(block))
}

export function wrapText(
  text: string,
  width: number,
  initialIndent = "",
  continuationIndent = initialIndent
): string[] {
  if (width <= 0) {
    return [text]
  }

  const lines: string[] = []
  let remaining = text.trim()
  let indent = initialIndent

  while (remaining.length > 0) {
    const availableWidth = Math.max(1, width - indent.length)
    if (remaining.length <= availableWidth) {
      lines.push(indent + remaining)
      break
    }

    const splitAt = remaining.lastIndexOf(" ", availableWidth)
    const chunkEnd = splitAt > 0 ? splitAt : availableWidth
    lines.push(indent + remaining.slice(0, chunkEnd).trimEnd())
    remaining = remaining.slice(chunkEnd).trimStart()
    indent = continuationIndent
  }

  return lines.length > 0 ? lines : [initialIndent.trimEnd()]
}

export function renderTwoColumnBoxTable(options: TwoColumnBoxTableOptions): string {
  const {
    header,
    rows,
    emptyMessage,
    totalRight,
    leftHeader = "Test",
    rightHeader = "USD",
    maxLeftWidth = 72,
    notePrefix = "  ! ",
  } = options

  const count = rows.length
  const leftValues = rows.map((row) => row.left)
  const rightValues = rows.map((row) => row.right)
  const baseLeftWidth = Math.min(
    maxLeftWidth,
    Math.max(leftHeader.length, "TOTAL".length, ...leftValues.map((value) => value.length))
  )
  const rightWidth = Math.max(
    rightHeader.length,
    totalRight.length,
    ...rightValues.map((value) => value.length)
  )

  const dataInnerWidth = baseLeftWidth + rightWidth + 5
  const minInnerWidth = header.length + 2
  const innerWidth = Math.max(dataInnerWidth, minInnerWidth)
  const leftWidth = baseLeftWidth + (innerWidth - dataInnerWidth)

  const topBorder = `┌${"─".repeat(innerWidth)}┐`
  const columnSeparator = `├${"─".repeat(leftWidth + 2)}┬${"─".repeat(rightWidth + 2)}┤`
  const rowSeparator = `├${"─".repeat(leftWidth + 2)}┼${"─".repeat(rightWidth + 2)}┤`
  const bottomBorder = `└${"─".repeat(leftWidth + 2)}┴${"─".repeat(rightWidth + 2)}┘`

  const dataRow = (left: string, right: string) =>
    `│ ${left.padEnd(leftWidth)} │ ${right.padEnd(rightWidth)} │`
  const fullWidthRow = (text: string) => `│ ${text.padEnd(innerWidth - 1)}│`

  const lines = [
    topBorder,
    fullWidthRow(header),
    columnSeparator,
    dataRow(leftHeader, rightHeader),
    rowSeparator,
  ]

  if (count === 0) {
    lines.push(fullWidthRow(emptyMessage))
  }

  for (const row of rows) {
    const left =
      row.left.length > leftWidth ? `${row.left.slice(0, leftWidth - 1)}…` : row.left
    lines.push(dataRow(left, row.right))

    for (const note of row.notes ?? []) {
      for (const line of wrapText(note, innerWidth - 1, notePrefix, " ".repeat(notePrefix.length))) {
        lines.push(fullWidthRow(line))
      }
    }
  }

  lines.push(rowSeparator)
  lines.push(dataRow("TOTAL", totalRight))
  lines.push(bottomBorder)

  return lines.join("\n")
}
