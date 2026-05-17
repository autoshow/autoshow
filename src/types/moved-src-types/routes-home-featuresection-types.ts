export type SourceRoutesHomeFeatureSectionCard = {
  title: string
  description: string
}

export type SourceRoutesHomeFeatureSectionProps = {
  title: string
  accent: string
  subtitle?: string | undefined
  cards: SourceRoutesHomeFeatureSectionCard[]
  altBg?: boolean | undefined
  columns?: 2 | 3 | 4 | undefined
  class?: string | undefined
}
