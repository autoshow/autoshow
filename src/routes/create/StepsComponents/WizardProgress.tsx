import clsx from "clsx"
import { For,Show,createEffect,on } from "solid-js"
import type { SourceRoutesCreateStepsComponentsWizardProgressProps as Props } from '~/types'
import s from "./WizardProgress.module.css"

export default function WizardProgress(props: Props) {
  let progressTrackRef: HTMLDivElement | undefined

  createEffect(on(() => props.currentIndex, () => {
    queueMicrotask(() => {
      progressTrackRef
        ?.querySelector<HTMLElement>('[aria-current="step"]')
        ?.scrollIntoView({ block: "nearest", inline: "nearest" })
    })
  }))

  return (
    <nav aria-label="Wizard progress" class={s.nav}>
      <div class={s.bar}>
        <div class={clsx(s.actionSlot, s.actionSlotStart)}>
          <Show
            when={props.leftAction}
            keyed
            fallback={<div class={s.actionPlaceholder} aria-hidden="true" />}
          >
            {(action) => (
              <button
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                class={clsx(s.actionButton, s.secondaryAction)}
              >
                {action.label}
              </button>
            )}
          </Show>
        </div>

        <div ref={progressTrackRef} class={s.progressTrack}>
          <ol class={s.list}>
            <For each={props.stepList}>
              {(stepId, index) => {
                const isCurrent = () => index() === props.currentIndex
                const isCompleted = () => index() < props.currentIndex
                return (
                  <li
                    class={clsx(s.item, isCompleted() && s.itemCompleted, isCurrent() && s.itemCurrent)}
                    aria-current={isCurrent() ? "step" : undefined}
                  >
                    <span class={s.dot} aria-hidden="true">
                      {isCompleted() ? "✓" : index() + 1}
                    </span>
                    <span class={s.label}>{props.stepMeta[stepId].title}</span>
                  </li>
                )
              }}
            </For>
          </ol>
        </div>

        <div class={clsx(s.actionSlot, s.actionSlotEnd)}>
          <button
            type={props.rightAction.type}
            onClick={props.rightAction.onClick}
            disabled={props.rightAction.disabled}
            class={clsx(s.actionButton, s.primaryAction)}
          >
            {props.rightAction.label}
          </button>
        </div>
      </div>
    </nav>
  )
}
