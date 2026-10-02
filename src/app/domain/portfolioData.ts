import type { PortfolioProject } from "./portfolioProject.ts";
import type { RepositoryPortfolioMetadata } from "./repositoryProject.ts";

export type SectionId = "top" | "work" | "experience" | "stack" | "about" | "services" | "contact";
export type TechnicalVisualData =
  | { readonly kind: "nodes" | "radar"; readonly label: string }
  | { readonly kind: "pipeline"; readonly labels: readonly [string, string, string] }
  | { readonly kind: "retrieval"; readonly labels: readonly [string, string, string, string] };
export type SectionHeading = { readonly index: string; readonly eyebrow: string; readonly title: string; readonly note?: string };
export type ProjectImplementation = { readonly lines: readonly string[]; readonly summary: string };
export type PortfolioProjectSource = {
  readonly slug: string;
  readonly metadata: RepositoryPortfolioMetadata;
  readonly repositoryUrl: string | null;
  readonly liveUrl: string | null;
};
export type Experience = {
  readonly id: string;
  readonly company: string;
  readonly role: string;
  readonly period: string;
  readonly tech: string;
  readonly description: string;
};
export type Capability = { readonly id: string; readonly title: string; readonly description: string };
export type PortfolioDocument = {
  readonly schemaVersion: 2;
  readonly fixture: boolean;
  readonly person: { readonly name: string; readonly role: string; readonly location: string; readonly statement: string; readonly summary: string };
  readonly navigation: {
    readonly label: string;
    readonly initialSection: SectionId;
    readonly links: readonly { readonly section: SectionId; readonly label: string }[];
    readonly contact: { readonly section: SectionId; readonly label: string; readonly cursor: string };
  };
  readonly hero: { readonly visual: TechnicalVisualData; readonly scrollCue: { readonly label: string; readonly section: SectionId } };
  readonly sections: { readonly projects: SectionHeading; readonly experience: SectionHeading; readonly stack: SectionHeading; readonly about: SectionHeading; readonly services: SectionHeading };
  readonly projects: readonly PortfolioProjectSource[];
  readonly projectDetail: {
    readonly storySteps: readonly [string, string, string, string, string];
    readonly decisionLabels: readonly [string, string, string, string];
    readonly sectionLabels: readonly [string, string, string, string];
    readonly implementation: ProjectImplementation;
    readonly architecture: { readonly activeLabel: string; readonly descriptionSuffix: string };
    readonly caseStudyLabels?: {
      readonly overview: string; readonly context: string; readonly role: string; readonly category: string;
      readonly decisions: string; readonly rationale: string; readonly alternatives: string;
      readonly implementationDetail: string; readonly learnings: string;
      readonly metrics: string; readonly links: string; readonly undocumentedResult: string;
    };
  };
  readonly experience: readonly Experience[];
  readonly technologies: readonly { readonly label: string; readonly items: readonly { readonly name: string; readonly usedIn: string }[] }[];
  readonly education: readonly { readonly qualification: string }[];
  readonly about: { readonly description: string; readonly location: string; readonly exploration: string; readonly interestsLabel: string; readonly interests: readonly string[] };
  readonly services: readonly Capability[];
  readonly contact: {
    readonly email: string; readonly availability: string; readonly location: string; readonly headingLines: readonly string[]; readonly cursor: string;
    readonly calendly?: string;
    readonly booking?: { readonly label: string; readonly detail: string; readonly accessibleLabel: string };
    readonly socials: readonly { readonly label: string; readonly href: string }[];
  };
  readonly resume: { readonly label: string; readonly href: string } | null;
  readonly footer: { readonly statement: string; readonly backToTop: string };
  readonly labels: {
    readonly overlay: { readonly close: string; readonly closeAria: string };
    readonly projectOverlay: string; readonly experienceOverlay: string; readonly serviceOverlay: string;
    readonly projectCta: string; readonly projectCursor: string; readonly projectVisualPrefix: string; readonly experienceCursor: string; readonly serviceCursor: string;
    readonly caseProgressAria: string; readonly usedIn: string; readonly experienceTechnologies: string;
    readonly capability: string; readonly discussProject: string;
  };
};
export type Portfolio = Omit<PortfolioDocument, "projects"> & { readonly projects: readonly PortfolioProject[] };
