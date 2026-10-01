import type { Portfolio, PortfolioDocument, PortfolioProjectSource } from "../domain/portfolioData.ts";
import type { PortfolioProject, PortfolioProjectMetadata } from "../domain/portfolioProject.ts";
import type { RepositoryProject } from "../domain/repositoryProject.ts";

export function normalizeProjectMetadata(source: PortfolioProjectSource): PortfolioProjectMetadata {
  const metadata = source.metadata;
  return {
    slug: source.slug, title: metadata.title ?? source.slug, description: metadata.summary ?? "summary",
    year: metadata.year ?? "year", category: metadata.category ?? metadata.kicker ?? "category", role: metadata.role ?? "role", stack: metadata.stack ?? [],
    kicker: metadata.kicker, highlights: metadata.highlights, order: metadata.order, featured: metadata.featured ?? false, hidden: metadata.hidden ?? false,
    links: metadata.links, caseStudyReference: metadata.caseStudy, technicalVisualReferences: metadata.technicalVisuals,
    repositoryUrl: source.repositoryUrl ?? undefined, liveUrl: source.liveUrl ?? metadata.links?.find(link => link.kind === "demo")?.href,
  };
}
function freeze<Value>(value: Value): Value {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export function normalizePortfolio(document: PortfolioDocument, imported: readonly RepositoryProject[] | undefined): Portfolio {
  const sources = imported === undefined ? document.projects.map(source => ({source, evidence: undefined, readme: undefined})) : imported.map(project => {
    const source: PortfolioProjectSource = {
      slug: project.slug,
      metadata: {schemaVersion: 1, ...project.editorial, title: project.editorial?.title ?? project.evidence.name, summary: project.editorial?.summary ?? (project.evidence.description?.trim() ? project.evidence.description : "summary")},
      repositoryUrl: project.evidence.url, liveUrl: null,
    };
    return {source, evidence: project.evidence, readme: project.readme};
  });
  const projects: PortfolioProject[] = sources.filter(({source}) => !source.metadata.hidden).map(({source, evidence, readme}) => {
    return {
      metadata: normalizeProjectMetadata(source),
      narrative: source.metadata.narrative ?? {problem: "problem", constraints: "constraints", decision: "decision", result: "result", architecture: []},
      visual: source.metadata.visual ?? document.hero.visual,
      implementation: source.metadata.implementation ?? document.projectDetail.implementation,
      caseStudy: source.metadata.caseStudyContent, evidence, readme,
    };
  });
  if (imported === undefined) projects.sort((first, second) => {
    const order = (first.metadata.order ?? Number.MAX_SAFE_INTEGER) - (second.metadata.order ?? Number.MAX_SAFE_INTEGER);
    return order || (first.metadata.slug < second.metadata.slug ? -1 : first.metadata.slug > second.metadata.slug ? 1 : 0);
  });
  const {projects: _projects, ...content} = document;
  return freeze({...content, projects});
}
