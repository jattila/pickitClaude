/**
 * Every link that opens the app passes through here before routing.
 *
 * The development build's invite links live under /dev/join/ on the website, so
 * that a phone with both builds opens each link in the build that produced it
 * (see INVITE_PATH in app.config.ts). Inside the app it is the same invite, so
 * it is folded back onto the one /join/[code] screen. Everything else passes
 * through untouched.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return path.replace(/\/dev\/join\//, '/join/');
}
