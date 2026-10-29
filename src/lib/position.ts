/**
 * Helper de positionnement avec fractional indexing (Dev 3 - §6.3)
 * Permet d'insérer une carte entre deux autres sans renuméroter toute la colonne
 */

export function calculateBetween(before?: number | null, after?: number | null): number {
  if (before == null && after == null) {
    return 1000.0;
  }
  if (before == null && after != null) {
    return after / 2.0;
  }
  if (before != null && after == null) {
    return before + 1000.0;
  }
  if (before != null && after != null) {
    return (before + after) / 2.0;
  }
  return 1000.0;
}
