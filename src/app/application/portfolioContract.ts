import type { PortfolioDocument, TechnicalVisualData } from "../domain/portfolioData.ts";
import type { RepositoryProject } from "../domain/repositoryProject.ts";
import { validatePortfolioMetadata, validateTechnicalVisual } from "./repositoryContract.ts";

type Check<Value> = (value: unknown, path: string) => Value;
type Checked<Rule> = Rule extends Check<infer Value> ? Value : never;
const fail = (path: string, message: string): never => { throw new Error(`${path}: ${message}`); };
const text: Check<string> = (value, path) => typeof value === "string" && value.trim() ? value : fail(path, "must be a non-empty string");
const rawText: Check<string> = (value, path) => typeof value === "string" ? value : fail(path, "must be a string");
const bool: Check<boolean> = (value, path) => typeof value === "boolean" ? value : fail(path, "must be boolean");
const literal = <Value extends string | number>(expected: Value): Check<Value> => (value, path) => value === expected ? expected : fail(path, `must equal ${expected}`);
const optional = <Value>(rule: Check<Value>): Check<Value | undefined> => (value, path) => value === undefined ? undefined : rule(value, path);
const nullable = <Value>(rule: Check<Value>): Check<Value | null> => (value, path) => value === null ? null : rule(value, path);
const array = <Value>(rule: Check<Value>): Check<Value[]> => (value, path) => Array.isArray(value) ? value.map((item, index) => rule(item, `${path}[${index}]`)) : fail(path, "must be an array");
function object<Shape extends Record<string, Check<unknown>>>(shape: Shape): Check<{ [Key in keyof Shape]: Checked<Shape[Key]> }> {
  return (value, path) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "must be an object");
    const input = value as Record<string, unknown>;
    for (const key of Object.keys(input)) if (!Object.prototype.hasOwnProperty.call(shape, key)) fail(`${path}.${key}`, "is not supported");
    return Object.fromEntries(Object.entries(shape).map(([key, rule]) => [key, rule(input[key], `${path}.${key}`)])) as { [Key in keyof Shape]: Checked<Shape[Key]> };
  };
}
function tuple<Length extends 3 | 4 | 5>(length: Length): Check<Length extends 3 ? [string, string, string] : Length extends 4 ? [string, string, string, string] : [string, string, string, string, string]> {
  return (value, path) => {
    const items = array(text)(value, path);
    if (items.length !== length) fail(path, `must contain ${length} labels`);
    return items as Checked<ReturnType<typeof tuple<Length>>>;
  };
}
const section: Check<PortfolioDocument["navigation"]["initialSection"]> = (value, path) => {
  if (!["top", "work", "experience", "stack", "about", "services", "contact"].includes(value as string)) fail(path, "must reference an existing section");
  return value as PortfolioDocument["navigation"]["initialSection"];
};
const url: Check<string> = (value, path) => {
  const href = text(value, path);
  let parsed: URL;
  try { parsed = new URL(href); } catch { return fail(path, "must be an absolute HTTPS URL"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) fail(path, "must be HTTPS without credentials");
  return href;
};
const resumeUrl: Check<string> = (value, path) => {
  const href = text(value, path);
  if (/^\/(?!\/)[A-Za-z0-9_./-]+\.pdf$/.test(href) && !href.split("/").includes("..")) return href;
  return url(href, path);
};
const visual: Check<TechnicalVisualData> = validateTechnicalVisual;
const heading = object({index: text, eyebrow: text, title: text, note: optional(text)});
function tuple4<Value>(rule: Check<Value>): Check<[Value, Value, Value, Value]> {
  return (value, path) => {
    const items = array(rule)(value, path);
    if (items.length !== 4) fail(path, "must contain 4 items");
    return items as [Value, Value, Value, Value];
  };
}
function tuple2<Value>(rule: Check<Value>): Check<[Value, Value]> {
  return (value, path) => {
    const items = array(rule)(value, path);
    if (items.length !== 2) fail(path, "must contain 2 items");
    return items as [Value, Value];
  };
}
const engineeringPrincipleEvidence = object({label: text, descriptor: text});
const engineeringPrinciple = object({id: text, label: text, statement: text, explanation: text, evidence: tuple4(engineeringPrincipleEvidence)});
const educationMetaRow = object({label: text, value: text});
const educationChapter = object({id: text, chapterLabel: text, yearStart: text, yearEnd: text, institution: text, degreeShort: text, field: text, metaPrimary: educationMetaRow, metaSecondary: educationMetaRow});
const implementation = object({lines: array(text), summary: text});
const metadata = (value: unknown, path: string) => validatePortfolioMetadata(value, path);
const document: Check<PortfolioDocument> = object({
  schemaVersion: literal(2), fixture: bool,
  person: object({name: text, role: text, location: text, statement: text, summary: text}),
  navigation: object({label: text, initialSection: section, links: array(object({section, label: text})), contact: object({section, label: text, cursor: text})}),
  hero: object({visual, scrollCue: object({label: text, section})}),
  sections: object({projects: heading, experience: heading, stack: heading, about: heading, services: heading}),
  projects: array(object({slug: text, metadata, repositoryUrl: nullable(url), liveUrl: nullable(url)})),
  projectDetail: object({storySteps: tuple(5), decisionLabels: tuple(4), sectionLabels: tuple(4), implementation, architecture: object({activeLabel: text, descriptionSuffix: text}), caseStudyLabels: optional(object({overview: text, context: text, role: text, category: text, decisions: text, rationale: text, alternatives: text, chosen: text, implementationDetail: text, technicalSurface: text, learnings: text, metrics: text, links: text, undocumentedResult: text, questions: tuple(5)}))}),
  experience: array(object({id: text, company: text, role: text, period: text, tech: text, description: text, story: optional(object({paragraphs: array(text)})), highlights: optional(array(text))})),
  technologies: array(object({label: text, items: array(object({name: text, usedIn: text}))})),
  education: tuple2(educationChapter),
  about: object({description: text, location: text, exploration: text, interestsLabel: text, interests: array(text)}),
  engineeringPrinciples: tuple4(engineeringPrinciple),
  services: array(object({id: text, title: text, description: text, story: optional(object({paragraphs: array(text)}))})),
  contact: object({email: (value, path) => { const address = text(value, path); if (!/^[^\s@<>?&#]+@[^\s@<>?&#]+\.[^\s@<>?&#]+$/.test(address)) fail(path, "must be an email address"); return address; }, calendly: optional(url), booking: optional(object({label: text, detail: text, accessibleLabel: text})), availability: text, location: text, headingLines: array(text), cursor: text, socials: array(object({label: text, href: url}))}),
  resume: nullable(object({label: text, href: resumeUrl})),
  footer: object({statement: text, backToTop: text}),
  labels: object({overlay: object({close: text, closeAria: text}), projectOverlay: text, experienceOverlay: text, serviceOverlay: text, projectCta: text, projectCursor: text, projectVisualPrefix: text, experienceCursor: text, serviceCursor: text, caseProgressAria: text, usedIn: text, experienceTechnologies: text, capability: text, discussProject: text, experienceTimelineAria: text, experienceScrollHint: text, experienceExpand: text, principleSelectorAria: text, educationLabel: text}),
});
export function validatePortfolioDocument(value: unknown, source = "portfolio.json"): PortfolioDocument {
  const data = document(value, source);
  if (Boolean(data.contact.calendly) !== Boolean(data.contact.booking)) fail(`${source}.contact`, "calendly and booking labels must be supplied together or both omitted");
  function unique(values: readonly string[], path: string): void {
    if (new Set(values).size !== values.length) fail(`${source}.${path}`, "must contain unique identities");
  }
  for (const project of data.projects) {
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(project.slug) || [".", ".."].includes(project.slug)) fail(`${source}.projects.${project.slug}`, "slug must be a lowercase repository name");
    if (project.metadata.caseStudyContent && project.metadata.caseStudyContent.projectSlug !== project.slug) fail(`${source}.projects.${project.slug}.caseStudyContent.projectSlug`, "must match its project slug");
  }
  unique(data.projects.map(project => project.slug), "projects");
  unique(data.experience.map(item => item.id), "experience");
  unique(data.education.map(item => item.id), "education");
  unique(data.services.map(item => item.id), "services");
  unique(data.technologies.map(group => group.label), "technologies");
  unique(data.navigation.links.map(link => link.section), "navigation.links");
  for (const group of data.technologies) unique(group.items.map(item => item.name), `technologies.${group.label}`);
  return data;
}
export function validateRepositorySnapshot(value: unknown): readonly RepositoryProject[] {
  const evidence = object({repository: text, name: text, description: nullable(rawText), url, defaultBranch: text, revision: text, topics: array(text), language: nullable(text), archived: bool});
  const snapshot = object({schemaVersion: literal(1), projects: array(object({slug: text, evidence, editorial: nullable(metadata), readme: nullable(object({path: text, markdown: rawText}))}))})(value, "githubProjects.json");
  const identities = new Set<string>();
  for (const project of snapshot.projects) {
    if (project.editorial?.caseStudyContent && project.editorial.caseStudyContent.projectSlug !== project.slug) fail(`githubProjects.json.${project.slug}.caseStudyContent.projectSlug`, "must match its repository slug");
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(project.slug) || project.slug !== project.evidence.name.toLowerCase() || project.evidence.repository.split("/").length !== 2 || project.evidence.repository.split("/")[1].toLowerCase() !== project.slug || identities.has(project.slug) || !/^[a-f0-9]{40}$/.test(project.evidence.revision)) fail(`githubProjects.json.${project.slug}`, "invalid or duplicate repository identity/revision");
    identities.add(project.slug);
  }
  return snapshot.projects;
}
export function validateGeneratedPortfolio(value: unknown): {document: PortfolioDocument; projects?: readonly RepositoryProject[]} {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("githubPortfolio.json", "missing generated data; run sync:github (see .env.example) or use explicit development fixture mode");
  const input = value as Record<string, unknown>;
  if (input.schemaVersion !== 1) fail("githubPortfolio.json.schemaVersion", "must equal 1");
  if (Object.keys(input).some(key => !["schemaVersion", "source", "document", "projects"].includes(key))) fail("githubPortfolio.json", "unsupported field");
  const data = validatePortfolioDocument(input.document, "githubPortfolio.json.document");
  const source = input.source as Record<string, unknown> | undefined;
  if (source?.mode === "fixture") {
    if (Object.keys(source).length !== 1 || !data.fixture || input.projects !== undefined) fail("githubPortfolio.json", "invalid fixture snapshot");
    return {document: data};
  }
  const origin = object({mode: literal("github"), owner: text, repository: text, revision: text, pinnedRepositories: array(text)})(input.source, "githubPortfolio.json.source");
  if (data.fixture || !/^[a-f0-9]{40}$/.test(origin.revision) || origin.repository.split("/")[0].toLowerCase() !== origin.owner.toLowerCase()) fail("githubPortfolio.json.source", "invalid production origin/fixture state");
  const projects = validateRepositorySnapshot({schemaVersion: 1, projects: input.projects});
  if (origin.pinnedRepositories.length !== projects.length || projects.some((project, index) => project.evidence.repository !== origin.pinnedRepositories[index])) fail("githubPortfolio.json.source.pinnedRepositories", "must match project identities in pinned order");
  return {document: data, projects};
}
