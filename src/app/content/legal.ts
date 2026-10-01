/**
 * Facts the legal pages need. Everything else on those pages describes what the site really does and is written
 * in the pages themselves; keep it in step with docs/ARCHITECTURE.md section 10.1 when behaviour changes.
 */
export interface Legal {
  /**
   * The postal address for the Impressum (a legal notice, required in Germany for many websites; whether it
   * applies to a personal portfolio is for the owner to verify, this is not legal advice). One entry per line.
   * Leave null until the owner supplies it: the footer then does not link the Impressum.
   */
  readonly address: readonly string[] | null;
  /** When the privacy notice was last reviewed (ISO date). */
  readonly updated: string;
  /** The supervisory authority a visitor may complain to (the owner lives in Baden-Württemberg). */
  readonly authority: { readonly name: string; readonly url: string };
}

export const LEGAL: Legal = {
  address: null,
  updated: '2026-10-01',
  authority: {
    name: 'Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg',
    url: 'https://www.baden-wuerttemberg.datenschutz.de',
  },
};
