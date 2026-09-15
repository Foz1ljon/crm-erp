import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title: string
    /** Route is reachable without an authenticated session (e.g. /login). */
    public?: boolean
    /** Route renders without the DefaultLayout sidebar/topbar chrome (e.g. /login, /workspace). */
    bare?: boolean
  }
}
