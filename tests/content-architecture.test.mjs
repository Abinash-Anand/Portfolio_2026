import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { validatePortfolioDocument, validateGeneratedPortfolio, validateRepositorySnapshot } from "../src/app/application/portfolioContract.ts";
import { validatePortfolioMetadata } from "../src/app/application/repositoryContract.ts";
import { createPortfolioRepository } from "../src/app/application/portfolioRepository.ts";
import { PortfolioStore } from "../src/app/application/PortfolioStore.ts";
import { noAnalytics, analyticsPayload } from "../src/app/application/AnalyticsPort.ts";
import { discoverPinnedRepositories, syncPortfolio } from "../scripts/sync-github.ts";
import * as stackLayout from "../src/stackLayout.ts";
import * as educationMotion from "../src/educationMotion.ts";

const root = resolve(import.meta.dirname, "..");
const fixture = JSON.parse(readFileSync(resolve(root, "fixtures/portfolio.fixture.json"), "utf8"));
const clone = () => structuredClone(fixture);
const storeFor = document => new PortfolioStore(createPortfolioRepository(document));
const require = createRequire(import.meta.url);
const appSource = readFileSync(resolve(root, "src/App.tsx"), "utf8");
const compiled = ts.transpileModule(appSource.replaceAll("import.meta.env.BASE_URL", '"/"'), {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022}}).outputText;
const module = {exports: {}};
const load = name => {
  if (name === "./useParallaxEngine") return {useScrollSceneEngine: () => {}};
  if (name === "./stackLayout") return stackLayout;
  if (name === "./educationMotion") return educationMotion;
  if (name === "./app/application/portfolioProjects") return {portfolioStore: storeFor(fixture)};
  if (name === "./app/application/AnalyticsPort") return {noAnalytics};
  if (name === "react-dom") return {createPortal: () => null};
  if (!["react", "react/jsx-runtime"].includes(name)) throw new Error(`Unexpected presentation dependency: ${name}`);
  return require(name);
};
runInNewContext(compiled, {require: load, module, exports: module.exports, document: {body: {}}, console});
const App = module.exports.default;
const render = document => renderToStaticMarkup(React.createElement(App, {store: storeFor(document)}));

function alternateDocument() {
  const document = clone();
  document.person = {name: "person.alternate", role: "role.alternate", location: "location.alternate", statement: "hero.alternate\nhero.second-line", summary: "summary.alternate", portrait: "/images/portrait.alternate.svg"};
  document.projects = ["project-beta", "project-alpha"].map((slug, index) => ({slug, metadata: {schemaVersion: 1, title: `${slug}.title`, summary: `${slug}.summary`, year: "year.alternate", role: "role.alternate", category: "category.alternate", stack: ["technology.alternate"], order: index, visual: {kind: "nodes", label: `${slug}.visual`}, narrative: {problem: `${slug}.problem`, constraints: `${slug}.constraints`, decision: `${slug}.decision`, result: `${slug}.result`, architecture: [`${slug}.node`]}}, repositoryUrl: null, liveUrl: null}));
  document.experience = [{id: "experience-alternate", company: "company.alternate", role: "role.alternate", period: "period.alternate", tech: "technology.alternate", description: "experience.alternate"}];
  document.technologies = [{label: "stack.alternate", items: [{name: "technology.alternate", usedIn: "project-beta.title"}]}];
  document.services = [{id: "service-alternate", title: "service.alternate", description: "capability.alternate"}];
  document.contact = {...document.contact, email: "contact@fixture.invalid", calendly: "https://calendly.com/fixture-owner/15min", headingLines: ["contact.alternate"], socials: [{label: "social.alternate", href: "https://example.invalid/social"}]};
  return document;
}

test("canonical JSON supplies every fixture narrative, visual and sparse case study", () => {
  assert.equal(validatePortfolioDocument(fixture).fixture, true);
  assert.equal("narratives" in fixture, false);
  const portfolio = storeFor(fixture).portfolio;
  for (const project of portfolio.projects) {
    const source = fixture.projects.find(item => item.slug === project.metadata.slug);
    assert.deepEqual(project.narrative, source.metadata.narrative);
    assert.deepEqual(project.visual, source.metadata.visual);
    assert.deepEqual(project.caseStudy, source.metadata.caseStudyContent);
  }
  assert.ok(portfolio.projects.some(project => project.caseStudy?.results.status === "not-documented"));
  assert.equal(existsSync(resolve(root, "src/app/content/caseStudies.ts")), false);
});

test("the unchanged React components render a structurally different portfolio", () => {
  const html = render(alternateDocument());
  for (const text of ["person.alternate", "hero.alternate", "hero.second-line", "portrait.alternate", "project-beta.title", "project-alpha.title", "company.alternate", "stack.alternate", "technology.alternate", "service.alternate", "contact@fixture.invalid", "contact.alternate", "social.alternate"]) assert.ok(html.includes(text), text);
  assert.ok(html.indexOf("project-beta.title") < html.indexOf("project-alpha.title"));
  assert.equal((html.match(/class="project-row reveal"/g) ?? []).length, 2);
  assert.ok(!html.includes(fixture.person.name));
  assert.ok(!html.includes(fixture.contact.email));
});

test("adding, removing, hiding and reordering fixture projects needs only data changes", () => {
  const document = alternateDocument();
  document.projects.reverse();
  document.projects.forEach((project, index) => { project.metadata.order = index; });
  assert.ok(render(document).indexOf("project-alpha.title") < render(document).indexOf("project-beta.title"));
  document.projects.pop();
  assert.equal((render(document).match(/class="project-row reveal"/g) ?? []).length, 1);
  const extra = structuredClone(document.projects[0]);
  extra.slug = "project-gamma"; extra.metadata.title = "project-gamma.title"; extra.metadata.order = 10;
  document.projects.push(extra);
  assert.ok(render(document).includes("project-gamma.title"));
  extra.metadata.hidden = true;
  assert.ok(!render(document).includes("project-gamma.title"));
  document.projects = [];
  assert.equal((render(document).match(/class="project-row reveal"/g) ?? []).length, 0);
});

test("project metadata validates structured content and fails explicitly", () => {
  const source = fixture.projects.find(project => project.metadata.caseStudyContent).metadata;
  assert.equal(validatePortfolioMetadata(source, "project/portfolio.json"), source);
  for (const change of [metadata => { metadata.narrative.problem = ""; }, metadata => { metadata.caseStudyContent.problem.paragraphs = []; }, metadata => { metadata.caseStudyContent.results.metrics = []; }, metadata => { metadata.caseStudyContent.results.status = "invented"; }, metadata => { metadata.caseStudy = {path: "case-study.json"}; }, metadata => { metadata.caseStudyContent.links = [{kind: "evidence", label: "evidence", href: "javascript:alert(1)"}]; }]) {
    const invalid = structuredClone(source); change(invalid);
    assert.throws(() => validatePortfolioMetadata(invalid, "project/portfolio.json"), /project\/portfolio.json/);
  }
  const document = clone();
  document.projects.find(project => project.metadata.caseStudyContent).metadata.caseStudyContent.projectSlug = "unrelated-project";
  assert.throws(() => validatePortfolioDocument(document), /must match its project slug/);
  const obsolete = clone(); obsolete.narratives = {};
  assert.throws(() => validatePortfolioDocument(obsolete), /narratives: is not supported/);
  const previousVersion = clone(); previousVersion.schemaVersion = 1;
  assert.throws(() => validatePortfolioDocument(previousVersion), /schemaVersion: must equal 2/);
});

test("structured evidence validates references, decisions and sourced metrics", () => {
  const metadata = {schemaVersion: 1, caseStudyContent: {projectSlug: "project-alpha", architecture: {paragraphs: ["architecture"], visualIds: ["flow"]}, technicalDecisions: [{id: "decision", title: "decision", decision: {paragraphs: ["decision"]}}], visuals: [{id: "flow", kind: "data-flow", description: "flow", nodes: [{id: "input", label: "input"}, {id: "output", label: "output"}], connections: [{from: "input", to: "output"}]}], results: {status: "documented", summary: {paragraphs: ["synthetic test result"]}, metrics: [{label: "test metric", value: 1, unit: "test unit", source: {kind: "evidence", label: "synthetic evidence", href: "https://example.invalid/evidence"}}]}}};
  validatePortfolioMetadata(metadata, "synthetic metadata");
  for (const change of [study => { study.visuals[0].connections[0].to = "missing"; }, study => { study.architecture.visualIds = ["missing"]; }, study => { study.technicalDecisions.push(structuredClone(study.technicalDecisions[0])); }, study => { delete study.results.metrics[0].source; }, study => { study.results.metrics[0].value = Infinity; }]) {
    const invalid = structuredClone(metadata); change(invalid.caseStudyContent);
    assert.throws(() => validatePortfolioMetadata(invalid, "synthetic metadata"));
  }
});

const revision = "a".repeat(40);
const source = {owner: "fixture-owner", repository: "fixture-owner/portfolio"};
const pinnedNode = name => ({__typename: "Repository", name, nameWithOwner: `fixture-owner/${name}`, url: `https://github.com/fixture-owner/${name}`, description: `${name}.evidence`, defaultBranchRef: {name: "main"}, owner: {login: "fixture-owner"}});
const file = (value, path = "portfolio.json") => {const bytes = Buffer.from(JSON.stringify(value)); return {type: "file", encoding: "base64", path, size: bytes.length, content: bytes.toString("base64")};};

test("GraphQL discovery filters unions and infrastructure, preserving pin order", async () => {
  const api = {graphql: async () => ({viewer: {login: source.owner}, user: {login: source.owner, pinnedItems: {nodes: [{__typename: "Gist"}, pinnedNode("project-beta"), pinnedNode("portfolio"), pinnedNode("project-alpha")]}}})};
  assert.deepEqual(await discoverPinnedRepositories(source, api), ["fixture-owner/project-beta", "fixture-owner/project-alpha"]);
});

test("offline synchronization consumes self-contained repository content without a registry", async () => {
  const document = alternateDocument(); document.fixture = false; document.projects = [];
  document.contact = {...document.contact, email: "contact@synthetic-owner.dev", calendly: "https://calendly.com/synthetic-owner/15min", socials: [{label: "social.alternate", href: "https://social.synthetic-owner.dev/profile"}]};
  const editorial = alternateDocument().projects.map(project => project.metadata);
  const metadataByName = new Map(alternateDocument().projects.map((project, index) => [project.slug, editorial[index]]));
  metadataByName.set("project-gamma", {schemaVersion: 1, title: "project-gamma.title", summary: "project-gamma.summary"});
  editorial[0].order = 999; editorial[1].order = 0;
  editorial[0].implementation = {lines: ["implementation.beta"], summary: "implementation.beta.summary"};
  editorial[0].caseStudyContent = {projectSlug: "project-beta", results: {status: "not-documented"}};
  let pins = ["project-beta", "project-alpha"];
  let invalid = false;
  let missingMetadata = false;
  let malformed = false;
  const calls = [];
  const request = async (input, options) => {
    const url = new URL(input); calls.push(url.pathname);
    if (url.pathname === "/graphql") {
      assert.ok(JSON.parse(options.body).query.includes("pinnedItems"));
      return Response.json({data: {viewer: {login: source.owner}, user: {login: source.owner, pinnedItems: {nodes: pins.map(pinnedNode)}}}});
    }
    const name = url.pathname.split("/")[3];
    if (url.pathname.endsWith(`/repos/${source.owner}/${name}`)) return Response.json({name, full_name: `${source.owner}/${name}`, default_branch: "main", description: `${name}.evidence`, topics: [], language: null, archived: false});
    if (url.pathname.endsWith("/commits/main")) return Response.json({sha: revision});
    if (url.pathname.endsWith("/readme")) return new Response(null, {status: 404});
    if (url.pathname.endsWith("/contents/portfolio.json")) {
      if (name === "portfolio") return Response.json(file(document));
      if (missingMetadata) return new Response(null, {status: 404});
      if (malformed) return Response.json({type: "file", encoding: "base64", path: "portfolio.json", size: 1, content: Buffer.from("{").toString("base64")});
      const metadata = metadataByName.get(name);
      assert.ok(metadata, `Unknown synthetic repository ${name}`);
      return Response.json(file(invalid ? {...metadata, narrative: {problem: 7}} : metadata));
    }
    throw new Error(`Unexpected synthetic request ${input}`);
  };
  const synchronized = await syncPortfolio(source, "synthetic-test-only", request);
  validateGeneratedPortfolio(synchronized.snapshot);
  const portfolio = new PortfolioStore(createPortfolioRepository(synchronized.snapshot.document, {schemaVersion: 1, projects: synchronized.snapshot.projects})).portfolio;
  assert.deepEqual(portfolio.projects.map(project => project.metadata.slug), pins);
  assert.equal(portfolio.projects[0].narrative.problem, editorial[0].narrative.problem);
  assert.equal(portfolio.projects[0].implementation.lines[0], "implementation.beta");
  assert.equal(portfolio.projects[0].caseStudy.projectSlug, "project-beta");
  assert.equal(portfolio.projects[0].visual.label, editorial[0].visual.label);
  const html = renderToStaticMarkup(React.createElement(App, {store: new PortfolioStore(createPortfolioRepository(synchronized.snapshot.document, {schemaVersion: 1, projects: synchronized.snapshot.projects}))}));
  assert.ok(html.includes(editorial[0].title) && html.includes(editorial[1].title));
  assert.ok(html.indexOf(editorial[0].title) < html.indexOf(editorial[1].title));
  assert.ok(!calls.some(path => path.endsWith("/users/fixture-owner/repos")));
  pins.reverse();
  const reordered = await syncPortfolio(source, "synthetic-test-only", request);
  assert.deepEqual(reordered.snapshot.source.pinnedRepositories, pins.map(name => `${source.owner}/${name}`));
  pins.pop();
  const removed = await syncPortfolio(source, "synthetic-test-only", request);
  assert.equal(removed.snapshot.projects.length, 1);
  pins.push("project-gamma");
  const added = await syncPortfolio(source, "synthetic-test-only", request);
  assert.deepEqual(added.snapshot.projects.map(project => project.slug), pins);
  missingMetadata = true;
  const missing = await syncPortfolio(source, "synthetic-test-only", request);
  assert.ok(missing.snapshot.projects.every(project => project.editorial === null));
  missingMetadata = false;
  malformed = true;
  await assert.rejects(syncPortfolio(source, "synthetic-test-only", request), /malformed JSON/);
  malformed = false;
  invalid = true;
  await assert.rejects(syncPortfolio(source, "synthetic-test-only", request), /narrative.problem/);
  assert.throws(() => validateRepositorySnapshot({schemaVersion: 1, projects: [{...synchronized.snapshot.projects[0], editorial: {...editorial[0], caseStudyContent: {projectSlug: "wrong-project"}}}]}), /must match its repository slug/);
});

test("fixtures cannot masquerade as generated production data", async () => {
  assert.throws(() => validateGeneratedPortfolio({schemaVersion: 1, source: {mode: "github", ...source, revision, pinnedRepositories: []}, document: fixture, projects: []}), /fixture/);
  let requests = 0;
  await assert.rejects(syncPortfolio(source, "", async () => {requests++; throw new Error("must not run");}), /PORTFOLIO_GH_TOKEN/);
  assert.equal(requests, 0);
});

test("missing repository metadata cannot inherit a same-slug fixture registry", () => {
  const document = clone();
  const slug = document.projects[0].slug;
  const imported = {schemaVersion: 1, projects: [{slug, editorial: null, readme: null, evidence: {repository: `${source.owner}/${slug}`, name: slug, description: null, url: `https://github.com/${source.owner}/${slug}`, defaultBranch: "main", revision, topics: [], language: null, archived: false}}]};
  const project = new PortfolioStore(createPortfolioRepository(document, imported)).portfolio.projects[0];
  assert.equal(project.metadata.title, slug);
  assert.equal(project.metadata.description, "summary");
  assert.equal(project.narrative.problem, "problem");
  assert.equal(project.caseStudy, undefined);
  assert.equal(project.readme, null);
});

test("contact and analytics remain generic and omit personal payloads", () => {
  const html = render(alternateDocument());
  assert.ok(html.includes('href="mailto:contact@fixture.invalid"'));
  assert.ok(html.includes('href="https://calendly.com/fixture-owner/15min"'));
  assert.ok(html.includes('target="_blank" rel="noopener noreferrer"'));
  assert.deepEqual(analyticsPayload({name: "contact_click", kind: "calendly", email: "contact@fixture.invalid"}), {kind: "calendly"});
});

test("application source contains no authored fixture identity or registry imports", () => {
  const prohibited = [fixture.person.name, fixture.contact.email, fixture.contact.calendly, fixture.person.summary, ...fixture.experience.flatMap(item => [item.company, item.description]), ...fixture.projects.flatMap(item => [item.slug, item.metadata.title, item.metadata.summary]), ...fixture.projects.filter(item => item.metadata.caseStudyContent?.results?.note).map(item => item.metadata.caseStudyContent.results.note)];
  function audit(directory) {
    for (const entry of readdirSync(directory, {withFileTypes: true})) {
      if (entry.name === "generated") continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {audit(path); continue;}
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      const source = readFileSync(path, "utf8");
      for (const value of prohibited) assert.ok(!source.toLowerCase().includes(value.toLowerCase()), `${path}: ${value}`);
      assert.ok(!/getFixtureCaseStudies|content\/caseStudies|content\/portfolioFixture/.test(source), path);
    }
  }
  audit(resolve(root, "src"));
  const authoredValues = [...prohibited, ...fixture.projects.flatMap(item => [item.metadata.year, item.metadata.role, ...item.metadata.stack]), ...fixture.experience.flatMap(item => [item.period, item.tech]), ...fixture.contact.socials.map(item => item.href)];
  const parsed = ts.createSourceFile("App.tsx", appSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function inspect(node) {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !ts.isImportDeclaration(node.parent)) {
      for (const value of authoredValues) assert.notEqual(node.text.toLowerCase(), value.toLowerCase(), `Authored literal in presentation: ${value}`);
    }
    ts.forEachChild(node, inspect);
  }
  inspect(parsed);
});
