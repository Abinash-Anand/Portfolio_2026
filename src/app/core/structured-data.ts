/**
 * schema.org structured data (JSON-LD) for search engines. Plain builders: they take plain values, so this file
 * depends on nothing else in the app (the pages pass in the profile and project they already have).
 */

export interface PersonData {
  readonly name: string;
  readonly jobTitle: string;
  readonly description: string;
  readonly origin: string;
  readonly profiles: readonly string[];
  readonly skills: readonly string[];
  readonly university: string;
}

export function personJsonLd(person: PersonData): object {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${person.origin}/#person`,
        name: person.name,
        jobTitle: person.jobTitle,
        description: person.description,
        url: person.origin,
        sameAs: person.profiles,
        knowsAbout: person.skills,
        alumniOf: { '@type': 'CollegeOrUniversity', name: person.university },
        address: { '@type': 'PostalAddress', addressLocality: 'Stuttgart', addressCountry: 'DE' },
      },
      {
        '@type': 'WebSite',
        '@id': `${person.origin}/#website`,
        url: person.origin,
        name: person.name,
        inLanguage: 'en',
        publisher: { '@id': `${person.origin}/#person` },
      },
    ],
  };
}

export interface ProjectData {
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly repository: string;
  readonly languages: readonly string[];
  readonly origin: string;
  readonly author: string;
}

export function projectJsonLd(project: ProjectData): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: project.name,
    description: project.description,
    url: project.url,
    codeRepository: project.repository,
    programmingLanguage: project.languages,
    author: { '@type': 'Person', '@id': `${project.origin}/#person`, name: project.author },
  };
}
