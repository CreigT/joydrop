/** Sponsor line required on every app/site built for the owner. */
export const SPONSOR_TEXT = "Sponsored by CREIGNIFICENT LLC";

export function sponsoredDescription(text: string): string {
  return `${text} ${SPONSOR_TEXT}.`;
}
