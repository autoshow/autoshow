import * as v from 'valibot'

export type ValibotIssues = v.BaseIssue<unknown>[]
export type ValibotNonEmptyIssues = [v.BaseIssue<unknown>, ...v.BaseIssue<unknown>[]]

export const BigIntSchema = v.pipe(
  v.union([v.string(), v.number()]),
  v.transform(val => Number(val)),
  v.number(),
  v.integer(),
  v.minValue(0)
)

export const NullableBigIntSchema = v.nullable(BigIntSchema)

const SqliteBooleanSchema = v.pipe(
  v.union([v.boolean(), v.number()]),
  v.transform(val => Boolean(val))
)

export const NullableSqliteBooleanSchema = v.nullable(SqliteBooleanSchema)
