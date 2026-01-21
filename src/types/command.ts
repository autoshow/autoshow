import * as v from 'valibot'

export const CommandResultSchema = v.object({
  stdout: v.string(),
  stderr: v.string(),
  exitCode: v.number()
})

export type CommandResult = v.InferOutput<typeof CommandResultSchema>
