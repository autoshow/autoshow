import type { JSXElement } from "solid-js"
import { A } from "@solidjs/router"
import s from "./Hero.module.css"

export default function Hero(): JSXElement {
  return (
    <section class={s.hero}>
      <div class={s.content}>
        <h1 class={s.title}>
          Transform Your <span class={s.accent}>Content</span>
          <br />
          Into Anything
        </h1>

        <p class={s.subtitle}>
          Pick a target — any audio, video, or document. It gets converted to text through
          transcription or extraction, then combined with prompts to generate summaries,
          audio, images, music, and video.
        </p>

        <div class={s.ctaWrapper}>
          <A href="/create" class={s.cta}>
            <span class={s.ctaText}>Get Started</span>
          </A>
          <A href="/show-notes" class={s.ctaSecondary}>
            <span class={s.ctaText}>View Show Notes</span>
          </A>
        </div>
      </div>
    </section>
  )
}
