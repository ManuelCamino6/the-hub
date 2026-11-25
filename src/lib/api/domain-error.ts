
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number = 422
  ) {
    super(code);
    this.name = "DomainError";
  }
}