const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const asPositiveNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  return undefined
}

const formatYtDlpDateOnly = (value: unknown): string | undefined => {
  if (typeof value !== "string" || !/^\d{8}$/.test(value)) {
    return undefined
  }

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

export const normalizeYtDlpPublishDate = (data: Record<string, unknown>): string | undefined => {
  const timestamp = asPositiveNumber(data["timestamp"]) ?? asPositiveNumber(data["release_timestamp"])
  if (timestamp !== undefined) {
    return new Date(timestamp * 1000).toISOString()
  }

  return formatYtDlpDateOnly(data["upload_date"])
}

export const formatSourcePublishDate = (value: string | null | undefined): string => {
  if (!value) return "N/A"

  const dateOnlyMatch = DATE_ONLY_PATTERN.exec(value)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    if (Number.isNaN(date.getTime())) {
      return value
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
