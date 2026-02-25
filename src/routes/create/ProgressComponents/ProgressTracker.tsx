import { For, Show, Switch, Match } from "solid-js"
import s from "./ProgressTracker.module.css"
import type { ProgressUpdate } from "~/types"

type Props = {
  progress: ProgressUpdate
}

export default function ProgressTracker(props: Props) {
  const allSteps = [
    { number: 1, name: 'Download Audio' },
    { number: 2, name: 'Transcription' },
    { number: 3, name: 'Content Selection' },
    { number: 4, name: 'LLM Generation' },
    { number: 5, name: 'Text-to-Speech' },
    { number: 6, name: 'Image Generation' },
    { number: 7, name: 'Music Generation' },
    { number: 8, name: 'Video Generation' }
  ]

  const stepStatuses = () => {
    return allSteps.map(step => {
      if (step.number < props.progress.step) {
        return { ...step, status: 'completed' }
      } else if (step.number === props.progress.step) {
        return { ...step, status: props.progress.status }
      } else {
        return { ...step, status: 'pending' }
      }
    })
  }

  const getStepClass = (status: string) => {
    const classes = [s.step]
    if (status === 'completed') classes.push(s.stepCompleted)
    if (status === 'processing') classes.push(s.stepProcessing)
    if (status === 'error') classes.push(s.stepError)
    if (status === 'pending') classes.push(s.stepPending)
    if (status === 'skipped') classes.push(s.stepSkipped)
    return classes.join(' ')
  }

  return (
    <div class={s.container}>
      <div class={s.header}>
        <h3 class={s.title}>Processing Your Content</h3>
        <div class={s.overallProgress}>
          <div class={s.overallProgressBar} style={{ width: `${props.progress.overallProgress}%` }} />
          <span class={s.overallProgressText}>{props.progress.overallProgress}%</span>
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
                    <span class={s.stepSpinner} />
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
                    <div class={s.stepProgressBar} style={{ width: `${props.progress.stepProgress}%` }} />
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
        <div class={s.errorBox}>
          <strong>Error:</strong> {props.progress.error}
        </div>
      </Show>
    </div>
  )
}