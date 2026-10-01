import { readFile, readdir, mkdir, writeFile, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { RepositoryProject } from "../src/app/domain/repositoryProject.ts";
import type { PortfolioDocument } from "../src/app/domain/portfolioData.ts";
import { validatePortfolioMetadata } from "./portfolio-contract.ts";
import { validatePortfolioDocument, validateRepositorySnapshot, validateGeneratedPortfolio } from "../src/app/application/portfolioContract.ts";
import { createPortfolioRepository } from "../src/app/application/portfolioRepository.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const generatedPath = resolve(root, "src/app/generated/githubPortfolio.json");
type Source = { owner: string; repository: string };
type Client = { json(path: string, optional?: boolean): Promise<unknown>; file(path: string, limit: number): Promise<Buffer>; graphql(query: string, variables: Record<string, string>): Promise<unknown> };

function record(value: unknown, source: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${source}: expected an object`);
  return value as Record<string, unknown>;
}
function text(value: unknown, source: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${source}: expected a non-empty string`);
  return value;
}
function parse(textValue: string, source: string): unknown {
  try { return JSON.parse(textValue); } catch { throw new Error(`${source}: malformed JSON`); }
}
export function validateSelection(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error("Pinned repositories: expected an array");
  const slugs = new Set<string>();
  return value.map((selection, index) => {
    if (typeof selection !== "string" || !/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(selection)) throw new Error(`Pinned repositories[${index}]: expected owner/repository`);
    const slug = selection.split("/")[1].toLowerCase();
    if (slugs.has(slug)) throw new Error(`Pinned repositories: duplicate repository slug ${slug}`);
    slugs.add(slug);
    return selection;
  });
}
export function validateSource(value: unknown): Source {
  const source = record(value, "github-source.json");
  if (Object.keys(source).some(key => !["owner", "repository"].includes(key))) throw new Error("github-source.json: unsupported configuration field");
  const owner = text(source.owner, "github-source.json.owner");
  const repository = validateSelection([source.repository])[0];
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(owner) || repository.split("/")[0].toLowerCase() !== owner.toLowerCase()) throw new Error("github-source.json: portfolio repository must belong to the configured owner");
  return {owner, repository};
}
function client(token: string, request: typeof fetch): Client {
  if (!token.trim()) throw new Error("PORTFOLIO_GH_TOKEN is required for GitHub mode; configure a build-only owner token, or explicitly use PORTFOLIO_DATA_MODE=fixture for local verification");
  async function response(path: string, options: RequestInit = {}, optional = false): Promise<Response | null> {
    let result: Response;
    try {
      result = await request(`https://api.github.com/${path}`, {...options, headers: {Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...options.headers, Authorization: `Bearer ${token}`}, signal: AbortSignal.timeout(20000), redirect: "error"});
    } catch { throw new Error(`${path}: GitHub network/timeout/redirect failure`); }
    if (optional && result.status === 404) return null;
    if (!result.ok) throw new Error(`${path}: GitHub HTTP ${result.status}; check authentication, repository access and rate limits`);
    return result;
  }
  return {
    async json(path, optional = false) {
      const result = await response(path, {}, optional);
      if (!result) return null;
      return parse(await result.text(), path);
    },
    async file(path, limit) {
      const result = await response(path, {headers: {Accept: "application/vnd.github.raw+json"}});
      if (!result) throw new Error(`${path}: missing required asset`);
      if (Number(result.headers.get("content-length")) > limit) throw new Error(`${path}: asset exceeds ${limit} bytes`);
      const reader = result.body?.getReader();
      if (!reader) throw new Error(`${path}: empty asset response`);
      const parts: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > limit) { await reader.cancel(); throw new Error(`${path}: asset exceeds ${limit} bytes`); }
        parts.push(chunk.value);
      }
      return Buffer.concat(parts);
    },
    async graphql(query, variables) {
      const result = await response("graphql", {method: "POST", body: JSON.stringify({query, variables}), headers: {"Content-Type": "application/json"}});
      const envelope = record(parse(await result!.text(), "GitHub GraphQL"), "GitHub GraphQL");
      if (envelope.errors !== undefined) throw new Error("GitHub GraphQL returned errors; check owner identity, token scopes and API schema");
      return record(envelope.data, "GitHub GraphQL.data");
    },
  };
}
const pinnedQuery = `query PortfolioPinnedRepositories($owner: String!) {
  viewer { login }
  user(login: $owner) {
    login
    pinnedItems(first: 6) {
      nodes {
        __typename
        ... on Repository {
          name nameWithOwner url description
          defaultBranchRef { name }
          owner { login }
        }
      }
    }
  }
}`;
export type PinDiscovery = {login: string; returned: number; repositories: string[]};
export async function discoverPins(source: Source, api: Client): Promise<PinDiscovery> {
  const data = record(await api.graphql(pinnedQuery, {owner: source.owner}), "GitHub pins");
  const viewer = record(data.viewer, "GitHub viewer");
  const user = record(data.user, "GitHub owner");
  if (text(viewer.login, "viewer.login").toLowerCase() !== source.owner.toLowerCase() || text(user.login, "user.login").toLowerCase() !== source.owner.toLowerCase()) throw new Error("GitHub owner mismatch: PORTFOLIO_GH_TOKEN must authenticate the configured portfolio owner");
  const nodes = record(user.pinnedItems, "pinnedItems").nodes;
  if (!Array.isArray(nodes) || nodes.length > 6) throw new Error("pinnedItems.nodes: expected at most six items");
  const selections: string[] = [];
  for (const item of nodes) {
    if (item === null) throw new Error("pinnedItems.nodes: inaccessible/null pinned item");
    const node = record(item, "Pinned item");
    if (text(node.__typename, "Pinned item.__typename") !== "Repository") continue;
    const name = text(node.nameWithOwner, "Pinned repository.nameWithOwner");
    if (text(node.name, "Pinned repository.name").toLowerCase() !== name.split("/")[1]?.toLowerCase() || text(record(node.owner, name).login, "Pinned repository.owner.login").toLowerCase() !== name.split("/")[0]?.toLowerCase() || node.url !== `https://github.com/${name}` || (node.description !== null && typeof node.description !== "string")) throw new Error(`${name}: inconsistent pinned repository metadata`);
    if (name.toLowerCase() === source.repository.toLowerCase()) continue;
    text(record(node.defaultBranchRef, `${name}.defaultBranchRef`).name, `${name}.defaultBranchRef.name`);
    selections.push(name);
  }
  return {login: text(user.login, "user.login"), returned: nodes.length, repositories: validateSelection(selections)};
}
export async function discoverPinnedRepositories(source: Source, api: Client): Promise<string[]> {
  return (await discoverPins(source, api)).repositories;
}
const optionalContent = ["title", "summary", "category", "kicker", "role", "year", "stack", "highlights", "links", "visual", "narrative", "implementation", "caseStudyContent"] as const;
export function missingOptionalMetadata(editorial: RepositoryProject["editorial"]): string[] {
  return optionalContent.filter(field => editorial === null || editorial[field] === undefined);
}
const reservedHost = /(^|\.)example\.(com|org|net)$|\.(invalid|test|example|localhost)$|^localhost$/i;
function assertNoPlaceholderIdentity(document: PortfolioDocument, path: string): void {
  const hosts: [string, string][] = [["contact.email", document.contact.email.split("@")[1] ?? ""], ...document.contact.socials.map((link, index): [string, string] => [`contact.socials[${index}]`, new URL(link.href).hostname])];
  if (document.contact.calendly) hosts.push(["contact.calendly", new URL(document.contact.calendly).hostname]);
  for (const [field, host] of hosts) if (reservedHost.test(host)) throw new Error(`${path}: ${field} uses a reserved placeholder host; production cannot publish placeholder identity`);
}
function content(value: unknown, source: string): {path: string; text: string} {
  const file = record(value, source);
  if (file.encoding !== "base64" || file.type !== "file" || typeof file.content !== "string" || typeof file.size !== "number" || !Number.isSafeInteger(file.size) || file.size < 0 || file.size > 1_000_000) throw new Error(`${source}: expected a base64 file no larger than 1 MB`);
  const bytes = Buffer.from(file.content, "base64");
  if (bytes.length !== file.size) throw new Error(`${source}: file size/content mismatch`);
  return {path: text(file.path, source), text: new TextDecoder("utf-8", {fatal: true}).decode(bytes)};
}
async function repositoryAtRevision(selection: string, api: Client): Promise<{repository: Record<string, unknown>; branch: string; revision: string}> {
  const repository = record(await api.json(`repos/${selection}`), selection);
  if (text(repository.full_name, `${selection}.full_name`).toLowerCase() !== selection.toLowerCase() || text(repository.name, `${selection}.name`).toLowerCase() !== selection.split("/")[1].toLowerCase()) throw new Error(`${selection}: repository identity changed`);
  const branch = text(repository.default_branch, `${selection}.default_branch`);
  const revision = text(record(await api.json(`repos/${selection}/commits/${encodeURIComponent(branch)}`), selection).sha, `${selection}.revision`);
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error(`${selection}: invalid revision`);
  return {repository, branch, revision};
}
async function syncSelected(selections: readonly string[], api: Client): Promise<RepositoryProject[]> {
  const projects: RepositoryProject[] = [];
  for (const selection of validateSelection(selections)) {
    const {repository, branch, revision} = await repositoryAtRevision(selection, api);
    const source = `${selection}/portfolio.json@${revision}`;
    const file = await api.json(`repos/${selection}/contents/portfolio.json?ref=${revision}`, true);
    const editorial = file === null ? null : validatePortfolioMetadata(parse(content(file, source).text, source), source);
    if (!editorial) console.warn(`${source}: missing optional metadata; using repository evidence only`);
    const readmeFile = await api.json(`repos/${selection}/readme?ref=${revision}`, true);
    const readme = readmeFile === null ? null : content(readmeFile, `${selection}/README@${revision}`);
    if (!readme) console.warn(`${selection}: optional README absent`);
    projects.push({slug: (repository.name as string).toLowerCase(), evidence: {repository: selection, name: repository.name as string, description: repository.description as string | null, url: `https://github.com/${selection}`, defaultBranch: branch, revision, topics: repository.topics as string[], language: repository.language as string | null, archived: repository.archived as boolean}, editorial, readme: readme ? {path: readme.path, markdown: readme.text} : null});
  }
  return [...validateRepositorySnapshot({schemaVersion: 1, projects})];
}
export async function syncRepositories(selections: readonly string[], request: typeof fetch = fetch, token = process.env.PORTFOLIO_GH_TOKEN ?? ""): Promise<RepositoryProject[]> {
  return syncSelected(selections, client(token, request));
}
export async function syncPortfolio(configuration: unknown, token: string, request: typeof fetch = fetch) {
  const source = validateSource(configuration);
  const api = client(token, request);
  const discovery = await discoverPins(source, api);
  const pins = discovery.repositories;
  const {revision} = await repositoryAtRevision(source.repository, api);
  const documentPath = `${source.repository}/portfolio.json@${revision}`;
  const documentFile = await api.json(`repos/${source.repository}/contents/portfolio.json?ref=${revision}`);
  const document = validatePortfolioDocument(parse(content(documentFile, documentPath).text, documentPath), documentPath);
  if (document.fixture) throw new Error(`${documentPath}: fixture=true cannot be published as GitHub production content`);
  assertNoPlaceholderIdentity(document, documentPath);
  const projects = await syncSelected(pins, api);
  let resume: {path: string; bytes: Buffer} | null = null;
  let normalizedDocument: PortfolioDocument = document;
  if (document.resume) {
    const path = document.resume.href;
    if (path !== "/resume.pdf") throw new Error(`${documentPath}: resume.href must be /resume.pdf so its source is the portfolio repository`);
    const bytes = await api.file(`repos/${source.repository}/contents/resume.pdf?ref=${revision}`, 20_000_000);
    if (bytes.subarray(0, 5).toString() !== "%PDF-") throw new Error(`${source.repository}/resume.pdf@${revision}: invalid PDF signature`);
    const outputPath = `generated/resume-${revision}.pdf`;
    resume = {path: outputPath, bytes};
    normalizedDocument = {...document, resume: {...document.resume, href: `/${outputPath}`}};
  }
  const snapshot = {schemaVersion: 1, source: {mode: "github", ...source, revision, pinnedRepositories: pins}, document: normalizedDocument, projects};
  validateGeneratedPortfolio(snapshot);
  createPortfolioRepository(snapshot.document, {schemaVersion: 1, projects});
  return {snapshot, resume, discovery};
}
async function atomicWrite(path: string, data: string | Buffer): Promise<void> {
  await mkdir(dirname(path), {recursive: true});
  const temporaryPath = `${path}.${process.pid}.tmp`;
  try { await writeFile(temporaryPath, data); await rename(temporaryPath, path); }
  finally { await rm(temporaryPath, {force: true}); }
}
async function removeOldResumes(currentPath?: string): Promise<void> {
  const directory = resolve(root, "public/generated");
  const files = await readdir(directory).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  for (const file of files) {
    if (/^resume-[a-f0-9]{40}\.pdf$/.test(file) && `generated/${file}` !== currentPath) await rm(resolve(directory, file));
  }
}
export async function main(): Promise<void> {
  const mode = process.env.PORTFOLIO_DATA_MODE ?? "github";
  if (mode === "fixture") {
    if (process.argv.includes("--production")) throw new Error("Production build requires GitHub mode; fixture mode is only allowed for development synchronization");
    const document = validatePortfolioDocument(parse(await readFile(resolve(root, "fixtures/portfolio.fixture.json"), "utf8"), "local fixture"));
    if (!document.fixture) throw new Error("Fixture mode requires an explicitly marked fixture=true document");
    await atomicWrite(generatedPath, `${JSON.stringify({schemaVersion: 1, source: {mode: "fixture"}, document}, null, 2)}\n`);
    await removeOldResumes();
    await rm(resolve(root, "src/app/generated/githubProjects.json"), {force: true});
    console.warn("FIXTURE MODE: local verification only; no live GitHub synchronization or production content certification");
    return;
  }
  if (mode !== "github") throw new Error("PORTFOLIO_DATA_MODE must be github or fixture");
  const source = parse(await readFile(resolve(root, "scripts/github-source.json"), "utf8"), "github-source.json");
  const {snapshot, resume, discovery} = await syncPortfolio(source, process.env.PORTFOLIO_GH_TOKEN ?? "");
  if (resume) await atomicWrite(resolve(root, "public", resume.path), resume.bytes);
  await atomicWrite(generatedPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  await removeOldResumes(resume?.path);
  await rm(resolve(root, "src/app/generated/githubProjects.json"), {force: true});
  console.log(`GitHub owner: ${discovery.login} | pinned items returned: ${discovery.returned} | repositories after filtering: ${discovery.repositories.length}`);
  console.log(`GitHub pins in source order: ${snapshot.source.pinnedRepositories.join(", ") || "(none)"}`);
  snapshot.projects.forEach((project, index) => {
    const missing = missingOptionalMetadata(project.editorial);
    console.log(`${index + 1}. ${project.evidence.repository} | portfolio.json: ${project.editorial === null ? "missing; repository evidence fallback" : "present; validated"} | optional metadata absent: ${missing.join(", ") || "none"} | hidden: ${project.editorial?.hidden === true} | revision: ${project.evidence.revision}`);
  });
  console.log(`GitHub sync: ${snapshot.projects.length} pinned repositories, ${createPortfolioRepository(snapshot.document, {schemaVersion: 1, projects: snapshot.projects}).getPortfolio().projects.length} visible projects, portfolio revision ${snapshot.source.revision}`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => { console.error(`GitHub sync failed: ${error instanceof Error ? error.message : "unexpected synchronization failure"}`); process.exitCode = 1; });
}
