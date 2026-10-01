export type CaseStudyLink = {
  readonly kind: "repository" | "demo" | "documentation" | "evidence" | "other";
  readonly label: string;
  readonly href: `https://${string}` | `/${string}` | `#${string}`;
};

export type CaseStudySection = {
  readonly title?: string;
  readonly paragraphs: readonly [string, ...string[]];
  readonly visualIds?: readonly string[];
};

export type CaseStudyMetric = {
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  readonly source: CaseStudyLink;
};

export type CaseStudyResults =
  | {
      readonly status: "documented";
      readonly summary: CaseStudySection;
      readonly metrics?: readonly CaseStudyMetric[];
      readonly links?: readonly CaseStudyLink[];
    }
  | {
      readonly status: "not-documented";
      readonly note?: string;
      readonly summary?: never;
      readonly metrics?: never;
      readonly links?: never;
    };

export type CaseStudyDecision = {
  readonly id: string;
  readonly title: string;
  readonly decision: CaseStudySection;
  readonly constraints?: readonly string[];
  readonly rationale?: CaseStudySection;
  readonly alternatives?: readonly {
    readonly approach: string;
    readonly tradeOff: string;
  }[];
  readonly implementation?: CaseStudySection;
  readonly result?: CaseStudyResults;
  readonly learning?: CaseStudySection;
};

export type CaseStudyNode = {
  readonly id: string;
  readonly label: string;
  readonly responsibility?: string;
};

type CaseStudyVisualEvidence = {
  readonly id: string;
  readonly description: string;
  readonly caption?: string;
  readonly source?: CaseStudyLink;
};

export type CaseStudyVisual = CaseStudyVisualEvidence & (
  | {
      readonly kind: "architecture-diagram" | "request-flow" | "data-flow" | "component-map" | "deployment-topology";
      readonly nodes: readonly CaseStudyNode[];
      readonly connections: readonly {
        readonly from: string;
        readonly to: string;
        readonly label?: string;
      }[];
    }
  | {
      readonly kind: "sequence-flow";
      readonly participants: readonly CaseStudyNode[];
      readonly steps: readonly {
        readonly from: string;
        readonly to: string;
        readonly message: string;
      }[];
    }
  | {
      readonly kind: "code-excerpt";
      readonly language: string;
      readonly code: string;
    }
  | {
      readonly kind: "terminal-excerpt";
      readonly commands: readonly string[];
      readonly output?: string;
    }
  | {
      readonly kind: "ui-evidence";
      readonly assetPath: string;
      readonly alt: string;
    }
);

export type CaseStudy = {
  readonly projectSlug: string;
  readonly overview?: CaseStudySection;
  readonly context?: CaseStudySection;
  readonly problem?: CaseStudySection;
  readonly role?: CaseStudySection;
  readonly constraints?: readonly CaseStudySection[];
  readonly architecture?: CaseStudySection;
  readonly technicalDecisions?: readonly CaseStudyDecision[];
  readonly implementation?: CaseStudySection;
  readonly challenges?: readonly CaseStudySection[];
  readonly results?: CaseStudyResults;
  readonly learnings?: readonly CaseStudySection[];
  readonly visuals?: readonly CaseStudyVisual[];
  readonly links?: readonly CaseStudyLink[];
};
