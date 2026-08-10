/**
 * Lecture visuelle de la probabilité d'une opportunité.
 *
 * Partagé par le Kanban et la fiche : deux échelles divergentes donneraient à
 * la même opportunité deux couleurs différentes selon l'écran.
 */

/** Niveau de la jauge `SignalMeter`, par quarts. */
export function probabilityLevel(probability: number): 1 | 2 | 3 | 4 {
  if (probability < 30) return 1;
  if (probability < 60) return 2;
  if (probability < 90) return 3;
  return 4;
}

export function probabilityTone(probability: number): "alert" | "amber" | "signal" {
  if (probability < 30) return "alert";
  if (probability < 60) return "amber";
  return "signal";
}
