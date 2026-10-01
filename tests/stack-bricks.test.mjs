import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createPortfolioRepository } from "../src/app/application/portfolioRepository.ts";
import { PortfolioStore } from "../src/app/application/PortfolioStore.ts";
import { noAnalytics } from "../src/app/application/AnalyticsPort.ts";
import * as stackLayout from "../src/stackLayout.ts";

// Engineering Stack brick wall: the layout is a pure function of the normalized technologies data, and the unchanged
// component renders whatever that data contains. Motion-policy checks guard the reveal model against regressions.

const { layoutStackTiles, stackGrids } = stackLayout;
const root = resolve(import.meta.dirname, "..");
const read = path => readFileSync(resolve(root, path), "utf8");
const fixture = JSON.parse(read("fixtures/portfolio.fixture.json"));
const realDocument = JSON.parse(read("portfolio.json"));
const css = read("src/index.css");
const appSource = read("src/App.tsx");

const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(appSource.replaceAll("import.meta.env.BASE_URL", '"/"'), {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022}}).outputText;
const appModule = {exports: {}};
const storeFor = document => new PortfolioStore(createPortfolioRepository(document));
runInNewContext(compiled, {
  require: name => {
    if (name === "./useParallaxEngine") return {useScrollSceneEngine: () => {}};
    if (name === "./stackLayout") return stackLayout;
    if (name === "./app/application/portfolioProjects") return {portfolioStore: storeFor(fixture)};
    if (name === "./app/application/AnalyticsPort") return {noAnalytics};
    if (name === "react-dom") return {createPortal: () => null};
    if (!["react", "react/jsx-runtime"].includes(name)) throw new Error(`Unexpected presentation dependency: ${name}`);
    return require(name);
  },
  module: appModule, exports: appModule.exports, document: {body: {}}, console,
});
const render = document => renderToStaticMarkup(React.createElement(appModule.exports.default, {store: storeFor(document)}));

/** The tiles in the rendered stack field, in document order. */
function renderedTiles(html) {
  const field = html.match(/<ul class="stack-field"[^>]*>([\s\S]*?)<\/ul>/)?.[1] ?? "";
  return [...field.matchAll(/<li class="stack-tile reveal" data-category="([^"]*)" style="([^"]*)"><button type="button"><small class="stack-tile-index">(\d+)<\/small><span class="stack-tile-name">([^<]*)<\/span>/g)]
    .map(([, category, style, number, name]) => ({category, name, number: Number(number), style}));
}
const withStack = groups => { const document = structuredClone(realDocument); document.technologies = groups; return document; };
const names = count => Array.from({length: count}, (_, index) => ({name: ["Go", "Docker", "TypeScript", "Kubernetes", "PostgreSQL", "Automated testing", "WebSockets", "CI / CD", "React", "Observability"][index % 10] + (index >= 10 ? ` ${index}` : ""), usedIn: `project ${index}`}));
const chunk = (items, size) => Array.from({length: Math.ceil(items.length / size)}, (_, index) => ({label: `category ${index + 1}`, items: items.slice(index * size, index * size + size)}));

// --- Layout ---------------------------------------------------------------------------------------------------------

function rows(tiles, key) {
  const result = []; let row = []; let total = 0;
  for (const tile of tiles) {
    row.push(tile); total += tile.spans[key];
    if (total === stackGrids[key].columns) { result.push(row); row = []; total = 0; }
    else assert.ok(total < stackGrids[key].columns, `a row of the ${key} grid overflows its columns`);
  }
  assert.equal(row.length, 0, `the ${key} grid ends with an incomplete row`);
  return result;
}

test("the layout fills every row of all three grids exactly, for any number of skills", () => {
  for (const count of [1, 2, 3, 4, 5, 7, 10, 13, 20, 30, 41, 80, 200]) {
    const tiles = layoutStackTiles(chunk(names(count), 6));
    assert.equal(tiles.length, count);
    for (const key of ["lg", "md", "sm"]) {
      rows(tiles, key);
      for (const tile of tiles) assert.ok(Number.isInteger(tile.spans[key]) && tile.spans[key] >= stackGrids[key].min, `${key} span of "${tile.name}" at ${count} skills`);
    }
  }
});

test("the layout is deterministic and preserves order, names, categories and references", () => {
  const groups = chunk(names(37), 8);
  assert.deepEqual(layoutStackTiles(groups), layoutStackTiles(structuredClone(groups)));
  const tiles = layoutStackTiles(groups);
  assert.deepEqual(tiles.map(tile => tile.name), groups.flatMap(group => group.items.map(item => item.name)));
  assert.deepEqual(tiles.map(tile => tile.category), groups.flatMap(group => group.items.map(() => group.label)));
  assert.deepEqual(tiles.map(tile => tile.usedIn), groups.flatMap(group => group.items.map(item => item.usedIn)));
  assert.deepEqual(tiles.map(tile => tile.index), tiles.map((_, index) => index));
});

test("tile widths follow the content and neighbouring rows are staggered like brickwork", () => {
  const tiles = layoutStackTiles(chunk(names(45), 10));
  const widest = Math.max(...tiles.map(tile => tile.spans.lg)), narrowest = Math.min(...tiles.map(tile => tile.spans.lg));
  assert.ok(widest > narrowest, "tiles must not all be the same size");
  const longest = tiles.filter(tile => tile.name.length > 12).map(tile => tile.spans.lg), shortest = tiles.filter(tile => tile.name.length <= 4).map(tile => tile.spans.lg);
  assert.ok(Math.min(...longest) >= Math.max(...shortest) - 1 && Math.max(...longest) > Math.max(...shortest), "long names must be allotted more width than short ones");
  for (const key of ["lg", "md"]) {
    const grid = rows(tiles, key);
    const seams = row => { let position = 0; return row.slice(0, -1).map(tile => (position += tile.spans[key])); };
    const clashes = grid.slice(1).reduce((total, row, index) => total + seams(row).filter(position => seams(grid[index]).includes(position)).length, 0);
    assert.ok(clashes <= Math.ceil(grid.length / 10), `${key}: ${clashes} aligned seams in ${grid.length} rows`);
  }
  const real = layoutStackTiles(realDocument.technologies);
  for (const key of ["lg", "md"]) {
    const grid = rows(real, key);
    const seams = row => { let position = 0; return row.slice(0, -1).map(tile => (position += tile.spans[key])); };
    grid.slice(1).forEach((row, index) => assert.deepEqual(seams(row).filter(position => seams(grid[index]).includes(position)), [], `${key}: rows ${index} and ${index + 1} of the real data share a seam`));
  }
});

test("very long skill names get wider tiles and never produce an overflowing row", () => {
  const tiles = layoutStackTiles([{label: "x", items: [{name: "A".repeat(60), usedIn: "u"}, {name: "Go", usedIn: "u"}, {name: "B".repeat(30), usedIn: "u"}]}]);
  rows(tiles, "lg"); rows(tiles, "md"); rows(tiles, "sm");
  assert.ok(tiles[0].spans.lg >= 5 && tiles[0].spans.sm === 2 && tiles[0].spans.md >= 4);
});

// --- Data-genericity through the unchanged component -----------------------------------------------------------------

test("the stack renders exactly the technologies in the data, with their categories, order and references", () => {
  const html = render(realDocument);
  const tiles = renderedTiles(html);
  const expected = realDocument.technologies.flatMap(group => group.items.map(item => ({category: group.label, name: item.name})));
  assert.equal(tiles.length, expected.length);
  assert.deepEqual(tiles.map(({category, name}) => ({category, name})), expected);
  assert.deepEqual(tiles.map(tile => tile.number), tiles.map((_, index) => index + 1));
  assert.deepEqual([...new Set(tiles.map(tile => tile.category))], realDocument.technologies.map(group => group.label));
  for (const item of realDocument.technologies.flatMap(group => group.items)) assert.ok(html.includes(`<b>${item.usedIn}</b>`), item.usedIn);
  assert.ok(!/class="stack-group/.test(html), "the former multi-column stack markup must be gone");
});

test("data-only changes to the stack change the field with no component change: add, remove, reorder, recategorise, scale", () => {
  const base = realDocument.technologies;
  const nameList = document => renderedTiles(render(document)).map(tile => `${tile.category}/${tile.name}`);
  const baseline = nameList(withStack(base));
  const added = structuredClone(base); added[0].items.push({name: "Added Technology", usedIn: "Added Project"});
  assert.deepEqual(nameList(withStack(added)), [...baseline.slice(0, base[0].items.length), `${base[0].label}/Added Technology`, ...baseline.slice(base[0].items.length)]);
  assert.ok(render(withStack(added)).includes("Added Project"));
  const removed = structuredClone(base); const [gone] = removed[1].items.splice(1, 1);
  assert.equal(nameList(withStack(removed)).length, baseline.length - 1);
  assert.ok(!nameList(withStack(removed)).includes(`${base[1].label}/${gone.name}`));
  const reordered = structuredClone(base); reordered[0].items.reverse();
  assert.deepEqual(nameList(withStack(reordered)).slice(0, base[0].items.length), [...baseline.slice(0, base[0].items.length)].reverse());
  const recategorised = structuredClone(base); const [moved] = recategorised[0].items.splice(0, 1); recategorised[2].items.unshift(moved);
  const result = renderedTiles(render(withStack(recategorised)));
  assert.equal(result.find(tile => tile.name === moved.name).category, base[2].label);
  const renamed = structuredClone(base); renamed[3].label = "Renamed Category";
  assert.ok(renderedTiles(render(withStack(renamed))).some(tile => tile.category === "Renamed Category"));
  for (const count of [10, 20, 30, 45, 80]) {
    const tiles = renderedTiles(render(withStack(chunk(names(count), 7))));
    assert.equal(tiles.length, count);
    assert.deepEqual(tiles.map(tile => tile.number), Array.from({length: count}, (_, index) => index + 1));
  }
  assert.equal(renderedTiles(render(withStack([]))).length, 0);
});

test("neither the component nor the layout contains a skill, category or project name", () => {
  const prohibited = new Set([...realDocument.technologies, ...fixture.technologies].flatMap(group => [group.label, ...group.items.flatMap(item => [item.name, item.usedIn])]).map(value => value.toLowerCase()));
  for (const path of ["src/App.tsx", "src/stackLayout.ts"]) {
    const parsed = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    (function inspect(node) {
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !ts.isImportDeclaration(node.parent)) assert.ok(!prohibited.has(node.text.toLowerCase()), `${path} hard-codes "${node.text}"`);
      ts.forEachChild(node, inspect);
    })(parsed);
  }
  assert.ok(!/^import .*(portfolio\.json|fixtures)/m.test(read("src/stackLayout.ts")));
});

// --- Motion policy ----------------------------------------------------------------------------------------------------

test("content layers carry no scroll-mapped opacity; only decorative and ambient layers may fade", () => {
  const decorative = /\b(hero-grid|hero-art|scroll-cue|project-overlay|contact-grid)\b/;
  const parsed = ts.createSourceFile("App.tsx", appSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const offenders = [];
  (function inspect(node, insideOverlayDetail) {
    const inDetail = insideOverlayDetail || (ts.isFunctionDeclaration(node) && ["ProjectDetail", "ArchitectureDiagram"].includes(node.name?.text));
    if (!inDetail && (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node))) {
      const attributes = Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(attribute => [attribute.name.text, attribute.initializer && ts.isStringLiteral(attribute.initializer) ? attribute.initializer.text : "(expression)"]));
      if ("data-opacity" in attributes && !decorative.test(attributes.className ?? "")) offenders.push(`${node.tagName.getText()}.${attributes.className}`);
    }
    ts.forEachChild(node, child => inspect(child, inDetail));
  })(parsed, false);
  assert.deepEqual(offenders, [], "page content must not fade with scroll position");
});

test("structural parallax travel is small, and no content layer scales or rotates with scroll", () => {
  const parsed = ts.createSourceFile("App.tsx", appSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const decorative = /\b(hero-grid|hero-art|scroll-cue|project-visual-backdrop|project-art-layer|project-overlay|contact-grid|detail-art-layer)\b/;
  const travel = [];
  (function inspect(node, inDetail) {
    const nowInDetail = inDetail || (ts.isFunctionDeclaration(node) && ["ProjectDetail", "ArchitectureDiagram"].includes(node.name?.text));
    if (!nowInDetail && (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node))) {
      const attributes = Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(attribute => [attribute.name.text, attribute.initializer && ts.isStringLiteral(attribute.initializer) ? attribute.initializer.text : null]));
      if ("data-scroll-layer" in attributes && !decorative.test(attributes.className ?? "")) {
        for (const axis of ["data-x", "data-y"]) if (attributes[axis]) travel.push([`${node.tagName.getText()}.${attributes.className}`, axis, Math.max(...attributes[axis].split(",").map(value => Math.abs(Number(value))))]);
        assert.ok(!attributes["data-scale"] && !attributes["data-rotate"], `${attributes.className}: a structural layer scales or rotates with scroll`);
      }
    }
    ts.forEachChild(node, child => inspect(child, nowInDetail));
  })(parsed, false);
  assert.ok(travel.length > 15, "expected the structural layers to be found");
  for (const [layer, axis, amount] of travel) assert.ok(amount <= 60, `${layer} ${axis} travels ${amount}px`);
  assert.ok(Math.max(...travel.map(entry => entry[2])) <= 60);
});

test("reveals are enter-triggered once; reduced motion and the capability hold state are covered by the stylesheet", () => {
  const engine = read("src/useParallaxEngine.ts");
  assert.match(engine, /reveals\.unobserve\(entry\.target\)/);
  assert.ok(!/classList\.remove\(["']is-visible["']\)/.test(engine + appSource), "a reveal must never be reversed");
  for (const selector of [".stack-tile.reveal", ".experience-row.reveal", ".reveal .contact-actions"]) assert.ok(css.includes(selector), selector);
  assert.match(css, /\.service-row\.is-selected::before/);
  assert.match(css, /cubic-bezier\(0\.16, 1, 0\.3, 1\)/);
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.reveal \*,\.reveal\{opacity:1!important/);
  assert.match(reduced, /\.stack-tile-name,\.stack-tile-ref\{transform:none!important\}/);
  // `.stack-tile-foot small{display:block}` outranks a bare `.stack-tile-ref`, so a bare display:none never applied and the
  // "Used in" label showed over the category in reduced motion (where `.reveal *` also forces opacity:1).
  const hide = ".stack-tile-foot .stack-tile-ref{display:none}";
  assert.equal(css.split(hide).length - 1, 2, "the reference is hidden at <=800px and in reduced motion with enough specificity");
  assert.ok(!css.replaceAll(hide, "").includes(".stack-tile-ref{display:none}"), "no hiding rule may use the bare, outranked selector");
  for (const forbidden of [/bounce|elastic|overshoot/i, /box-shadow/i, /border-radius:\s*(?!50%)\d/, /linear-gradient\([^)]*#[0-9a-f]{3,6}[^)]*(red|blue)/i]) assert.ok(!forbidden.test(css.slice(css.indexOf(".stack-field"), css.indexOf(".about {"))), `stack styles contain ${forbidden}`);
  assert.ok(!/lenis|locomotive|scroll-snap|wheel/i.test(css + engine + appSource), "native scrolling must stay untouched");
});

test("the capability row holds its inversion while its detail is open", () => {
  const document = structuredClone(realDocument);
  const html = render(document);
  assert.equal((html.match(/class="service-row reveal"/g) ?? []).length, document.services.length);
  assert.ok(/selected\?\.id === service\.id \? " is-selected" : ""/.test(appSource));
});
