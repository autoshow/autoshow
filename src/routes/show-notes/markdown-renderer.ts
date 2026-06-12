const MARKDOWN_OPTIONS = {
  tables: true,
  strikethrough: true,
  tasklists: true,
  autolinks: true,
  tagFilter: true,
  noHtmlBlocks: true,
  noHtmlSpans: true,
} satisfies Bun.MarkdownParserOptions

const SAFE_ABSOLUTE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const decodeEscapedText = (value: string): string => {
  return value.replace(/&(amp|lt|gt|quot|#39);/g, (entity) => {
    switch (entity) {
      case '&amp;':
        return '&'
      case '&lt;':
        return '<'
      case '&gt;':
        return '>'
      case '&quot;':
        return '"'
      case '&#39;':
        return "'"
      default:
        return entity
    }
  })
}

const escapeCodeContent = (value: string): string => escapeHtml(decodeEscapedText(value))

const escapeAttribute = (value: string): string => escapeHtml(value)

const normalizeMarkdownHref = (href: string): string => {
  const trimmed = href.trim()

  if (/^www\./i.test(trimmed)) {
    return `http://${trimmed}`
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return `mailto:${trimmed}`
  }

  return trimmed
}

const isSafeMarkdownUrl = (href: string): boolean => {
  const normalized = normalizeMarkdownHref(href)
  if (normalized.length === 0) return false
  if (/[\u0000-\u001F\u007F]/.test(normalized)) return false
  if (normalized.startsWith('//') || normalized.startsWith('\\')) return false

  const protocolMatch = normalized.match(/^([a-zA-Z][a-zA-Z\d+.-]*):/)
  if (protocolMatch) {
    return SAFE_ABSOLUTE_PROTOCOLS.has(`${protocolMatch[1]!.toLowerCase()}:`)
  }

  return true
}

const safeHref = (href: string): string | null => {
  const normalized = normalizeMarkdownHref(href)
  return isSafeMarkdownUrl(normalized) ? normalized : null
}

const headingLevel = (level: unknown): 1 | 2 | 3 | 4 | 5 | 6 => {
  return typeof level === 'number' && Number.isInteger(level) && level >= 1 && level <= 6
    ? level as 1 | 2 | 3 | 4 | 5 | 6
    : 2
}

const alignAttribute = (align: unknown): string => {
  return align === 'left' || align === 'center' || align === 'right'
    ? ` align="${align}"`
    : ''
}

const renderedInlineToPlainText = (value: string): string => {
  return value.replace(/<\/?(?:strong|em|del|code)>/g, '')
}

export const renderMarkdownToHtml = (source: string): string => {
  return Bun.markdown.render(
    source,
    {
      text: (children) => escapeHtml(children),
      html: (children) => escapeHtml(children),
      paragraph: (children) => children.trim().length > 0 ? `<p>${children}</p>\n` : '',
      heading: (children, meta) => {
        const level = headingLevel(meta?.level)
        return `<h${level}>${children}</h${level}>\n`
      },
      blockquote: (children) => `<blockquote>${children}</blockquote>\n`,
      code: (children, meta) => {
        const language = typeof meta?.language === 'string' && meta.language.length > 0
          ? ` class="language-${escapeAttribute(meta.language)}"`
          : ''
        return `<pre><code${language}>${escapeCodeContent(children)}</code></pre>\n`
      },
      list: (children, meta) => {
        const ordered = meta?.ordered === true
        const tag = ordered ? 'ol' : 'ul'
        const start = ordered && typeof meta?.start === 'number' && Number.isFinite(meta.start) && meta.start !== 1
          ? ` start="${escapeAttribute(String(meta.start))}"`
          : ''
        return `<${tag}${start}>\n${children}</${tag}>\n`
      },
      listItem: (children, meta) => {
        const taskCheckbox = typeof meta?.checked === 'boolean'
          ? `<input type="checkbox" disabled${meta.checked ? ' checked' : ''}> `
          : ''
        return `<li>${taskCheckbox}${children}</li>\n`
      },
      hr: () => '<hr>\n',
      table: (children) => `<table>\n${children}</table>\n`,
      thead: (children) => `<thead>\n${children}</thead>\n`,
      tbody: (children) => `<tbody>\n${children}</tbody>\n`,
      tr: (children) => `<tr>${children}</tr>\n`,
      th: (children, meta) => `<th${alignAttribute(meta?.align)}>${children}</th>`,
      td: (children, meta) => `<td${alignAttribute(meta?.align)}>${children}</td>`,
      strong: (children) => `<strong>${children}</strong>`,
      emphasis: (children) => `<em>${children}</em>`,
      strikethrough: (children) => `<del>${children}</del>`,
      codespan: (children) => `<code>${escapeCodeContent(children)}</code>`,
      link: (children, meta) => {
        const href = safeHref(meta?.href ?? '')
        if (!href) return renderedInlineToPlainText(children)

        const title = typeof meta?.title === 'string' && meta.title.length > 0
          ? ` title="${escapeAttribute(meta.title)}"`
          : ''

        return `<a href="${escapeAttribute(href)}"${title} target="_blank" rel="noopener noreferrer">${children}</a>`
      },
      image: () => '',
    },
    MARKDOWN_OPTIONS,
  )
}
