/** Where the visitor's light/dark choice is kept in this browser. */
export const SCHEME_KEY = 'pact-scheme'

/**
 * Runs in <head> before first paint: applies a stored choice to <html data-scheme>, so a light-mode
 * visitor never sees a dark flash. Anything unexpected leaves the server's scheme in place.
 */
export const SCHEME_SCRIPT = `try{var s=localStorage.getItem('${SCHEME_KEY}');if(s==='light'||s==='dark')document.documentElement.dataset.scheme=s}catch(e){}`
