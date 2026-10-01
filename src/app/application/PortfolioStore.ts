import type { Portfolio } from "../domain/portfolioData";
import type { PortfolioRepository } from "./portfolioRepository";

export class PortfolioStore {
  readonly portfolio: Portfolio;

  constructor(repository: PortfolioRepository) {
    this.portfolio = repository.getPortfolio();
  }
}
