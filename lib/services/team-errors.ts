export class TeamServiceError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "TeamServiceError";
  }
}

export function isTeamServiceError(error: unknown): error is TeamServiceError {
  return error instanceof TeamServiceError;
}
