import type { Portfolio } from "../domain/portfolioData.ts";
import { validatePortfolioDocument, validateRepositorySnapshot } from "./portfolioContract.ts";
import { normalizePortfolio } from "./normalizePortfolio.ts";

export interface PortfolioRepository {
  getPortfolio(): Portfolio;
}
export function createPortfolioRepository(document: unknown, snapshot?: unknown): PortfolioRepository {
  const portfolio = normalizePortfolio(validatePortfolioDocument(document), snapshot === undefined ? undefined : validateRepositorySnapshot(snapshot));
  return {getPortfolio: () => portfolio};
}
