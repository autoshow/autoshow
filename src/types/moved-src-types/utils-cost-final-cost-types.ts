import type { CostBreakdown } from '~/types'

export type FinalCostBreakdown = {
  estimated: CostBreakdown
  step2: number
  step4: number
  step5: number
  step6: number
  step7: number
  step8: number
  total: number
}
