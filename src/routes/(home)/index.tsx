import { Title } from "@solidjs/meta"
import { A } from "@solidjs/router"
import s from "./home.module.css"

export default function Home() {
  return (
    <main class={s.main}>
      <Title>AutoShow</Title>
      <h1 class={s.title}>
        Transform Your Content Into Anything
      </h1>
      <p class={s.subtitle}>
        AI-powered video transcription. Generate summaries, show notes, and more.
      </p>
      <div class={s.buttonContainer}>
        <A href="/create" class={s.primaryButton}>
          Get Started
        </A>
        <A href="/show-notes" class={s.secondaryButton}>
          View Show Notes
        </A>
      </div>
    </main>
  )
}