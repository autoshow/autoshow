export {}

declare global {
  namespace Bun {
    type MarkdownAutolinkOptions = boolean | {
      url?: boolean
      www?: boolean
      email?: boolean
    }

    type MarkdownHeadingOptions = boolean | {
      ids?: boolean
      anchors?: boolean
    }

    type MarkdownParserOptions = {
      tables?: boolean
      strikethrough?: boolean
      tasklists?: boolean
      autolinks?: MarkdownAutolinkOptions
      headings?: MarkdownHeadingOptions
      hardSoftBreaks?: boolean
      wikiLinks?: boolean
      underline?: boolean
      latexMath?: boolean
      collapseWhitespace?: boolean
      permissiveAtxHeaders?: boolean
      noIndentedCodeBlocks?: boolean
      noHtmlBlocks?: boolean
      noHtmlSpans?: boolean
      tagFilter?: boolean
    }

    type MarkdownHeadingMeta = { level: number; id?: string }
    type MarkdownCodeMeta = { language?: string }
    type MarkdownListMeta = { ordered: boolean; start?: number; depth: number }
    type MarkdownListItemMeta = MarkdownListMeta & { index: number; checked?: boolean }
    type MarkdownTableCellMeta = { align?: 'left' | 'center' | 'right' }
    type MarkdownLinkMeta = { href: string; title?: string }
    type MarkdownImageMeta = { src: string; title?: string }

    type MarkdownRenderCallbacks = {
      heading?: (children: string, meta?: MarkdownHeadingMeta) => string | null | undefined
      paragraph?: (children: string) => string | null | undefined
      blockquote?: (children: string) => string | null | undefined
      code?: (children: string, meta?: MarkdownCodeMeta) => string | null | undefined
      list?: (children: string, meta?: MarkdownListMeta) => string | null | undefined
      listItem?: (children: string, meta?: MarkdownListItemMeta) => string | null | undefined
      hr?: () => string | null | undefined
      table?: (children: string) => string | null | undefined
      thead?: (children: string) => string | null | undefined
      tbody?: (children: string) => string | null | undefined
      tr?: (children: string) => string | null | undefined
      th?: (children: string, meta?: MarkdownTableCellMeta) => string | null | undefined
      td?: (children: string, meta?: MarkdownTableCellMeta) => string | null | undefined
      html?: (children: string) => string | null | undefined
      strong?: (children: string) => string | null | undefined
      emphasis?: (children: string) => string | null | undefined
      link?: (children: string, meta?: MarkdownLinkMeta) => string | null | undefined
      image?: (children: string, meta?: MarkdownImageMeta) => string | null | undefined
      codespan?: (children: string) => string | null | undefined
      strikethrough?: (children: string) => string | null | undefined
      text?: (children: string) => string | null | undefined
    }

    const markdown: {
      html(markdown: string, options?: MarkdownParserOptions): string
      render(markdown: string, callbacks?: MarkdownRenderCallbacks, options?: MarkdownParserOptions): string
    }
  }
}
