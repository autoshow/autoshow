/// <reference types="@solidjs/start/env" />

declare module "*.module.css" {
  const classes: { [key: string]: string }
  export default classes
}

declare module "*.module.scss" {
  const classes: { [key: string]: string }
  export default classes
}

declare module "*.module.sass" {
  const classes: { [key: string]: string }
  export default classes
}

interface ImportMetaEnv {
  readonly VITE_GOOGLE_DRIVE_CLIENT_ID?: string
  readonly VITE_GOOGLE_DRIVE_API_KEY?: string
}
