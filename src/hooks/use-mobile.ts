import * as React from "react"

const MOBILE_BREAKPOINT = 768

function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

export function useIsMobile() {
  // useSyncExternalStore is the React-recommended way to read from an external
  // store (here: the viewport matchMedia). It avoids setState-in-effect and
  // handles SSR via getServerSnapshot.
  const isMobile = React.useSyncExternalStore(
    subscribe,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false
  )
  return isMobile
}