export type LogColors = {
  timestamp: string
  message: string
  path: string
  value: string
  jsonKey: string
  jsonValue: string
  error: string
  success: string
  stepTitle: string
}

export type LogEntry = {
  timestamp: number
  text: string
}
