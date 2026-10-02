import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useScrollSceneEngine } from "./useParallaxEngine";
import { layoutStackTiles } from "./stackLayout";
import { portfolioStore, type PortfolioProjectView } from "./app/application/portfolioProjects";
import type { Portfolio, TechnicalVisualData, Capability } from "./app/domain/portfolioData";
import type { CaseStudy, CaseStudySection as CaseStudySectionData, CaseStudyVisual } from "./app/domain/caseStudy";
import type { PortfolioStore } from "./app/application/PortfolioStore";
import { noAnalytics, type AnalyticsPort } from "./app/application/AnalyticsPort";

type Project = PortfolioProjectView;
type PortfolioProps = { portfolio: Portfolio; analytics?: AnalyticsPort };

const motion = { fast: 200, normal: 350, medium: 500, slow: 800, cinematic: 1000 };
const useMotionSystem = useScrollSceneEngine;

function ScrollProgress() {
  return <div className="scroll-progress" aria-hidden="true" />;
}

function Cursor() {
  const cursor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = cursor.current;
    if (!node || !matchMedia("(pointer: fine)").matches) return;
    const over = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-cursor]");
      const label = target?.dataset.cursor || "";
      if (node.textContent !== label) {
        node.dataset.state = target ? "active" : "";
        node.textContent = label;
      }
    };
    document.addEventListener("mouseover", over);
    return () => {
      document.removeEventListener("mouseover", over);
    };
  }, []);
  return <div ref={cursor} className="cursor" aria-hidden="true" />;
}

function Navigation({ portfolio, analytics = noAnalytics }: PortfolioProps) {
  const [active, setActive] = useState<string>(portfolio.navigation.initialSection);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>("main section[id]")];
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && setActive(entry.target.id)),
      { rootMargin: "-35% 0px -55%" },
    );
    sections.forEach((section) => observer.observe(section));
    let pageRange = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    let lastDepth = 0;
    const onResize = () => { pageRange = Math.max(1, document.documentElement.scrollHeight - innerHeight); };
    const onScroll = () => {
      setScrolled(scrollY > 24);
      const percent = Math.min(100, Math.floor(scrollY / pageRange * 100));
      for (const depth of [25, 50, 75, 100] as const) {
        if (percent >= depth && lastDepth < depth) { lastDepth = depth; analytics.track({name: "scroll_depth", percent: depth}); }
      }
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onResize, { passive: true });
    return () => {
      observer.disconnect();
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onResize);
    };
  }, [analytics]);
  const links = portfolio.navigation.links;
  return (
    <header className={`nav ${scrolled ? "nav--scrolled" : ""}`}>
      <a className="wordmark" href="#top">{portfolio.person.name}</a>
      <nav aria-label={portfolio.navigation.label}>
        {links.map(({section: href, label}) => (
          <a key={href} className={active === href ? "active" : ""} href={`#${href}`}>{label}</a>
        ))}
      </nav>
      <a className="nav-contact" href={`#${portfolio.navigation.contact.section}`} onClick={() => analytics.track({name: "contact_click", kind: "navigation"})} data-cursor={portfolio.navigation.contact.cursor}>{`${portfolio.navigation.contact.label} `}<span>↘</span></a>
    </header>
  );
}

function SectionHeader({ index, eyebrow, title, note }: { index: string; eyebrow: string; title: string; note?: string }) {
  return (
    <header className="section-header reveal" data-scroll-scene>
      <div className="section-kicker reveal-label scroll-layer" data-scroll-layer data-y="8,0,-6" data-opacity="0.4,1,0.45"><span>{index}</span><span>{eyebrow}</span></div>
      <h2 className="reveal-heading scroll-layer type-parallax" data-scroll-layer data-y="14,0,-10" data-opacity="0.3,1,0.4" data-damping="0.15" data-phase="-0.015">{title}</h2>
      {note && <p className="section-note reveal-meta scroll-layer" data-scroll-layer data-y="10,0,-12" data-opacity="0.35,1,0.4" data-phase="-0.025">{note}</p>}
    </header>
  );
}

function TechnicalVisual({ visual, large = false }: { visual: TechnicalVisualData; large?: boolean }) {
  if (visual.kind === "pipeline") {
    return <div className={`tech-visual pipeline ${large ? "large" : ""}`}><i /><i /><i /><i /><span>{visual.labels[0]}</span><span>{visual.labels[1]}</span><span>{visual.labels[2]}</span></div>;
  }
  if (visual.kind === "radar") {
    return <div className={`tech-visual radar ${large ? "large" : ""}`}><i /><i /><i /><span className="radar-line" /><b>{visual.label}</b></div>;
  }
  if (visual.kind === "retrieval") {
    return <div className={`tech-visual retrieval ${large ? "large" : ""}`}><span>{visual.labels[0]}</span><i /><span>{visual.labels[1]}</span><i /><span>{visual.labels[2]}</span><i /><span>{visual.labels[3]}</span></div>;
  }
  return <div className={`tech-visual nodes ${large ? "large" : ""}`}><i /><i /><i /><i /><i /><span>{visual.label}</span></div>;
}

function Hero({ portfolio }: PortfolioProps) {
  return (
    <section className="hero" id="top" data-scroll-scene data-scene-origin="visible">
      <div className="hero-sticky">
        <div className="hero-grid scroll-layer" data-scroll-layer data-y="-45,0,85" data-scale="1.025,1,0.99" data-opacity="0.85,1,0.78" aria-hidden="true" />
        <div className="hero-meta scroll-layer" data-scroll-layer data-y="0,0,-20" data-opacity="1,1,0.4">
          <span>{portfolio.person.role}</span>
          <span>{portfolio.person.location}</span>
        </div>
        <h1 className="hero-title scroll-layer type-parallax" data-scroll-layer data-y="0,0,-40" data-opacity="1,1,0.3" data-damping="0.13" data-phase="-0.015">
          {portfolio.person.statement.split("\n").map((line) => <span key={line}>{line}</span>)}
        </h1>
        <p className="hero-summary scroll-layer" data-scroll-layer data-y="0,0,-60" data-opacity="1,1,0.25" data-damping="0.18" data-phase="-0.03">{portfolio.person.summary}</p>
        <div className="hero-art scroll-layer" data-scroll-layer data-y="-70,0,115" data-x="42,0,-36" data-scale="1.06,1,0.96" data-rotate="-1.2,0,1.4" data-opacity="0.48,0.78,0.38" data-pointer="18" data-damping="0.11" aria-hidden="true">
          <TechnicalVisual visual={portfolio.hero.visual} large />
        </div>
        <a className="scroll-cue scroll-layer" data-scroll-layer data-y="-10,0,-110" data-opacity="1,1,0" data-phase="0.03" href={`#${portfolio.hero.scrollCue.section}`}><span>{portfolio.hero.scrollCue.label}</span><span>↓</span></a>
      </div>
    </section>
  );
}

function MagneticButton({ children, className = "", ...props }: React.ComponentProps<"button">) {
  return <span className="magnetic-anchor"><button className={`magnetic ${className}`} {...props}>{children}</button></span>;
}

function DetailOverlay({ open, onClose, label, labels, children }: { open: boolean; onClose: () => void; label: string; labels: Portfolio["labels"]["overlay"]; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement;
    document.body.classList.add("overlay-open");
    const focusTimer = setTimeout(() => closeRef.current?.focus({ preventScroll: true }), motion.normal);
    const key = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    addEventListener("keydown", key);
    return () => {
      document.body.classList.remove("overlay-open");
      clearTimeout(focusTimer);
      removeEventListener("keydown", key);
      previous?.focus({ preventScroll: true });
    };
  }, [open, onClose]);
  return createPortal(
    <div className={`overlay ${open ? "open" : ""}`} role="dialog" aria-modal="true" aria-label={label} aria-hidden={!open}>
      <div className="overlay-bar"><span>{label}</span><MagneticButton ref={closeRef} className="close" onClick={onClose} aria-label={labels.closeAria}>{`${labels.close} `}<span>×</span></MagneticButton></div>
      <div className="overlay-scroll">{children}</div>
    </div>,
    document.body,
  );
}

function ArchitectureDiagram({ nodes, labels }: { nodes: readonly string[]; labels: Portfolio["projectDetail"]["architecture"] }) {
  const [active, setActive] = useState(nodes[0]);
  return (
    <div className="architecture">
      <div className="architecture-flow">
        {nodes.map((node, index) => (
          <div className="architecture-step scroll-layer" data-scroll-layer data-y={`${18 + index * 5},0,${-12 - index * 4}`} data-opacity={`${0.32 + index * 0.08},1,${0.6 - index * 0.05}`} data-phase={`${index * -0.02}`} key={node}>
            <button className={active === node ? "active" : ""} onMouseEnter={() => setActive(node)} onFocus={() => setActive(node)} onClick={() => setActive(node)}>
              <small>0{index + 1}</small>{node}
            </button>
            {index < nodes.length - 1 && <span aria-hidden="true">→</span>}
          </div>
        ))}
      </div>
      <p><span>{labels.activeLabel}</span>{active}{labels.descriptionSuffix}</p>
    </div>
  );
}

type GraphVisual = Extract<CaseStudyVisual, { kind: "architecture-diagram" | "request-flow" | "data-flow" | "component-map" | "deployment-topology" }>;

function CaseStudyDiagram({ visual, labels }: { visual: GraphVisual; labels: Portfolio["projectDetail"]["architecture"] }) {
  const [active, setActive] = useState<string | null>(null);
  const activeNode = visual.nodes.find((node) => node.id === active);
  const related = new Set(visual.connections.filter((connection) => connection.from === active || connection.to === active).flatMap((connection) => [connection.from, connection.to]));
  return (
    <div className="cs-diagram">
      <p className="cs-visual-caption">{visual.description}</p>
      <div className="cs-diagram-flow">
        {visual.nodes.map((node, index) => (
          <Fragment key={node.id}>
            <button
              className={`cs-diagram-node${active === node.id ? " active" : ""}${active && active !== node.id && !related.has(node.id) ? " muted" : ""}`}
              onMouseEnter={() => setActive(node.id)} onFocus={() => setActive(node.id)} onClick={() => setActive(node.id)}
            ><small>0{index + 1}</small>{node.label}</button>
            {index < visual.nodes.length - 1 && <span aria-hidden="true">→</span>}
          </Fragment>
        ))}
      </div>
      {visual.connections.length > 0 && (
        <ul className="cs-connections">
          {visual.connections.map((connection, index) => {
            const dimmed = active !== null && connection.from !== active && connection.to !== active;
            return (
              <li key={index} className={dimmed ? "muted" : active ? "lit" : ""}>
                <span>{visual.nodes.find((node) => node.id === connection.from)?.label ?? connection.from}</span>
                <b aria-hidden="true">→</b>
                <span>{visual.nodes.find((node) => node.id === connection.to)?.label ?? connection.to}</span>
                {connection.label && <small>{connection.label}</small>}
              </li>
            );
          })}
        </ul>
      )}
      {activeNode?.responsibility && <p className="cs-diagram-description"><span>{labels.activeLabel}</span>{activeNode.responsibility}</p>}
    </div>
  );
}

type CaseStudyLabels = NonNullable<Portfolio["projectDetail"]["caseStudyLabels"]>;
type CaseStudyDecisionData = NonNullable<CaseStudy["technicalDecisions"]>[number];

function CaseStudyParagraphs({ section }: { section: CaseStudySectionData }) {
  return <>{section.title && <h4>{section.title}</h4>}{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</>;
}

function CaseStudyField({ eyebrow, section }: { eyebrow: string; section: CaseStudySectionData }) {
  return <div className="cs-block"><p className="cs-eyebrow">{eyebrow}</p><CaseStudyParagraphs section={section} /></div>;
}

function CaseStudyDecision({ decision, index, labels }: { decision: CaseStudyDecisionData; index: number; labels: CaseStudyLabels }) {
  return (
    <div className="cs-decision">
      <span className="cs-decision-number">0{index + 1}</span>
      <div className="cs-decision-body">
        <h4>{decision.title}</h4>
        <div className="cs-block"><p className="cs-eyebrow">{labels.chosen}</p><CaseStudyParagraphs section={decision.decision} /></div>
        {decision.rationale && <CaseStudyField eyebrow={labels.rationale} section={decision.rationale} />}
        {decision.alternatives && decision.alternatives.length > 0 && (
          <div className="cs-block"><p className="cs-eyebrow">{labels.alternatives}</p>
            <ul className="cs-alternatives">{decision.alternatives.map((alternative, altIndex) => <li key={altIndex}><strong>{alternative.approach}</strong><span>{alternative.tradeOff}</span></li>)}</ul>
          </div>
        )}
        {decision.implementation && <CaseStudyParagraphs section={decision.implementation} />}
        {decision.learning && <CaseStudyParagraphs section={decision.learning} />}
      </div>
    </div>
  );
}

function CaseStudyLinks({ links, eyebrow }: { links: NonNullable<CaseStudy["links"]>; eyebrow: string }) {
  return (
    <div className="cs-block cs-links">
      <p className="cs-eyebrow">{eyebrow}</p>
      <ul>{links.map((link, index) => <li key={index}><a href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}>{`${link.label} ↗`}</a></li>)}</ul>
    </div>
  );
}

function CaseStudyResults({ results, labels }: { results: NonNullable<CaseStudy["results"]>; labels: CaseStudyLabels }) {
  if (results.status === "not-documented") return <div className="cs-results"><p className="cs-note">{results.note ?? labels.undocumentedResult}</p></div>;
  return (
    <div className="cs-results">
      <CaseStudyParagraphs section={results.summary} />
      {results.metrics && results.metrics.length > 0 && (
        <div className="cs-block"><p className="cs-eyebrow">{labels.metrics}</p>
          <ul className="cs-metrics">{results.metrics.map((metric, index) => <li key={index}><b>{metric.value}</b><span>{metric.unit}</span><small>{metric.label}</small></li>)}</ul>
        </div>
      )}
      {results.links && results.links.length > 0 && <CaseStudyLinks links={results.links} eyebrow={labels.links} />}
    </div>
  );
}

function CaseStudyVisualBlock({ visual, architectureLabels }: { visual: CaseStudyVisual; architectureLabels: Portfolio["projectDetail"]["architecture"] }) {
  if (visual.kind === "code-excerpt") return <div className="cs-visual"><p className="cs-visual-caption">{visual.description}</p><pre className="cs-code"><code>{visual.code}</code></pre></div>;
  if (visual.kind === "terminal-excerpt") return <div className="cs-visual"><p className="cs-visual-caption">{visual.description}</p><pre className="cs-code">{visual.commands.map((command, index) => <Fragment key={index}>{`$ ${command}`}{"\n"}</Fragment>)}{visual.output}</pre></div>;
  if (visual.kind === "ui-evidence") return <div className="cs-visual"><img className="cs-visual-image" src={visual.assetPath} alt={visual.alt} />{visual.caption && <p className="cs-visual-caption">{visual.caption}</p>}</div>;
  if (visual.kind === "sequence-flow") return (
    <div className="cs-visual">
      <p className="cs-visual-caption">{visual.description}</p>
      <ul className="cs-connections">{visual.steps.map((step, index) => <li key={index}><span>{visual.participants.find((participant) => participant.id === step.from)?.label ?? step.from}</span><b aria-hidden="true">→</b><span>{visual.participants.find((participant) => participant.id === step.to)?.label ?? step.to}</span>{step.message}</li>)}</ul>
    </div>
  );
  return <CaseStudyDiagram visual={visual} labels={architectureLabels} />;
}

function TechnicalSurface({ stack, label }: { stack: readonly string[]; label: string }) {
  return (
    <div className="cs-surface">
      <p className="cs-eyebrow">{label}</p>
      <ul>{stack.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}

function evidenceSplit(text: string): { lead: string; rest: string } | null {
  const match = /^(\S+)\s+(.+)$/.exec(text);
  return match && /^[\d+]/.test(match[1]) ? { lead: match[1], rest: match[2] } : null;
}

function EvidenceGrid({ items }: { items: readonly string[] }) {
  return (
    <ul className="cs-evidence-grid">
      {items.map((item, index) => {
        const split = evidenceSplit(item);
        return <li key={index}>{split ? <><b>{split.lead}</b><span className="cs-evidence-caption">{split.rest}</span></> : <span className="cs-evidence-plain">{item}</span>}</li>;
      })}
    </ul>
  );
}

function ProjectDetail({ project, detail, labels }: { project: Project; detail: Portfolio["projectDetail"]; labels: Portfolio["labels"] }) {
  const caseStudy = project.caseStudy;
  const cs = detail.caseStudyLabels;
  const detailRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const storySteps = detail.storySteps;
  useEffect(() => {
    const detail = detailRef.current;
    const root = detail?.closest(".overlay-scroll");
    if (!detail || !root) return;
    const sections = [...detail.querySelectorAll<HTMLElement>("[data-story-step]")];
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveStep(Number((entry.target as HTMLElement).dataset.storyStep));
      }),
      { root, rootMargin: "-32% 0px -54%", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [project]);
  const overviewParagraphs = caseStudy?.overview?.paragraphs;
  const overviewLede = overviewParagraphs?.[0] ?? project.metadata.description;
  const overviewRest = overviewParagraphs?.slice(1) ?? [];
  const constraintItems = caseStudy?.constraints && caseStudy.constraints.length > 0 ? caseStudy.constraints : null;
  const graphVisuals = caseStudy?.visuals?.filter((visual): visual is GraphVisual => ["architecture-diagram", "request-flow", "data-flow", "component-map", "deployment-topology"].includes(visual.kind)) ?? [];
  const otherVisuals = caseStudy?.visuals?.filter((visual) => !graphVisuals.includes(visual as GraphVisual)) ?? [];
  return (
    <article className="project-detail" ref={detailRef} data-active-step={activeStep}>
      <header className="detail-intro" data-scroll-scene>
        <p className="detail-kicker scroll-layer" data-scroll-layer data-y="16,0,-12" data-opacity="0.35,1,0.45">{project.metadata.kicker ?? project.metadata.category}</p>
        <h2 className="detail-title scroll-layer type-parallax" data-scroll-layer data-y="60,0,-70" data-scale="0.97,1,0.95" data-opacity="0.18,1,0.28" data-phase="-0.01">{project.metadata.title}</h2>
        <p className="detail-summary scroll-layer" data-scroll-layer data-y="40,0,-55" data-opacity="0.12,1,0.22" data-phase="-0.02">{project.metadata.description}</p>
        <div className="detail-meta-row scroll-layer" data-scroll-layer data-y="20,0,-30" data-opacity="0.2,1,0.3" data-phase="-0.03"><span>{project.metadata.year}</span><span>{project.metadata.role}</span></div>
      </header>
      <div className="detail-art" data-scroll-scene><div className="detail-art-layer scroll-layer" data-scroll-layer data-y="90,0,-90" data-scale="1.08,1,1.06" data-opacity="0.25,1,0.35"><TechnicalVisual visual={project.visual} large /></div></div>
      <div className="detail-body">
        <nav className="case-progress" aria-label={labels.caseProgressAria}>
          {storySteps.map((step, index) => <span className={activeStep === index ? "active" : ""} key={step}><b>0{index + 1}</b>{step}</span>)}
        </nav>
        <div className="detail-chapters">

          <section data-story-step="0" data-scroll-scene>
            <p className="chapter-label scroll-layer" data-scroll-layer data-y="18,0,-14" data-opacity="0.3,1,0.4">{detail.sectionLabels[0]}</p>
            {cs && <p className="chapter-question scroll-layer" data-scroll-layer data-y="16,0,-13" data-opacity="0.3,1,0.4" data-phase="-0.01">{cs.questions[0]}</p>}
            <h3 className="chapter-statement scroll-layer type-parallax" data-scroll-layer data-y="38,0,-30" data-opacity="0.15,1,0.3" data-phase="-0.02">{overviewLede}</h3>
            {overviewRest.length > 0 && <div className="chapter-explanation scroll-layer" data-scroll-layer data-y="32,0,-25" data-opacity="0.18,1,0.3" data-phase="-0.03">{overviewRest.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>}
            {cs && (
              <div className="cs-evidence-row scroll-layer" data-scroll-layer data-y="36,0,-28" data-opacity="0.2,1,0.3" data-phase="-0.04">
                <div><p className="cs-evidence-value">{project.metadata.category}</p><p className="cs-evidence-label">{cs.category}</p></div>
                <div><p className="cs-evidence-value">{project.metadata.role}</p><p className="cs-evidence-label">{cs.role}</p></div>
              </div>
            )}
            {caseStudy?.role && cs && <div className="scroll-layer" data-scroll-layer data-y="30,0,-24" data-opacity="0.2,1,0.3" data-phase="-0.05"><CaseStudyField eyebrow={cs.role} section={caseStudy.role} /></div>}
          </section>

          <section data-story-step="1" data-scroll-scene>
            <p className="chapter-label scroll-layer" data-scroll-layer data-y="18,0,-14" data-opacity="0.3,1,0.4">{detail.sectionLabels[1]}</p>
            {cs && <p className="chapter-question scroll-layer" data-scroll-layer data-y="16,0,-13" data-opacity="0.3,1,0.4" data-phase="-0.01">{cs.questions[1]}</p>}
            <h3 className="chapter-statement scroll-layer type-parallax" data-scroll-layer data-y="38,0,-30" data-opacity="0.15,1,0.3" data-phase="-0.02">{project.narrative.problem}</h3>
            {caseStudy?.problem && <div className="chapter-explanation scroll-layer" data-scroll-layer data-y="32,0,-25" data-opacity="0.18,1,0.3" data-phase="-0.03"><CaseStudyParagraphs section={caseStudy.problem} /></div>}
            <div className="cs-split-row scroll-layer" data-scroll-layer data-y="36,0,-28" data-opacity="0.2,1,0.3" data-phase="-0.04">
              {caseStudy?.context && cs && <div className="cs-split-col"><p className="cs-eyebrow">{cs.context}</p><CaseStudyParagraphs section={caseStudy.context} /></div>}
              <div className="cs-split-col">
                <p className="cs-eyebrow">{detail.decisionLabels[1]}</p>
                {constraintItems ? constraintItems.map((constraint, index) => <CaseStudyParagraphs key={index} section={constraint} />) : <p>{project.narrative.constraints}</p>}
              </div>
            </div>
          </section>

          <section data-story-step="2" data-scroll-scene>
            <p className="chapter-label scroll-layer" data-scroll-layer data-y="18,0,-14" data-opacity="0.3,1,0.4">{detail.sectionLabels[1]}</p>
            {cs && <p className="chapter-question scroll-layer" data-scroll-layer data-y="16,0,-13" data-opacity="0.3,1,0.4" data-phase="-0.01">{cs.questions[2]}</p>}
            <p className="chapter-explanation-inline scroll-layer" data-scroll-layer data-y="30,0,-24" data-opacity="0.18,1,0.3" data-phase="-0.02">{project.narrative.decision}</p>
            <ArchitectureDiagram nodes={project.narrative.architecture} labels={detail.architecture} />
            {graphVisuals.map((visual) => <div className="scroll-layer" data-scroll-layer data-y="40,0,-30" data-opacity="0.18,1,0.3" key={visual.id}><CaseStudyDiagram visual={visual} labels={detail.architecture} /></div>)}
            {otherVisuals.map((visual) => <div className="scroll-layer" data-scroll-layer data-y="40,0,-30" data-opacity="0.18,1,0.3" key={visual.id}><CaseStudyVisualBlock visual={visual} architectureLabels={detail.architecture} /></div>)}
            {caseStudy?.architecture && <div className="cs-architecture-detail scroll-layer" data-scroll-layer data-y="34,0,-27" data-opacity="0.2,1,0.3" data-phase="-0.03"><CaseStudyParagraphs section={caseStudy.architecture} /></div>}
          </section>

          <section className="implementation" data-story-step="3" data-scroll-scene>
            <p className="chapter-label scroll-layer" data-scroll-layer data-y="18,0,-14" data-opacity="0.3,1,0.4">{detail.sectionLabels[2]}</p>
            {cs && <p className="chapter-question scroll-layer" data-scroll-layer data-y="16,0,-13" data-opacity="0.3,1,0.4" data-phase="-0.01">{cs.questions[3]}</p>}
            {caseStudy?.implementation && <div className="chapter-explanation scroll-layer" data-scroll-layer data-y="32,0,-25" data-opacity="0.18,1,0.3" data-phase="-0.02"><CaseStudyParagraphs section={caseStudy.implementation} /></div>}
            <div className="cs-code-block scroll-layer" data-scroll-layer data-y="30,0,-24" data-opacity="0.2,1,0.3" data-phase="-0.03"><code>{project.implementation.lines.map((line, index) => <Fragment key={index}>{line}{index < project.implementation.lines.length - 1 && <br />}</Fragment>)}</code><p>{project.implementation.summary}</p></div>
            {project.metadata.stack.length > 0 && cs && <div className="scroll-layer" data-scroll-layer data-y="28,0,-22" data-opacity="0.2,1,0.3" data-phase="-0.04"><TechnicalSurface stack={project.metadata.stack} label={cs.technicalSurface} /></div>}
            {caseStudy?.technicalDecisions && caseStudy.technicalDecisions.length > 0 && cs && (
              <div className="cs-decisions scroll-layer" data-scroll-layer data-y="34,0,-27" data-opacity="0.15,1,0.3" data-phase="-0.05">
                <p className="cs-eyebrow">{cs.decisions}</p>
                {caseStudy.technicalDecisions.map((decision, index) => <CaseStudyDecision key={decision.id} decision={decision} index={index} labels={cs} />)}
              </div>
            )}
          </section>

          <section className="result-chapter" data-story-step="4" data-scroll-scene>
            <p className="chapter-label scroll-layer" data-scroll-layer data-y="18,0,-14" data-opacity="0.3,1,0.4">{detail.sectionLabels[3]}</p>
            {cs && <p className="chapter-question scroll-layer" data-scroll-layer data-y="16,0,-13" data-opacity="0.3,1,0.4" data-phase="-0.01">{cs.questions[4]}</p>}
            <p className="result-statement scroll-layer" data-scroll-layer data-y="90,0,-45" data-scale="0.97,1,0.98" data-opacity="0.08,1,0.35" data-phase="-0.02">{project.narrative.result}</p>
            {project.metadata.highlights && project.metadata.highlights.length > 0 && <div className="scroll-layer" data-scroll-layer data-y="34,0,-27" data-opacity="0.2,1,0.3" data-phase="-0.03"><EvidenceGrid items={project.metadata.highlights} /></div>}
            {caseStudy?.results && cs && <div className="scroll-layer" data-scroll-layer data-y="30,0,-24" data-opacity="0.2,1,0.3" data-phase="-0.04"><CaseStudyResults results={caseStudy.results} labels={cs} /></div>}
            {caseStudy?.learnings && caseStudy.learnings.length > 0 && cs && (
              <div className="cs-block cs-learnings scroll-layer" data-scroll-layer data-y="30,0,-24" data-opacity="0.18,1,0.3" data-phase="-0.05"><p className="cs-eyebrow">{cs.learnings}</p>
                {caseStudy.learnings.map((learning, index) => <CaseStudyParagraphs key={index} section={learning} />)}
              </div>
            )}
            {caseStudy?.links && caseStudy.links.length > 0 && cs && <div className="scroll-layer" data-scroll-layer data-y="28,0,-22" data-opacity="0.18,1,0.3" data-phase="-0.06"><CaseStudyLinks links={caseStudy.links} eyebrow={cs.links} /></div>}
          </section>

        </div>
      </div>
    </article>
  );
}

function ProjectRow({ project, index, onOpen, labels }: { project: Project; index: number; onOpen: () => void; labels: Portfolio["labels"] }) {
  const visualTravel = [44, 52, 48, 58][index % 4];
  return (
    <button className="project-row reveal" onClick={onOpen} data-cursor={labels.projectCursor}>
      <span className="project-index scroll-layer" data-scroll-layer data-y="6,0,-8" data-opacity="0.35,1,0.45">0{index + 1}</span>
      <span className="project-copy scroll-layer" data-scroll-layer data-y="12,0,-10" data-opacity="0.3,1,0.4" data-phase="-0.015"><span className="project-title">{project.metadata.title}</span><span className="project-description">{project.metadata.description}</span><span className="project-cta">{`${labels.projectCta} `}<b>↗</b></span></span>
      <span className="project-meta scroll-layer" data-scroll-layer data-y="8,0,-10" data-opacity="0.3,1,0.35" data-phase="-0.03"><span>{project.metadata.category}</span><span>{project.metadata.year}</span></span>
      <span className="project-visual">
        <span className="project-visual-backdrop scroll-layer" data-scroll-layer data-y={`${-visualTravel * 0.35},0,${visualTravel * 0.35}`} data-scale="1.08,1.04,1.08" aria-hidden="true" />
        <span className="project-art-layer scroll-layer" data-scroll-layer data-y={`${visualTravel},0,${-visualTravel}`} data-x="22,0,-18" data-scale="1.1,1.04,1.1" data-rotate="-1,0,1"><TechnicalVisual visual={project.visual} /></span>
        <span className="project-overlay scroll-layer" data-scroll-layer data-y={`${visualTravel * 1.35},0,${-visualTravel * 1.35}`} data-x="-18,0,24" data-opacity="0.15,0.55,0.12" aria-hidden="true"><i /><b>{labels.projectVisualPrefix}{index + 1}</b></span>
      </span>
    </button>
  );
}

function Projects({ portfolio, analytics = noAnalytics }: PortfolioProps) {
  const [selected, setSelected] = useState<Project | null>(null);
  return (
    <section className="projects page-section" id="work" data-scroll-scene>
      <SectionHeader {...portfolio.sections.projects} />
      <div className="project-list">
        {portfolio.projects.map((project, index) => <div className="project-track" data-scroll-scene key={project.metadata.slug}><ProjectRow project={project} index={index} onOpen={() => {setSelected(project); analytics.track({name: "project_open", projectIndex: index});}} labels={portfolio.labels} /></div>)}
      </div>
      <DetailOverlay open={!!selected} onClose={() => setSelected(null)} label={portfolio.labels.projectOverlay} labels={portfolio.labels.overlay}>
        {selected && <ProjectDetail project={selected} detail={portfolio.projectDetail} labels={portfolio.labels} />}
      </DetailOverlay>
    </section>
  );
}

function Experience({ portfolio }: PortfolioProps) {
  const [selected, setSelected] = useState<(typeof portfolio.experience)[number] | null>(null);
  return (
    <section className="experience page-section" id="experience" data-scroll-scene>
      <SectionHeader {...portfolio.sections.experience} />
      <div className="experience-list reveal-content">
        {portfolio.experience.map((item, index) => (
          <button key={item.id} className="experience-row reveal" data-scroll-scene onClick={() => setSelected(item)} data-cursor={portfolio.labels.experienceCursor}>
            <span className="scroll-layer" data-scroll-layer data-x="-4,0,2" data-opacity="0.55,1,0.6">0{index + 1}</span>
            <strong className="scroll-layer" data-scroll-layer data-x="-6,0,3" data-opacity="0.4,1,0.5" data-phase="-0.01">{item.company}</strong>
            <span className="scroll-layer" data-scroll-layer data-y="5,0,-3" data-opacity="0.5,1,0.55" data-phase="-0.02">{item.role}</span>
            <span className="scroll-layer" data-scroll-layer data-y="4,0,-3" data-opacity="0.5,1,0.55" data-phase="-0.025">{item.tech}</span>
            <span className="scroll-layer" data-scroll-layer data-x="4,0,-3" data-opacity="0.55,1,0.6" data-phase="-0.03">{item.period}</span><b>↗</b>
          </button>
        ))}
      </div>
      <DetailOverlay open={!!selected} onClose={() => setSelected(null)} label={portfolio.labels.experienceOverlay} labels={portfolio.labels.overlay}>
        {selected && <article className="simple-detail"><span>{selected.period}</span><h2>{selected.company}</h2><h3>{selected.role}</h3><p>{selected.description}</p>{selected.story && <div className="simple-detail-story">{selected.story.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>}<div><small>{portfolio.labels.experienceTechnologies}</small>{selected.tech}</div></article>}
      </DetailOverlay>
    </section>
  );
}

function Stack({ portfolio }: PortfolioProps) {
  const tiles = layoutStackTiles(portfolio.technologies);
  return (
    <section className="stack page-section" id="stack" data-scroll-scene>
      <SectionHeader {...portfolio.sections.stack} />
      <ul className="stack-field" aria-label={portfolio.sections.stack.eyebrow}>
        {tiles.map((tile) => (
          <li key={tile.index} className="stack-tile reveal" data-category={tile.category} style={{ "--span-lg": tile.spans.lg, "--span-md": tile.spans.md, "--span-sm": tile.spans.sm, "--tile-col": tile.column } as CSSProperties}>
            <button type="button">
              <small className="stack-tile-index">{String(tile.index + 1).padStart(2, "0")}</small>
              <span className="stack-tile-name">{tile.name}</span>
              <span className="stack-tile-foot"><small className="stack-tile-category">{tile.category}</small><small className="stack-tile-ref">{portfolio.labels.usedIn}<br /><b>{tile.usedIn}</b></small></span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function About({ portfolio }: PortfolioProps) {
  return (
    <section className="about page-section" id="about" data-scroll-scene>
      <SectionHeader {...portfolio.sections.about} />
      <div className="about-layout reveal scroll-layer" data-scroll-layer data-y="14,0,-12" data-opacity="0.4,1,0.45">
        <p>{portfolio.about.description}</p>
        <div>{portfolio.education.map((item) => <span key={item.qualification}>{item.qualification}</span>)}<span>{portfolio.about.location}</span><span>{portfolio.about.exploration}</span></div>
      </div>
      <div className="focus-line" aria-label={portfolio.about.interestsLabel}>{portfolio.about.interests.map((interest) => <span key={interest}>{interest}</span>)}</div>
    </section>
  );
}

function Services({ portfolio, analytics = noAnalytics }: PortfolioProps) {
  const [selected, setSelected] = useState<Capability | null>(null);
  return (
    <section className="services page-section" id="services" data-scroll-scene>
      <SectionHeader {...portfolio.sections.services} />
      <div className="service-list">
        {portfolio.services.map((service, index) => <button className={`service-row reveal${selected?.id === service.id ? " is-selected" : ""}`} data-scroll-scene key={service.id} onClick={() => setSelected(service)} data-cursor={portfolio.labels.serviceCursor}><span className="scroll-layer" data-scroll-layer data-x="-6,0,3" data-opacity="0.45,1,0.5">0{index + 1}</span><strong className="scroll-layer" data-scroll-layer data-y="10,0,-8" data-opacity="0.3,1,0.4" data-phase="-0.015">{service.title}</strong><i className="scroll-layer" data-scroll-layer data-x="8,0,-6" data-y="4,0,-6">↗</i></button>)}
      </div>
      <DetailOverlay open={!!selected} onClose={() => setSelected(null)} label={portfolio.labels.serviceOverlay} labels={portfolio.labels.overlay}>
        {selected && <article className="simple-detail"><span>{portfolio.labels.capability}</span><h2>{selected.title}</h2><p>{selected.description}</p>{selected.story && <div className="simple-detail-story">{selected.story.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>}<a href={`mailto:${portfolio.contact.email}`} onClick={() => analytics.track({name: "contact_click", kind: "email"})}>{`${portfolio.labels.discussProject} `}<b>↗</b></a></article>}
      </DetailOverlay>
    </section>
  );
}

function Contact({ portfolio, analytics = noAnalytics }: PortfolioProps) {
  return (
    <section className="contact" id="contact" data-scroll-scene>
      <div className="contact-sticky reveal">
        <div className="contact-grid scroll-layer" data-scroll-layer data-y="-80,0,90" data-scale="1.04,1,0.98" data-opacity="0.45,0.9,0.5" aria-hidden="true" />
        <div className="contact-meta reveal-label scroll-layer" data-scroll-layer data-y="10,0,-24" data-opacity="0.4,1,0.5"><span>{portfolio.contact.availability}</span><span>{portfolio.contact.location}</span></div>
        <h2 className="reveal-heading scroll-layer type-parallax" data-scroll-layer data-y="24,0,-20" data-opacity="0.3,1,0.4" data-damping="0.14" data-phase="-0.02">{portfolio.contact.headingLines.map((line, index) => <Fragment key={index}>{line}{index < portfolio.contact.headingLines.length - 1 && <br />}</Fragment>)}</h2>
        <div className={portfolio.contact.calendly ? "contact-actions contact-actions-paired" : "contact-actions"}>
          <a className="contact-action magnetic scroll-layer" data-scroll-layer data-y="14,0,-24" data-opacity="0.35,1,0.4" data-phase="-0.03" href={`mailto:${portfolio.contact.email}`} onClick={() => analytics.track({name: "contact_click", kind: "email"})} data-cursor={portfolio.contact.cursor}>{`${portfolio.contact.email} `}<span aria-hidden="true">↗</span></a>
          {portfolio.contact.calendly && portfolio.contact.booking && <a className="contact-action contact-booking magnetic scroll-layer" data-scroll-layer data-y="14,0,-24" data-opacity="0.35,1,0.4" data-phase="-0.03" href={portfolio.contact.calendly} target="_blank" rel="noopener noreferrer" aria-label={portfolio.contact.booking.accessibleLabel} onClick={() => analytics.track({name: "contact_click", kind: "calendly"})} data-cursor={portfolio.contact.cursor}><div>{portfolio.contact.booking.label}<small>{portfolio.contact.booking.detail}</small></div><span aria-hidden="true">↗</span></a>}
        </div>
        <div className="social-links reveal-meta scroll-layer" data-scroll-layer data-y="12,0,-26" data-opacity="0.4,1,0.5" data-phase="-0.04">{portfolio.contact.socials.map((link) => <a key={link.href} href={link.href} onClick={() => analytics.track({name: "contact_click", kind: "social"})}>{`${link.label} ↗`}</a>)}</div>
      </div>
    </section>
  );
}

function Footer({ portfolio, analytics = noAnalytics }: PortfolioProps) {
  return <footer><span>{`${portfolio.person.name} · ${portfolio.person.role}`}</span><span>{portfolio.footer.statement}{portfolio.resume && <> <a href={portfolio.resume.href.startsWith("/") ? `${import.meta.env.BASE_URL}${portfolio.resume.href.slice(1)}` : portfolio.resume.href} download onClick={() => analytics.track({name: "cv_download"})}>{portfolio.resume.label}</a></>}</span><a href="#top">{portfolio.footer.backToTop}</a></footer>;
}

export default function App({ store = portfolioStore, analytics = noAnalytics }: { store?: PortfolioStore; analytics?: AnalyticsPort } = {}) {
  const portfolio = store.portfolio;
  useMotionSystem();
  return (
    <>
      <ScrollProgress />
      <Cursor />
      <Navigation portfolio={portfolio} analytics={analytics} />
      <main><Hero portfolio={portfolio} /><Projects portfolio={portfolio} analytics={analytics} /><Experience portfolio={portfolio} /><Stack portfolio={portfolio} /><About portfolio={portfolio} /><Services portfolio={portfolio} analytics={analytics} /><Contact portfolio={portfolio} analytics={analytics} /></main>
      <Footer portfolio={portfolio} analytics={analytics} />
    </>
  );
}
