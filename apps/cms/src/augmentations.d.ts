import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    layout: string
    tKey?: string
  }
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      npm_package_version: string
    }
  }
}
export {}
