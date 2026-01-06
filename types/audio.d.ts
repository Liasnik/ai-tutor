/**
 * Extended Window interface for webkitAudioContext support (legacy Safari)
 * This allows TypeScript to recognize webkitAudioContext on the window object
 * for browsers that use the prefixed AudioContext API.
 */
interface WindowWithWebkit extends Window {
  webkitAudioContext?: typeof AudioContext;
}


