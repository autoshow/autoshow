import clsx from "clsx"
import { For,Match,Show,Switch } from "solid-js"
import ui from "~/styles/ui.module.css"
import type { SourceRoutesCreateProgressComponentsProgressTrackerProps as Props } from '~/types'
import { JOB_PROGRESS_DISPLAY_STEPS } from "~/utils/job-progress"
import s from "./ProgressTracker.module.css"

export default function ProgressTracker(props: Props) {
  const stepStatuses = () => {
    return JOB_PROGRESS_DISPLAY_STEPS.map(step => {
      if (props.progress.skippedSteps?.includes(step.number)) {
        return { ...step, status: 'skipped' }
      } else if (step.number < props.progress.step) {
        return { ...step, status: 'completed' }
      } else if (step.number === props.progress.step) {
        return { ...step, status: props.progress.status }
      } else {
        return { ...step, status: 'pending' }
      }
    })
  }

  const getStepClass = (status: string) => {
    return clsx(
      s.step,
      status === "completed" && s.stepCompleted,
      status === "processing" && s.stepProcessing,
      status === "error" && s.stepError,
      status === "pending" && s.stepPending,
      status === "skipped" && s.stepSkipped,
    )
  }

  return (
    <div class={s.container}>
      <div class={s.header}>
        <h3 class={s.title}>Processing Your Content</h3>
        <div class={s.overallProgress} style={{ "--overall-progress": `${props.progress.overallProgress}%` }}>
          <div class={s.overallProgressBar} style={{ transform: `scaleX(${props.progress.overallProgress / 100})` }} />
          <span class={s.overallProgressText}>{props.progress.overallProgress}%</span>
          <span class={s.overallProgressTextFilled} aria-hidden="true">{props.progress.overallProgress}%</span>
        </div>
      </div>

      <div class={s.steps}>
        <For each={stepStatuses()}>
          {(step) => (
            <div class={getStepClass(step.status)}>
              <div class={s.stepIndicator}>
                <Switch fallback={<span class={s.stepNumber}>{step.number}</span>}>
                  <Match when={step.status === 'completed'}>
                    <span class={s.stepIcon}>✓</span>
                  </Match>
                  <Match when={step.status === 'processing'}>
                    <span class={s.stepSpinner}>…</span>
                  </Match>
                  <Match when={step.status === 'error'}>
                    <span class={s.stepIcon}>✖</span>
                  </Match>
                  <Match when={step.status === 'skipped'}>
                    <span class={s.stepIcon}>⊘</span>
                  </Match>
                </Switch>
              </div>
              <div class={s.stepContent}>
                <div class={s.stepName}>{step.name}</div>
                <Show when={step.number === props.progress.step && step.status === 'processing'}>
                  <div class={s.stepProgress}>
                    <div class={s.stepProgressBar} style={{ transform: `scaleX(${props.progress.stepProgress / 100})` }} />
                  </div>
                </Show>
              </div>
            </div>
          )}
        </For>
      </div>

      <div class={s.currentStatus}>
        <div class={s.statusMessage}>{props.progress.message}</div>
        <Show when={props.progress.subStep}>
          <div class={s.subStepInfo}>
            {props.progress.subStep?.description || `Processing ${props.progress.subStep?.current}/${props.progress.subStep?.total}`}
          </div>
        </Show>
      </div>

      <Show when={props.progress.error}>
        <div class={clsx(ui.status, ui.statusDanger, s.errorBox)}>
          <strong>Error:</strong> {props.progress.error}
        </div>
      </Show>
    </div>
  )
}
