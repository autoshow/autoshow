import { Title } from "@solidjs/meta"
import { HttpStatusCode } from "@solidjs/start"
import { A } from "@solidjs/router"
import s from "./404.module.css"

export default function NotFound() {
  return (
    <main class={s.main}>
      <Title>Not Found</Title>
      <HttpStatusCode code={404} />
      <h1 class={s.title}>
        Page Not Found
      </h1>
      <p class={s.message}>
        The page you're looking for doesn't exist.
      </p>
      <A href="/" class={s.homeLink}>
        Go to Show Notes
      </A>
    </main>
  )
}
