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
import * as educationMotion from "../src/educationMotion.ts";

// Engineering Stack brick wall: the layout is a pure function of the normalized technologies data, and the unchanged
// component renders whatever that data contains. Motion-policy checks guard the reveal model against regressions.

const { layoutStackTiles, stackGrids, stackTileMotion } = stackLayout;
const { educationChapterMotion, educationIndicatorHeight, educationMarkerTravel } = educationMotion;
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
    if (name === "./educationMotion") return educationMotion;
    if (name === "./app/application/portfolioProjects") return {portfolioStore: storeFor(fixture)};
    if (name === "./app/application/AnalyticsPort") return {noAnalytics};
    if (name === "react-dom") return {createPortal: () => null};
    if (!["react", "react/jsx-runtime"].includes(name)) throw new Error(`Unexpected presentation dependency: ${name}`);
    return require(name);
  },
  module: appModule, exports: appModule.exports, document: {body: {}}, console,
});
const render = document => renderToStaticMarkup(React.createElement(appModule.exports.default, {store: storeFor(document)}));

/** The tiles in the rendered stack field, in document order. Matches each <li>'s own attributes and its index/name text
 * independently of the wrapper markup between them, so it survives presentational changes inside the tile. */
function renderedTiles(html) {
  const field = html.match(/<ul class="stack-field"[^>]*>([\s\S]*?)<\/ul>/)?.[1] ?? "";
  return [...field.matchAll(/<li class="stack-tile reveal"[^>]*>[\s\S]*?<\/li>/g)].map(([li]) => ({
    category: li.match(/data-category="([^"]*)"/)?.[1] ?? "",
    style: li.match(/style="([^"]*)"/)?.[1] ?? "",
    number: Number(li.match(/stack-tile-index">(\d+)</)?.[1]),
    name: li.match(/stack-tile-name">([^<]*)</)?.[1] ?? "",
  }));
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

// 2026-10-02 (this change): the "focused motion refinement" pass (c1e5452) removed all scroll-mapped opacity from
// structural content, leaving only a one-time enter reveal. The user explicitly asked for that depth restored across
// the whole flow (incoming sections settling in, previous sections subtly receding). Structural layers may again
// carry a 3-point data-opacity keyframe, composed multiplicatively with the unchanged one-time --reveal-opacity (see
// `.scroll-layer` in index.css), so a layer still only becomes visible once (never stranded, never replayed) and then
// continues to respond to scroll position for depth. This test now guards the *restraint* of that restoration instead
// of forbidding it outright: every structural opacity curve must rest at full visibility (middle keyframe === 1) and
// must never dip below a readable floor, so the effect stays "subtle" rather than causing content to disappear.
test("content layers may carry a subtle scroll-mapped opacity that settles at full visibility and never drops below a readable floor", () => {
  const decorative = /\b(hero-grid|hero-art|scroll-cue|project-overlay|contact-grid)\b/;
  const floor = 0.2;
  const parsed = ts.createSourceFile("App.tsx", appSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const structural = [];
  (function inspect(node, insideOverlayDetail) {
    // `Stack` is also exempted: its per-tile assembly keyframes are computed by the pure, deterministic
    // `stackTileMotion()` (stackLayout.ts) from each tile's own index/column, not hand-authored per element the
    // way every other structural layer is -- so the JSX attribute is necessarily a `{...}` expression, not a
    // literal. The same floor/resting-opacity invariants this test enforces are instead asserted directly against
    // `stackTileMotion()`'s output in "stack tile assembly motion stays within the structural travel/opacity
    // bounds" below, across the real tile set.
    // `EducationProgression` is also exempted: unlike every other reveal-style layer, its two chapters are a
    // genuine crossfade where one is legitimately more emphasized than the other at every point of the scroll
    // range -- resting at full opacity at the scene's midpoint isn't the invariant that protects it. The equivalent
    // floor/shape invariants are instead asserted directly against `educationChapterMotion()`'s output below.
    const inDetail = insideOverlayDetail || (ts.isFunctionDeclaration(node) && ["ProjectDetail", "ArchitectureDiagram", "Stack", "EducationProgression"].includes(node.name?.text));
    if (!inDetail && (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node))) {
      const attributes = Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(attribute => [attribute.name.text, attribute.initializer && ts.isStringLiteral(attribute.initializer) ? attribute.initializer.text : "(expression)"]));
      if ("data-opacity" in attributes && !decorative.test(attributes.className ?? "")) structural.push([`${node.tagName.getText()}.${attributes.className}`, attributes["data-opacity"]]);
    }
    ts.forEachChild(node, child => inspect(child, inDetail));
  })(parsed, false);
  assert.ok(structural.length > 10, "expected structural content layers configured with scroll-opacity to be found");
  for (const [layer, raw] of structural) {
    assert.notEqual(raw, "(expression)", `${layer}: data-opacity must be a static literal so it can be checked`);
    const frames = raw.split(",").map(Number);
    assert.equal(frames.length, 3, `${layer}: data-opacity must be a 3-point entry,middle,exit keyframe`);
    assert.ok(frames.every(Number.isFinite), `${layer}: data-opacity values must be numeric`);
    assert.equal(frames[1], 1, `${layer}: must rest at full opacity (middle keyframe) so revealed content is never stranded dim`);
    assert.ok(frames.every(frame => frame >= floor), `${layer}: opacity dips to ${Math.min(...frames)}, below the ${floor} readable floor`);
  }
});

test("structural parallax travel is small, and no content layer scales or rotates with scroll", () => {
  const parsed = ts.createSourceFile("App.tsx", appSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const decorative = /\b(hero-grid|hero-art|scroll-cue|project-visual-backdrop|project-art-layer|project-overlay|contact-grid|detail-art-layer)\b/;
  const travel = [];
  (function inspect(node, inDetail) {
    // See the matching note in the opacity test above: `Stack`'s per-tile keyframes are computed, not literal, and
    // are instead bounds-checked directly against `stackTileMotion()` below. `EducationProgression` is exempted for
    // the same reason as the opacity test above and is bounds-checked against `educationChapterMotion()` below.
    const nowInDetail = inDetail || (ts.isFunctionDeclaration(node) && ["ProjectDetail", "ArchitectureDiagram", "Stack", "EducationProgression"].includes(node.name?.text));
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

test("stack tile assembly motion stays within the structural travel/opacity bounds, for any tile count", () => {
  // `Stack` is exempted from the two generic structural-layer tests above (its keyframes are computed per tile,
  // not literal JSX attributes) -- this test enforces the exact same invariants directly against the pure
  // `stackTileMotion()` function instead: <=60px travel per axis, no scale/rotate (not even an attribute for it
  // exists), opacity resting at 1 with a >=0.2 floor, and a 3-point entry/middle/exit keyframe shape.
  const floor = 0.2;
  const real = layoutStackTiles(realDocument.technologies);
  assert.ok(real.length > 10, "expected the real stack to have enough tiles to meaningfully check");
  for (const tiles of [real, layoutStackTiles(chunk(names(45), 9)), layoutStackTiles(chunk(names(3), 2))]) {
    for (const tile of tiles) {
      const motion = stackTileMotion(tile);
      for (const [axis, raw] of [["x", motion.x], ["y", motion.y]]) {
        const frames = raw.split(",").map(Number);
        assert.equal(frames.length, 3, `tile ${tile.index} ${axis}: must be a 3-point entry,middle,exit keyframe`);
        assert.ok(frames.every(Number.isFinite), `tile ${tile.index} ${axis}: values must be numeric`);
        assert.equal(frames[1], 0, `tile ${tile.index} ${axis}: must rest at zero displacement (assembled) in the middle keyframe`);
        assert.ok(frames.every(frame => Math.abs(frame) <= 60), `tile ${tile.index} ${axis}: travels ${Math.max(...frames.map(Math.abs))}px, above the 60px structural ceiling`);
      }
      const opacityFrames = motion.opacity.split(",").map(Number);
      assert.equal(opacityFrames.length, 3, `tile ${tile.index} opacity: must be a 3-point entry,middle,exit keyframe`);
      assert.equal(opacityFrames[1], 1, `tile ${tile.index} opacity: must rest at full opacity`);
      assert.ok(opacityFrames.every(frame => frame >= floor), `tile ${tile.index} opacity dips to ${Math.min(...opacityFrames)}, below the ${floor} readable floor`);
    }
  }
  assert.ok(!("scale" in stackTileMotion(real[0])) && !("rotate" in stackTileMotion(real[0])), "stack tile motion must never include scale or rotate");
});

test("education chapter crossfade motion stays bounded, mirrors across the two chapters, and never settles both chapters equally dim", () => {
  // `EducationProgression` is exempted from the two generic structural-layer tests above for the reason noted there
  // -- this test enforces the equivalent invariants directly against the pure `educationChapterMotion()` function.
  const floor = 0.2;
  const foundation = educationChapterMotion(0);
  const depth = educationChapterMotion(1);
  for (const [role, motion] of [["foundation", foundation], ["depth", depth]]) {
    assert.ok(!("scale" in motion) && !("rotate" in motion), `${role}: education chapter motion must never include scale or rotate`);
    const opacityFrames = motion.opacity.split(",").map(Number);
    assert.equal(opacityFrames.length, 3, `${role} opacity: must be a 3-point entry,middle,exit keyframe`);
    assert.ok(opacityFrames.every(Number.isFinite), `${role} opacity: values must be numeric`);
    assert.ok(opacityFrames.every(frame => frame >= floor), `${role} opacity dips to ${Math.min(...opacityFrames)}, below the ${floor} readable floor`);
    assert.ok(opacityFrames.some(frame => frame >= 0.9), `${role}: must reach near-full opacity somewhere in its range, so it is never permanently dim`);
    const yFrames = motion.y.split(",").map(Number);
    assert.equal(yFrames.length, 3, `${role} y: must be a 3-point entry,middle,exit keyframe`);
    assert.ok(yFrames.every(frame => Math.abs(frame) <= 20), `${role} y travels ${Math.max(...yFrames.map(Math.abs))}px, above the small ceiling this subtle layer should use`);
  }
  // The two chapters must be true mirrors of each other -- one emphasized exactly where the other recedes -- not
  // independently authored curves that could drift out of sync with each other.
  const foundationOpacity = foundation.opacity.split(",").map(Number);
  const depthOpacityReversed = depth.opacity.split(",").map(Number).reverse();
  assert.deepEqual(foundationOpacity, depthOpacityReversed, "the depth chapter's opacity curve must be the exact mirror of the foundation chapter's");
  assert.equal(foundationOpacity[0], 1, "foundation must start fully emphasized (progress 0 = foundation active)");
  assert.equal(depth.opacity.split(",").map(Number)[2], 1, "depth must end fully emphasized (progress 1 = depth active)");

  const markerFrames = educationMarkerTravel.split(",").map(Number);
  assert.equal(markerFrames.length, 3, "education marker travel must be a 3-point entry,middle,exit keyframe");
  assert.equal(markerFrames[0], 0, "the progression marker starts at the foundation end of its track");
  assert.equal(markerFrames[2], educationIndicatorHeight, "the progression marker ends at the depth end of its track");
  assert.equal(markerFrames[1], educationIndicatorHeight / 2, "the progression marker passes the track's midpoint exactly halfway through the scroll range");
  assert.ok(educationIndicatorHeight > 0 && educationIndicatorHeight <= 220, "the progression indicator should stay a subtle, editorial-scale element, not a tall UI widget");
});

test("reveals are enter-triggered once; reduced motion and the capability hold state are covered by the stylesheet", () => {
  const engine = read("src/useParallaxEngine.ts");
  assert.match(engine, /reveals\.unobserve\(entry\.target\)/);
  assert.ok(!/classList\.remove\(["']is-visible["']\)/.test(engine + appSource), "a reveal must never be reversed");
  // Experience no longer participates in the shared enter-once `.reveal` system: it's a discrete, scroll-stepped
  // sequence (IntersectionObserver-driven active index, same technique as ProjectDetail's chapter progress) with
  // its own transition classes, not a one-time fade-in.
  for (const selector of [".stack-tile.reveal", ".reveal .contact-actions"]) assert.ok(css.includes(selector), selector);
  assert.ok(css.includes(".experience-panel.is-entered"), "experience panel uses its own enter transition, not .reveal");
  assert.match(css, /\.service-row\[data-selected\]::before/);
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
  assert.match(appSource, /data-selected=\{selected\?\.id === service\.id \? "" : undefined\}/);
});

test("service-row's className is never recomputed by selection, so React cannot clobber the engine's imperative reveal class", () => {
  // Regression test for a real bug: clicking a capability made its row permanently disappear (stuck at
  // opacity:0, via `.service-row.reveal{opacity:0}`) while remaining fully clickable. Root cause: the shared
  // reveal system marks an element visible with a raw `entry.target.classList.add("is-visible")`, entirely
  // outside React's own tracking of that element's className. `is-selected` used to be toggled by changing the
  // className *string* itself (a template literal with a conditional segment); the moment React saw that string
  // change for the clicked row, it wrote a brand-new `className` attribute, silently discarding whatever classes
  // were already on the live DOM node -- including "is-visible". Because the reveal observer unobserves an
  // element after firing once (by design: a reveal must never be reversed), it never came back. The fix:
  // className must never change based on selection; the selected state is carried by a separate `data-selected`
  // attribute instead, which React diffs independently and can never clobber a classList.
  assert.ok(!/className=\{`service-row reveal\$\{/.test(appSource), "service-row's className must not be a template literal with a conditional segment");
  assert.match(appSource, /className="service-row reveal"/, "service-row's className must be a static, unconditional string");
  assert.ok(!/\.service-row\.is-selected/.test(css), "no leftover class-based selector for service-row selection, which would be clobbered the same way");
});
