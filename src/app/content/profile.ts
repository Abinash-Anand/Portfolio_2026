export interface SocialLink {
  readonly id: 'github' | 'linkedin' | 'instagram';
  readonly label: string;
  readonly href: string;
}

export interface Profile {
  readonly name: string;
  readonly role: string;
  /** Headline stack line, as presented in the CV. */
  readonly headlineStack: string;
  readonly tagline: string;
  readonly email: string;
  readonly cvPath: string;
  readonly about: readonly string[];
  readonly socials: readonly SocialLink[];
}

/** Wording follows the Master CV (2026-10-01). Keep it in sync with the CV. */
export const PROFILE: Profile = {
  name: 'Abinash Anand',
  role: 'Full-Stack Software Engineer',
  headlineStack: 'TypeScript · React · Angular · Node.js / NestJS',
  tagline:
    'TypeScript-focused full-stack software engineer who designs, builds, and ships production software end to end, from architecture and backend/API implementation through testing and deployment.',
  email: 'anandabinash25@gmail.com',
  cvPath: 'assets/CV_FRONTEND_ABINASH_ANAND_v1.pdf',
  about: [
    'TypeScript-focused full-stack software engineer who designs, builds, and ships production software end to end, from architecture and backend/API implementation through testing and deployment.',
    'M.Sc. Software Technology student at HFT Stuttgart with a focus on software architecture and distributed systems, and hands-on production experience across React/Angular frontends and Node.js/NestJS backends.',
  ],
  socials: [
    { id: 'github', label: 'GitHub', href: 'https://github.com/Abinash-Anand' },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/abinash-anand-064598203/',
    },
    { id: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/life_in_gitlogs' },
  ],
};

/**
 * The records the database vault "materialises" in the About room (CONCEPT.md Act IV). Wording is the owner's, quoted
 * from the concept; `STATUS` and `SPECIALIZATION` match the Master CV.
 */
export const PROFILE_RECORDS: readonly { readonly key: string; readonly value: string }[] = [
  { key: 'NAME', value: 'Abinash Anand' },
  { key: 'ROLE', value: 'Full-Stack Software Engineer' },
  { key: 'LOCATION', value: 'Stuttgart, Germany' },
  { key: 'STATUS', value: 'Enrolled in M.Sc. Software Technology @ HFT Stuttgart' },
  {
    key: 'SPECIALIZATION',
    value: 'Software Architecture, Distributed Systems & Agentic Workflows',
  },
];

/** GitHub account the portfolio is synced from (see scripts/sync-github.ts). */
export const GITHUB_LOGIN = 'Abinash-Anand';
