import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { spawnSync } from "node:child_process";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { validatePortfolioDocument } from "../src/app/application/portfolioContract.ts";
import { validatePortfolioMetadata } from "../src/app/application/repositoryContract.ts";
import { createPortfolioRepository } from "../src/app/application/portfolioRepository.ts";
import { PortfolioStore } from "../src/app/application/PortfolioStore.ts";
import { noAnalytics } from "../src/app/application/AnalyticsPort.ts";
import { discoverPins, missingOptionalMetadata, syncPortfolio } from "../scripts/sync-github.ts";

// Real-workflow coverage for the GitHub-backed content pipeline. Everything here is offline and synthetic:
// it exercises the same sync/validation/normalization code used in production, never live GitHub data.

const root = resolve(import.meta.dirname, "..");
const read = path => readFileSync(resolve(root, path), "utf8");
const fixture = JSON.parse(read("fixtures/portfolio.fixture.json"));
const realDocumentText = read("portfolio.json");
const realDocument = JSON.parse(realDocumentText);
const generatedSnapshot = resolve(root, "src/app/generated/githubPortfolio.json");

const OWNER = "fixture-owner";
const REVISION = "b".repeat(40);
const SECRET = "SYNTHETIC-SECRET-TOKEN-0123456789-must-not-leak";
const source = {owner: OWNER, repository: `${OWNER}/portfolio`};
const node = name => ({__typename: "Repository", name, nameWithOwner: `${OWNER}/${name}`, url: `https://github.com/${OWNER}/${name}`, description: `${name}.evidence`, defaultBranchRef: {name: "main"}, owner: {login: OWNER}});
const encoded = (value, path = "portfolio.json") => {const bytes = Buffer.from(JSON.stringify(value)); return {type: "file", encoding: "base64", path, size: bytes.length, content: bytes.toString("base64")};};

function productionDocument() {
  const document = structuredClone(fixture);
  document.fixture = false;
  document.projects = [];
  document.contact = {...document.contact, email: "owner@synthetic-owner.dev", calendly: "https://calendly.com/synthetic-owner/15min", socials: [{label: "Social", href: "https://social.synthetic-owner.dev/profile"}]};
  return document;
}

/** A synthetic GitHub: GraphQL pins plus repository, commit, README, portfolio.json and resume endpoints. */
function github({nodes = [], document, metadata = {}, intercept} = {}) {
  const calls = [];
  const request = async (input, init = {}) => {
    const url = new URL(input);
    calls.push({url, init});
    const forced = intercept?.(url, init);
    if (forced) return forced;
    if (url.pathname === "/graphql") return Response.json({data: {viewer: {login: OWNER}, user: {login: OWNER, pinnedItems: {nodes}}}});
    const [, , , name, kind, file] = url.pathname.split("/");
    if (!kind) return Response.json({name, full_name: `${OWNER}/${name}`, default_branch: "main", description: `${name}.evidence`, topics: [], language: null, archived: false});
    if (kind === "commits") return Response.json({sha: REVISION});
    if (kind === "readme") return new Response(null, {status: 404});
    if (kind === "contents" && file === "resume.pdf") return new Response(Buffer.from("%PDF-1.7 synthetic resume"));
    if (kind === "contents" && file === "portfolio.json") {
      if (name === "portfolio") return document === undefined ? new Response(null, {status: 404}) : Response.json(encoded(document));
      return metadata[name] === undefined ? new Response(null, {status: 404}) : Response.json(encoded(metadata[name]));
    }
    throw new Error(`Unexpected synthetic request ${url}`);
  };
  return {request, calls};
}

const storeFor = (document, projects) => new PortfolioStore(createPortfolioRepository(document, projects === undefined ? undefined : {schemaVersion: 1, projects}));
const storeFrom = ({snapshot}) => storeFor(snapshot.document, snapshot.projects);

// The unchanged presentation module, with motion and portals stubbed, exactly as in content-architecture.test.mjs.
const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(read("src/App.tsx").replaceAll("import.meta.env.BASE_URL", '"/"'), {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022}}).outputText;
const appModule = {exports: {}};
runInNewContext(compiled, {
  require: name => {
    if (name === "./useParallaxEngine") return {useScrollSceneEngine: () => {}};
    if (name === "./app/application/portfolioProjects") return {portfolioStore: storeFor(fixture)};
    if (name === "./app/application/AnalyticsPort") return {noAnalytics};
    if (name === "react-dom") return {createPortal: () => null};
    if (!["react", "react/jsx-runtime"].includes(name)) throw new Error(`Unexpected presentation dependency: ${name}`);
    return require(name);
  },
  module: appModule, exports: appModule.exports, document: {body: {}}, console,
});
const render = store => renderToStaticMarkup(React.createElement(appModule.exports.default, {store}));
const projectRows = html => (html.match(/class="project-row reveal"/g) ?? []).length;

async function captured(action) {
  const lines = [];
  const original = {log: console.log, warn: console.warn, error: console.error, info: console.info};
  for (const method of Object.keys(original)) console[method] = (...values) => lines.push(values.map(String).join(" "));
  try { return {result: await action(), lines}; }
  catch (error) { return {error, lines}; }
  finally { Object.assign(console, original); }
}

// --- Pinned repositories -------------------------------------------------------------------------------------

test("pin discovery requests at most six items and validates what comes back", async () => {
  let query = "";
  const api = nodes => ({graphql: async text => { query = text; return {viewer: {login: OWNER}, user: {login: OWNER, pinnedItems: {nodes}}}; }});
  const found = await discoverPins(source, api([{__typename: "Gist"}, node("project-b"), node("portfolio"), node("project-a")]));
  assert.match(query, /pinnedItems\(first: 6\)/);
  assert.match(query, /__typename/);
  assert.deepEqual(found, {login: OWNER, returned: 4, repositories: [`${OWNER}/project-b`, `${OWNER}/project-a`]});
  assert.deepEqual((await discoverPins(source, api([{__typename: "Gist"}]))).repositories, []);
  await assert.rejects(discoverPins(source, api(Array.from({length: 7}, (_, index) => node(`project-${index}`)))), /at most six/);
  await assert.rejects(discoverPins(source, api([node("project-a"), null])), /inaccessible\/null/);
  await assert.rejects(discoverPins(source, {graphql: async () => ({viewer: {login: "someone-else"}, user: {login: OWNER, pinnedItems: {nodes: []}}})}), /owner mismatch/);
});

test("an empty or non-repository pin set yields zero projects and an empty portfolio section", async () => {
  const server = github({nodes: [{__typename: "Gist"}], document: productionDocument()});
  const synchronized = await syncPortfolio(source, SECRET, server.request);
  assert.deepEqual(synchronized.snapshot.source.pinnedRepositories, []);
  assert.equal(synchronized.snapshot.projects.length, 0);
  assert.equal(synchronized.discovery.returned, 1);
  assert.equal(projectRows(render(storeFrom(synchronized))), 0);
});

// --- Project metadata ------------------------------------------------------------------------------------------

test("project portfolio.json requires its version, rejects unknown fields and keeps optional metadata optional", () => {
  assert.throws(() => validatePortfolioMetadata({}, "repo/portfolio.json"), /schemaVersion/);
  assert.throws(() => validatePortfolioMetadata({schemaVersion: 2}, "repo/portfolio.json"), /schemaVersion/);
  assert.throws(() => validatePortfolioMetadata({schemaVersion: 1, unsupported: true}, "repo/portfolio.json"), /unsupported/);
  assert.throws(() => validatePortfolioMetadata({schemaVersion: 1, title: ""}, "repo/portfolio.json"), /title/);
  assert.throws(() => validatePortfolioMetadata({schemaVersion: 1, visual: {kind: "unknown", label: "x"}}, "repo/portfolio.json"), /visual/);
  const sparse = validatePortfolioMetadata({schemaVersion: 1}, "repo/portfolio.json");
  assert.equal(missingOptionalMetadata(sparse).length, 13);
  assert.equal(missingOptionalMetadata(null).length, 13);
  const partial = {schemaVersion: 1, title: "title", visual: {kind: "nodes", label: "label"}};
  const absent = missingOptionalMetadata(partial);
  assert.ok(!absent.includes("title") && !absent.includes("visual"));
  assert.ok(absent.includes("summary") && absent.includes("narrative") && absent.includes("caseStudyContent"));
});

test("an invalid or incomplete project portfolio.json fails the synchronization with a source-specific error", async () => {
  const document = productionDocument();
  for (const [metadata, pattern] of [[{title: "no version"}, /schemaVersion/], [{schemaVersion: 1, narrative: {problem: "only a problem"}}, /narrative/], [{schemaVersion: 1, links: [{kind: "repository", label: "x", href: "http://insecure.invalid"}]}, /links\[0\]\.href/]]) {
    const server = github({nodes: [node("project-a")], document, metadata: {"project-a": metadata}});
    await assert.rejects(syncPortfolio(source, SECRET, server.request), pattern);
  }
});

test("hidden pinned repositories are retrieved and validated but never rendered, and pin order survives", async () => {
  const document = productionDocument();
  const metadata = {
    "project-a": {schemaVersion: 1, title: "project-a.title", summary: "a"},
    "project-secret": {schemaVersion: 1, title: "hidden.title", hidden: true},
    "project-b": {schemaVersion: 1, title: "project-b.title", summary: "b"},
  };
  const server = github({nodes: ["project-a", "project-secret", "project-b"].map(node), document, metadata});
  const synchronized = await syncPortfolio(source, SECRET, server.request);
  assert.deepEqual(synchronized.snapshot.source.pinnedRepositories, ["project-a", "project-secret", "project-b"].map(name => `${OWNER}/${name}`));
  assert.equal(synchronized.snapshot.projects.length, 3);
  const store = storeFrom(synchronized);
  assert.deepEqual(store.portfolio.projects.map(project => project.metadata.slug), ["project-a", "project-b"]);
  const html = render(store);
  assert.ok(!html.includes("hidden.title"));
  assert.ok(html.indexOf("project-a.title") < html.indexOf("project-b.title"));
  const invalid = github({nodes: [node("project-secret")], document, metadata: {"project-secret": {schemaVersion: 1, hidden: "yes"}}});
  await assert.rejects(syncPortfolio(source, SECRET, invalid.request), /hidden/);
});

// --- Portfolio-wide data and fixture safety -----------------------------------------------------------------

test("the checked-in root portfolio.json is real, production-valid, placeholder-free and free of phone numbers", async () => {
  const document = validatePortfolioDocument(realDocument);
  assert.equal(document.fixture, false);
  assert.deepEqual(document.projects, []);
  assert.equal(document.contact.calendly, "https://calendly.com/abinashanandab/15min");
  assert.ok(document.resume === null || document.resume.href === "/resume.pdf");
  for (const placeholder of [fixture.person.name, fixture.contact.email, "example.com", "example.invalid", "alex@"]) assert.ok(!realDocumentText.toLowerCase().includes(placeholder.toLowerCase()), placeholder);
  assert.ok(!/\+?\d[\d\s().-]{8,}\d/.test(realDocumentText), "contains a phone-number-like sequence");
  const synchronized = await syncPortfolio(source, SECRET, github({document: realDocument}).request);
  // The validator materialises absent optional keys as undefined; compare the serialized form the snapshot is written in.
  assert.deepEqual(JSON.parse(JSON.stringify(synchronized.snapshot.document)), realDocument);
});

test("production synchronization rejects fixture content and placeholder identity while development fixtures stay valid", async () => {
  assert.equal(validatePortfolioDocument(fixture).fixture, true);
  await assert.rejects(syncPortfolio(source, SECRET, github({document: fixture}).request), /fixture=true/);
  for (const [change, field] of [[doc => { doc.contact.email = "alex@example.com"; }, "contact.email"], [doc => { doc.contact.socials[0].href = "https://social.example.test/profile"; }, "contact.socials[0]"], [doc => { doc.contact.calendly = "https://calendly.example.com/someone/15min"; }, "contact.calendly"]]) {
    const document = productionDocument(); change(document);
    await assert.rejects(syncPortfolio(source, SECRET, github({document}).request), error => error.message.includes(field) && /reserved placeholder host/.test(error.message));
  }
});

test("missing or incomplete portfolio-wide data fails clearly instead of falling back", async () => {
  await assert.rejects(syncPortfolio(source, SECRET, github({}).request), /HTTP 404/);
  const incomplete = productionDocument(); delete incomplete.person.name;
  await assert.rejects(syncPortfolio(source, SECRET, github({document: incomplete}).request), /person\.name/);
  const legacy = productionDocument(); legacy.schemaVersion = 1;
  await assert.rejects(syncPortfolio(source, SECRET, github({document: legacy}).request), /schemaVersion/);
  await assert.rejects(syncPortfolio(source, SECRET, github({intercept: url => url.pathname === "/graphql" ? new Response(null, {status: 502}) : undefined}).request), /GitHub HTTP 502/);
});

test("the build entry point cannot be satisfied by a fixture or by a missing token", () => {
  const before = existsSync(generatedSnapshot) ? statSync(generatedSnapshot).mtimeMs : null;
  const run = environment => spawnSync(process.execPath, ["--experimental-strip-types", "scripts/sync-github.ts", "--production"], {cwd: root, encoding: "utf8", env: {...process.env, PORTFOLIO_GH_TOKEN: "", ...environment}});
  const fixtureRun = run({PORTFOLIO_DATA_MODE: "fixture"});
  assert.notEqual(fixtureRun.status, 0);
  assert.match(fixtureRun.stderr, /Production build requires GitHub mode/);
  const tokenless = run({PORTFOLIO_DATA_MODE: "github"});
  assert.notEqual(tokenless.status, 0);
  assert.match(tokenless.stderr, /PORTFOLIO_GH_TOKEN is required/);
  assert.equal(existsSync(generatedSnapshot) ? statSync(generatedSnapshot).mtimeMs : null, before, "a failed production run must not write or replace generated data");
});

// --- Token handling ---------------------------------------------------------------------------------------------

test("the token reaches only the Authorization header and never output, errors or generated data", async () => {
  const document = productionDocument(); document.resume = {label: "CV", href: "/resume.pdf"};
  const server = github({nodes: [node("project-a")], document, metadata: {"project-a": {schemaVersion: 1, title: "project-a.title"}}});
  const {result, lines, error} = await captured(() => syncPortfolio(source, SECRET, server.request));
  assert.equal(error, undefined);
  assert.ok(lines.length > 0, "the missing-metadata/README warnings should have been captured");
  assert.ok(!lines.join("\n").includes(SECRET));
  assert.ok(!JSON.stringify(result.snapshot).includes(SECRET));
  assert.ok(!result.resume.bytes.includes(SECRET));
  assert.ok(server.calls.length > 5);
  for (const {url, init} of server.calls) {
    assert.equal(url.origin, "https://api.github.com");
    assert.ok(!url.href.includes(SECRET) && !String(init.body ?? "").includes(SECRET));
    const headers = Object.entries(init.headers ?? {});
    assert.deepEqual(headers.filter(([, value]) => String(value).includes(SECRET)).map(([name]) => name), ["Authorization"]);
    assert.equal(init.redirect, "error");
  }
});

test("failures that echo the token upstream are reported without it", async () => {
  const document = productionDocument();
  const failures = {
    unauthorized: () => new Response("Bad credentials " + SECRET, {status: 401}),
    rateLimited: () => new Response("rate limit " + SECRET, {status: 403}),
    transport: () => { throw new Error(`socket hang up for ${SECRET}`); },
    graphqlErrors: url => url.pathname === "/graphql" ? Response.json({errors: [{message: SECRET}]}) : undefined,
  };
  for (const [name, fail] of Object.entries(failures)) {
    const server = github({nodes: [node("project-a")], document, intercept: (url, init) => name === "graphqlErrors" ? fail(url) : fail(url, init)});
    const {error, lines} = await captured(() => syncPortfolio(source, SECRET, server.request));
    assert.ok(error, name);
    assert.ok(!error.message.includes(SECRET) && !String(error.stack).includes(SECRET), `${name}: error leaks the token`);
    assert.ok(!lines.join("\n").includes(SECRET), `${name}: output leaks the token`);
  }
});

function walk(directory, visit) {
  for (const entry of readdirSync(directory, {withFileTypes: true})) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) walk(path, visit); else visit(path);
  }
}

test("nothing shipped to the browser can carry or request the token or GitHub", () => {
  const clientFiles = [];
  walk(resolve(root, "src"), path => { if (!path.includes(`${resolve(root, "src/app/generated")}`) && /\.(ts|tsx|css)$/.test(path)) clientFiles.push(path); });
  clientFiles.push(resolve(root, "index.html"));
  for (const path of clientFiles) {
    const text = readFileSync(path, "utf8");
    assert.ok(!/PORTFOLIO_GH_TOKEN|GITHUB_TOKEN|api\.github\.com|githubusercontent/i.test(text), `${path}: references the token or a GitHub API/raw host`);
    assert.ok(!/process\.env/.test(text), `${path}: reads process.env in client code`);
  }
  for (const layer of ["src/App.tsx", "src/app/application", "src/app/domain"]) {
    const paths = layer.endsWith(".tsx") ? [resolve(root, layer)] : readdirSync(resolve(root, layer)).map(name => resolve(root, layer, name));
    for (const path of paths) assert.ok(!/\bfetch\s*\(|XMLHttpRequest|EventSource|new WebSocket|sendBeacon/.test(readFileSync(path, "utf8")), `${path}: performs a network request`);
  }
  const config = read("vite.config.ts");
  assert.ok(!/envPrefix|loadEnv|\bdefine\s*:/.test(config), "vite.config.ts must not widen client-exposed environment variables");
  assert.ok(!/VITE_[A-Z_]*TOKEN/.test(`${config}${read("package.json")}${read(".env.example")}`.replace(/#[^\n]*/g, "")), "a token must never be given a VITE_ name");
  assert.match(read(".env.example"), /^PORTFOLIO_GH_TOKEN=$/m);
  assert.ok(!/^PORTFOLIO_GH_TOKEN=.+/m.test(read(".env.example")), ".env.example must not contain a value");
});

test("a built client bundle contains neither a token nor a GitHub API host", { skip: !existsSync(resolve(root, "dist")) && "no dist/ build present" }, () => {
  walk(resolve(root, "dist"), path => {
    if (!/\.(js|css|html|json|map|txt)$/.test(path)) return;
    const text = readFileSync(path, "utf8");
    assert.ok(!/PORTFOLIO_GH_TOKEN|api\.github\.com|githubusercontent/i.test(text), `${path}: GitHub API host or variable name in the client bundle`);
    assert.ok(!/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/.test(text), `${path}: token-shaped string in the client bundle`);
  });
});

test("rendering from synchronized data performs zero network requests", async () => {
  const synchronized = await syncPortfolio(source, SECRET, github({nodes: [node("project-a")], document: productionDocument(), metadata: {"project-a": {schemaVersion: 1, title: "project-a.title"}}}).request);
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error("the browser must not fetch"); };
  try { assert.ok(render(storeFrom(synchronized)).includes("project-a.title")); }
  finally { globalThis.fetch = original; }
  assert.equal(requests, 0);
});
