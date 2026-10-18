/* Compatibility facade for the study UI. Shapes live in drawing/tools/;
 * lifecycle, palettes and shared wind live in drawing/core.js.
 */
window.PoemStudies = Object.freeze({
  definitions:window.PoemDrawing.definitions(),
  mount:window.PoemDrawing.mount
});
