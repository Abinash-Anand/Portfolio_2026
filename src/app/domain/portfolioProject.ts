import type { CaseStudy } from "./caseStudy.ts";
import type { TechnicalVisualData, ProjectImplementation } from "./portfolioData.ts";
import type { RepositoryPortfolioMetadata, RepositoryProject } from "./repositoryProject.ts";

export type PortfolioProjectMetadata = {
  readonly slug: string;
  readonly title: string;
  readonly year: string;
  readonly category: string;
  readonly stack: readonly string[];
  readonly description: string;
  readonly role: string;
  readonly kicker?: string;
  readonly highlights?: readonly string[];
  readonly order?: number;
  readonly featured?: boolean;
  readonly hidden?: boolean;
  readonly links?: RepositoryPortfolioMetadata["links"];
  readonly caseStudyReference?: RepositoryPortfolioMetadata["caseStudy"];
  readonly technicalVisualReferences?: RepositoryPortfolioMetadata["technicalVisuals"];
  readonly repositoryUrl?: string;
  readonly liveUrl?: string;
};

export type ExistingProjectNarrative = {
  readonly problem: string;
  readonly constraints: string;
  readonly decision: string;
  readonly result: string;
  readonly architecture: readonly string[];
};

export type PortfolioProject = {
  readonly metadata: PortfolioProjectMetadata;
  readonly narrative: ExistingProjectNarrative;
  readonly caseStudy?: CaseStudy;
  readonly visual: TechnicalVisualData;
  readonly implementation: ProjectImplementation;
  readonly evidence?: RepositoryProject["evidence"];
  readonly readme?: RepositoryProject["readme"];
};
