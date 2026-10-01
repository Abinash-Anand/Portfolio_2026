import { validatePortfolioDocument, validateGeneratedPortfolio } from "./portfolioContract";
import { createPortfolioRepository } from "./portfolioRepository";
import { PortfolioStore } from "./PortfolioStore";

const snapshots = import.meta.glob("../generated/githubPortfolio.json", { eager: true, import: "default" });
const fixtures = import.meta.env.DEV ? import.meta.glob("../../../portfolio.json", { eager: true, import: "default" }) : {};
const mode = import.meta.env.VITE_PORTFOLIO_DATA_MODE ?? (import.meta.env.DEV ? "fixture" : "github");
if (mode !== "github" && mode !== "fixture") throw new Error("VITE_PORTFOLIO_DATA_MODE must be github or fixture");
if (import.meta.env.PROD && mode !== "github") throw new Error("Production rendering requires GitHub mode");
const fixtureMode = import.meta.env.DEV && mode === "fixture";
const generated = fixtureMode ? undefined : validateGeneratedPortfolio(Object.values(snapshots)[0]);
const document = generated?.document ?? validatePortfolioDocument(Object.values(fixtures)[0], "development fixture");
if (fixtureMode && !document.fixture) throw new Error("Development fixture mode requires fixture=true");
if (import.meta.env.PROD && document.fixture) throw new Error("Production cannot render fixture portfolio content; synchronize GitHub sources first");
export const portfolioStore = new PortfolioStore(createPortfolioRepository(document, generated?.projects === undefined ? undefined : {schemaVersion: 1, projects: generated.projects}));
export const portfolioProjects = portfolioStore.portfolio.projects;

export type PortfolioProjectView = (typeof portfolioProjects)[number];
