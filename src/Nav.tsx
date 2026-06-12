import clsx from "clsx"
import { A } from "@solidjs/router"
import ui from "~/styles/ui.module.css"
import s from "./Nav.module.css"

export default function Nav() {
  return (
    <nav class={s.nav}>
      <div class={s.inner}>
        <div class={s.left}>
          <A href="/" class={s.logo}>AutoShow</A>
          <A href="/create" class={clsx(ui.action, ui.actionCompact, s.link)}>Create</A>
          <A href="/show-notes" class={clsx(ui.action, ui.actionCompact, s.link)}>Show Notes</A>
          <A href="/presets" class={clsx(ui.action, ui.actionCompact, s.link)}>Presets</A>
        </div>
      </div>
    </nav>
  )
}
