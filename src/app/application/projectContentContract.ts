import type { CaseStudy } from "../domain/caseStudy.ts";
import type { ProjectImplementation } from "../domain/portfolioData.ts";
import type { ExistingProjectNarrative } from "../domain/portfolioProject.ts";

type Check = (value: unknown, path: string) => unknown;
const fail = (path: string, message: string): never => { throw new Error(`${path}: ${message}`); };
const text: Check = (value, path) => typeof value === "string" && value.trim() ? value : fail(path, "must be a non-empty string");
const optional = (rule: Check): Check => (value, path) => value === undefined ? undefined : rule(value, path);
const array = (rule: Check, minimum = 0): Check => (value, path) => {
  if (!Array.isArray(value) || value.length < minimum) return fail(path, `must be an array with at least ${minimum} items`);
  return value.map((item, index) => rule(item, `${path}[${index}]`));
};
const object = (shape: Record<string, Check>): Check => (value, path) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "must be an object");
  const input = value as Record<string, unknown>;
  for (const key of Object.keys(input)) if (!Object.prototype.hasOwnProperty.call(shape, key)) fail(`${path}.${key}`, "unsupported field");
  return Object.fromEntries(Object.entries(shape).map(([key, rule]) => [key, rule(input[key], `${path}.${key}`)]));
};
const choice = (...values: string[]): Check => (value, path) => values.includes(value as string) ? value : fail(path, `must be one of ${values.join(", ")}`);
const href: Check = (value, path) => {
  text(value, path);
  const address = value as string;
  if (/^#[A-Za-z0-9_-]+$/.test(address)) return address;
  if (/^\/(?!\/)[A-Za-z0-9_./-]+$/.test(address) && !address.split("/").includes("..")) return address;
  let parsed: URL;
  try { parsed = new URL(address); } catch { return fail(path, "must be a safe link"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) fail(path, "must be HTTPS without credentials, a local path or a fragment");
  return address;
};
const link = object({kind: choice("repository", "demo", "documentation", "evidence", "other"), label: text, href});
const section = object({title: optional(text), paragraphs: array(text, 1), visualIds: optional(array(text))});
const results: Check = (value, path) => {
  const status = (value as {status?: unknown} | null)?.status;
  if (status === "not-documented") return object({status: choice("not-documented"), note: optional(text)})(value, path);
  return object({status: choice("documented"), summary: section, metrics: optional(array(object({label: text, value: (input, source) => typeof input === "number" && Number.isFinite(input) ? input : fail(source, "must be a finite number"), unit: text, source: link}))), links: optional(array(link))})(value, path);
};
const node = object({id: text, label: text, responsibility: optional(text)});
const connection = object({from: text, to: text, label: optional(text)});
const unique = (values: string[], path: string): void => { if (new Set(values).size !== values.length) fail(path, "must have unique identifiers"); };
const visual: Check = (value, path) => {
  const kind = (value as {kind?: string} | null)?.kind;
  const base = {id: text, description: text, caption: optional(text), source: optional(link)};
  let shape: Record<string, Check>;
  if (["architecture-diagram", "request-flow", "data-flow", "component-map", "deployment-topology"].includes(kind ?? "")) shape = {kind: choice(kind!), nodes: array(node, 1), connections: array(connection)};
  else if (kind === "sequence-flow") shape = {kind: choice(kind), participants: array(node, 1), steps: array(object({from: text, to: text, message: text}))};
  else if (kind === "code-excerpt") shape = {kind: choice(kind), language: text, code: text};
  else if (kind === "terminal-excerpt") shape = {kind: choice(kind), commands: array(text, 1), output: optional((input, source) => typeof input === "string" ? input : fail(source, "must be a string"))};
  else if (kind === "ui-evidence") shape = {kind: choice(kind), assetPath: href, alt: text};
  else return fail(`${path}.kind`, "must be a supported structured visual kind");
  const checked = object({...base, ...shape})(value, path) as Record<string, unknown>;
  const nodes = (checked.nodes ?? checked.participants) as {id: string}[] | undefined;
  if (nodes) {
    const ids = nodes.map(item => item.id);
    unique(ids, path);
    for (const edge of (checked.connections ?? checked.steps) as {from: string; to: string}[]) if (!ids.includes(edge.from) || !ids.includes(edge.to)) fail(path, "connections must reference declared nodes/participants");
  }
  return checked;
};
const decision = object({id: text, title: text, decision: section, constraints: optional(array(text)), rationale: optional(section), alternatives: optional(array(object({approach: text, tradeOff: text}))), implementation: optional(section), result: optional(results), learning: optional(section)});

export function validateCaseStudy(value: unknown, source: string): CaseStudy {
  const checked = object({projectSlug: text, overview: optional(section), context: optional(section), problem: optional(section), role: optional(section), constraints: optional(array(section)), architecture: optional(section), technicalDecisions: optional(array(decision)), implementation: optional(section), challenges: optional(array(section)), results: optional(results), learnings: optional(array(section)), visuals: optional(array(visual)), links: optional(array(link))})(value, source) as CaseStudy;
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(checked.projectSlug)) fail(`${source}.projectSlug`, "must be a lowercase repository slug");
  unique((checked.technicalDecisions ?? []).map(item => item.id), `${source}.technicalDecisions`);
  const visualIds = (checked.visuals ?? []).map(item => item.id);
  unique(visualIds, `${source}.visuals`);
  function references(input: unknown): void {
    if (!input || typeof input !== "object") return;
    const record = input as Record<string, unknown>;
    if (Array.isArray(record.visualIds)) for (const id of record.visualIds) if (!visualIds.includes(id as string)) fail(source, `undeclared visual reference ${id}`);
    Object.values(record).forEach(references);
  }
  references(checked);
  return checked;
}
export function validateNarrative(value: unknown, source: string): ExistingProjectNarrative {
  return object({problem: text, constraints: text, decision: text, result: text, architecture: array(text)})(value, source) as ExistingProjectNarrative;
}
export function validateImplementation(value: unknown, source: string): ProjectImplementation {
  return object({lines: array(text), summary: text})(value, source) as ProjectImplementation;
}
