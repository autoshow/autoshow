import clsx from "clsx"
import { A } from "@solidjs/router"
import m from "~/styles/marketing.module.css"
import ui from "~/styles/ui.module.css"
import { getCanonicalSiteUrl } from "~/utils/site-url"
import s from "./Hero.module.css"

export default function Hero() {
  const siteUrl = getCanonicalSiteUrl()

  return (
    <section class={s.hero}>
      <div class={clsx(ui.surface, ui.surfacePaddedLarge, s.content)}>
        <h1 class={s.title}>
          Transform Your <span class={m.accent}>Content</span>
          <br />
          Into Anything
        </h1>

        <p class={s.subtitle}>
          Pick a target — any audio, video, or document file to
          convert to text and combine with prompts to generate
          text, audio, image, music, and video assets.
        </p>

        <div class={clsx(ui.actionRow, ui.actionRowCentered)}>
          <A
            href="/create"
            class={clsx(ui.action, ui.actionPrimary, ui.actionLarge, ui.actionLift, ui.actionResponsiveFull)}
          >
            <span class={s.ctaText}>Get Started</span>
          </A>
          <A
            href="/show-notes"
            class={clsx(ui.action, ui.actionSecondary, ui.actionLarge, ui.actionLift, ui.actionResponsiveFull)}
          >
            <span class={s.ctaText}>View Show Notes</span>
          </A>
        </div>

        <div class={s.agentLinks} aria-label="Operator and agent entry points">
          <span class={s.agentLabel}>Operator entry points</span>
          <a href={`${siteUrl}/llms.txt`} rel="external" class={s.agentLink}>llms.txt</a>
          <a href={`${siteUrl}/sitemap.md`} rel="external" class={s.agentLink}>sitemap.md</a>
        </div>
      </div>
    </section>
  )
}
