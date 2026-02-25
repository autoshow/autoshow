import type { JSXElement } from "solid-js"
import { A } from "@solidjs/router"
import s from "./Header.module.css"

export default function Header(): JSXElement {
  return (
    <header class={s.header}>
      <div class={s.headerInner}>
        <A href="/" class={s.logo}>
          AutoShow
        </A>
        <nav class={s.nav}>
          <A href="/ui" class={s.navLink}>
            Dashboard
          </A>
        </nav>
      </div>
    </header>
  )
}
