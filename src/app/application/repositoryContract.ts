import type { RepositoryPortfolioMetadata } from "../domain/repositoryProject.ts"
import type { TechnicalVisualData } from "../domain/portfolioData.ts"
import { validateCaseStudy, validateNarrative, validateImplementation } from "./projectContentContract.ts"

export function validateTechnicalVisual(value: unknown, source: string): TechnicalVisualData {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${source}: must be a technical visual object`);
  const visual = value as Record<string, unknown>;
  const single = visual.kind === "nodes" || visual.kind === "radar";
  const count = visual.kind === "pipeline" ? 3 : visual.kind === "retrieval" ? 4 : 0;
  if (!single && !count) throw new Error(`${source}.kind: must be an existing technical visual kind`);
  if (Object.keys(visual).some(key => !["kind", single ? "label" : "labels"].includes(key))) throw new Error(`${source}: unsupported visual property`);
  const labels = single ? [visual.label] : visual.labels;
  if (!Array.isArray(labels) || labels.length !== (single ? 1 : count) || labels.some(label => typeof label !== "string" || !label.trim())) throw new Error(`${source}: invalid visual labels`);
  return value as TechnicalVisualData;
}

const visualKinds = [
  "architecture-diagram",
  "request-flow",
  "data-flow",
  "component-map",
  "sequence-flow",
  "deployment-topology",
  "code-excerpt",
  "terminal-excerpt",
  "ui-evidence",
]
const linkKinds = ["repository", "demo", "documentation", "evidence", "other"]

export function validatePortfolioMetadata(
  value: unknown,
  source: string,
): RepositoryPortfolioMetadata {
  function fail(path: string, message: string): never {
    throw new Error(`${source}: ${path} ${message}`)
  }
  function object(
    input: unknown,
    path: string,
    keys: readonly string[],
  ): Record<string, unknown> {
    if (!input || typeof input !== "object" || Array.isArray(input))
      fail(path, "must be an object")
    const record = input as Record<string, unknown>
    for (const key of Object.keys(record))
      if (!keys.includes(key))
        fail(`${path}.${key}`, "is not supported by schemaVersion 1")
    return record
  }
  function text(input: unknown, path: string): asserts input is string {
    if (typeof input !== "string" || input.trim().length === 0)
      fail(path, "must be a non-empty string")
  }
  function relativePath(input: unknown, path: string): void {
    text(input, path)
    if (
      input.startsWith("/") ||
      input.includes("\\") ||
      input
        .split("/")
        .some((segment) => !segment || segment === "." || segment === "..") ||
      /[:?#%\s]/.test(input)
    )
      fail(path, "must be a safe repository-relative path")
  }
  function array(input: unknown, path: string): unknown[] {
    if (!Array.isArray(input)) fail(path, "must be an array")
    return input
  }
  const metadata = object(value, "$", [
    "schemaVersion",
    "title",
    "summary",
    "category",
    "kicker",
    "role",
    "year",
    "stack",
    "highlights",
    "order",
    "featured",
    "hidden",
    "links",
    "caseStudy",
    "technicalVisuals",
    "visual",
    "narrative",
    "implementation",
    "caseStudyContent",
  ])
  if (metadata.schemaVersion !== 1) fail("$.schemaVersion", "must equal 1")
  if ("visual" in metadata) validateTechnicalVisual(metadata.visual, `${source}.visual`)
  if ("narrative" in metadata) validateNarrative(metadata.narrative, `${source}.narrative`)
  if ("implementation" in metadata) validateImplementation(metadata.implementation, `${source}.implementation`)
  if ("caseStudyContent" in metadata) validateCaseStudy(metadata.caseStudyContent, `${source}.caseStudyContent`)
  if ("caseStudy" in metadata && "caseStudyContent" in metadata) fail("$.caseStudyContent", "cannot coexist with a caseStudy file reference")
  for (const key of ["title", "summary", "category", "kicker", "role", "year"])
    if (key in metadata) text(metadata[key], `$.${key}`)
  for (const key of ["stack", "highlights"])
    if (key in metadata)
      array(metadata[key], `$.${key}`).forEach((item, index) =>
        text(item, `$.${key}[${index}]`),
      )
  if (
    "order" in metadata &&
    (typeof metadata.order !== "number" ||
      !Number.isSafeInteger(metadata.order) ||
      metadata.order < 0)
  )
    fail("$.order", "must be a non-negative safe integer")
  for (const key of ["featured", "hidden"])
    if (key in metadata && typeof metadata[key] !== "boolean")
      fail(`$.${key}`, "must be boolean")
  if ("links" in metadata) {
    array(metadata.links, "$.links").forEach((item, index) => {
      const path = `$.links[${index}]`
      const link = object(item, path, ["kind", "label", "href"])
      text(link.label, `${path}.label`)
      text(link.href, `${path}.href`)
      if (!linkKinds.includes(link.kind as string))
        fail(`${path}.kind`, "must be a supported link kind")
      let url: URL
      try {
        url = new URL(link.href)
      } catch {
        fail(`${path}.href`, "must be an absolute HTTPS URL")
      }
      if (url.protocol !== "https:" || url.username || url.password)
        fail(`${path}.href`, "must be an HTTPS URL without credentials")
    })
  }
  if ("caseStudy" in metadata) {
    const study = object(metadata.caseStudy, "$.caseStudy", [
      "path",
      "title",
      "summary",
    ])
    relativePath(study.path, "$.caseStudy.path")
    if (!(study.path as string).endsWith(".json"))
      fail("$.caseStudy.path", "must reference a structured JSON file")
    for (const key of ["title", "summary"])
      if (key in study) text(study[key], `$.caseStudy.${key}`)
  }
  if ("technicalVisuals" in metadata) {
    const identifiers = new Set<string>()
    array(metadata.technicalVisuals, "$.technicalVisuals").forEach(
      (item, index) => {
        const path = `$.technicalVisuals[${index}]`
        const visual = object(item, path, ["id", "kind", "path", "description"])
        text(visual.id, `${path}.id`)
        text(visual.description, `${path}.description`)
        relativePath(visual.path, `${path}.path`)
        if (!visualKinds.includes(visual.kind as string))
          fail(`${path}.kind`, "must be a supported visual kind")
        if (identifiers.has(visual.id)) fail(`${path}.id`, "must be unique")
        identifiers.add(visual.id)
      },
    )
  }
  return metadata as RepositoryPortfolioMetadata
}
