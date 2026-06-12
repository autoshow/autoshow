import clsx from "clsx"
import { A } from "@solidjs/router"
import m from "~/styles/marketing.module.css"
import ui from "~/styles/ui.module.css"
import type { SourceRoutesHomeFooterProps as Props } from '~/types'
import s from "./Footer.module.css"

export default function Footer(props: Props) {
  return (
    <>
      <section class={clsx(m.sectionAlt, props.class)}>
        <div class={clsx(ui.surface, ui.surfacePaddedLarge, s.ctaInner)}>
          <h2 class={m.sectionTitle}>
            Start Processing <span class={m.accent}>Today</span>
          </h2>

          <p class={clsx(m.sectionSubtitle, s.ctaSubtitle)}>
            Transform your content with AI transcription, summarization, and generation.
          </p>

          <div class={clsx(ui.actionRow, ui.actionRowCentered, s.ctaButtons)}>
            <A
              href="/create"
              class={clsx(ui.action, ui.actionPrimary, ui.actionLarge, ui.actionLift, ui.actionResponsiveFull)}
            >
              Start Processing
            </A>
          </div>

          <p class={s.ctaNote}>
            Local processing with estimated provider costs shown before each job.
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
