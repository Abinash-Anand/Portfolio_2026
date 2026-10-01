import type { TechnicalVisualData, ProjectImplementation } from "./portfolioData.ts";
import type { ExistingProjectNarrative } from "./portfolioProject.ts";
import type { CaseStudy } from "./caseStudy.ts";

export type PortfolioLink = {
  readonly kind: "repository" | "demo" | "documentation" | "evidence" | "other"
  readonly label: string
  readonly href: string
}

export type RepositoryPortfolioMetadata = {
  readonly schemaVersion: 1
  readonly title?: string
  readonly summary?: string
  readonly category?: string
  readonly kicker?: string
  readonly role?: string
  readonly year?: string
  readonly stack?: readonly string[]
  readonly highlights?: readonly string[]
  readonly order?: number
  readonly featured?: boolean
  readonly hidden?: boolean
  readonly links?: readonly PortfolioLink[]
  readonly caseStudy?: {
    readonly path: string
    readonly title?: string
    readonly summary?: string
  }
  readonly technicalVisuals?: readonly {
    readonly id: string
    readonly kind: "architecture-diagram" | "request-flow" | "data-flow" | "component-map" | "sequence-flow" | "deployment-topology" | "code-excerpt" | "terminal-excerpt" | "ui-evidence"
    readonly path: string
    readonly description: string
  }[]
  readonly visual?: TechnicalVisualData
  readonly narrative?: ExistingProjectNarrative
  readonly implementation?: ProjectImplementation
  readonly caseStudyContent?: CaseStudy
}

export type RepositoryProject = {
  readonly slug: string
  readonly evidence: {
    readonly repository: string
    readonly name: string
    readonly description: string | null
    readonly url: string
    readonly defaultBranch: string
    readonly revision: string
    readonly topics: readonly string[]
    readonly language: string | null
    readonly archived: boolean
  }
  readonly editorial: RepositoryPortfolioMetadata | null
  readonly readme: { readonly path: string; readonly markdown: string } | null
}
