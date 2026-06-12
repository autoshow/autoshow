import clsx from "clsx"
import { Title } from "@solidjs/meta"
import { A } from "@solidjs/router"
import { HttpStatusCode } from "@solidjs/start"
import ui from "~/styles/ui.module.css"
import s from "./404.module.css"

export default function NotFound() {
  return (
    <main class={clsx(ui.page, ui.pagePadded, ui.pageCentered, s.main)}>
      <Title>Not Found</Title>
      <HttpStatusCode code={404} />
      <h1 class={s.title}>
        Page Not Found
      </h1>
      <p class={s.message}>
        The page you're looking for doesn't exist.
      </p>
      <A href="/" class={clsx(ui.action, ui.actionPrimary, ui.actionLarge, ui.actionLift)}>
        Go Home
      </A>
    </main>
  )
}
