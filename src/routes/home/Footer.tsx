import type { JSXElement } from "solid-js"
import { A } from "@solidjs/router"
import s from "./Footer.module.css"

type Props = {
  class?: string | undefined
}

export default function Footer(props: Props): JSXElement {
  return (
    <>
      <section class={`${s.ctaSection} ${props.class ?? ''}`}>
        <div class={s.ctaInner}>
          <h2 class={s.ctaTitle}>
            Start Processing <span class={s.ctaAccent}>Today</span>
          </h2>

          <p class={s.ctaSubtitle}>
            Transform your content with AI transcription, summarization, and generation.
          </p>

          <div class={s.ctaButtons}>
            <A href="/create" class={s.primaryButton}>
              Get Started
            </A>
            <A href="/pricing" class={s.secondaryButton}>
              View Pricing
            </A>
          </div>

          <p class={s.ctaNote}>
            Usage based pricing - No subscriptions or hidden fees
          </p>
        </div>
      </section>

      <footer class={s.footer}>
        <div class={s.footerInner}>
          <A href="/" class={s.footerLogo}>
            AutoShow
          </A>
          <hr class={s.divider} />
          <p class={s.copyright}>
            &copy; 2026 AutoShow
          </p>
        </div>
      </footer>
    </>
  )
}
