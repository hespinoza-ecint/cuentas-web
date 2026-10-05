/**
 * Errores RFC 9457 (`application/problem+json`) del backend.
 *
 * Todos los endpoints devuelven `{ status, detail, code, reason, requestId, errors? }`.
 * `ProblemError` lo expone tipado para mostrarlo en la UI.
 */
export interface ProblemDetails {
  type?: string
  title: string
  status: number
  detail?: string
  instance?: string
  code?: string
  reason?: string
  requestId?: string
  timestamp?: string
  errors?: { field: string; errors: string[] }[]
}

export class ProblemError extends Error {
  readonly problem: ProblemDetails

  constructor(problem: ProblemDetails) {
    super(problem.detail ?? problem.title)
    this.name = 'ProblemError'
    this.problem = problem
  }

  get status(): number {
    return this.problem.status
  }

  get reason(): string | undefined {
    return this.problem.reason
  }

  get requestId(): string | undefined {
    return this.problem.requestId
  }

  /** Errores por campo listos para formularios: { amount: ["..."] }. */
  fieldErrors(): Record<string, string[]> {
    const map: Record<string, string[]> = {}
    for (const entry of this.problem.errors ?? []) {
      map[entry.field] = entry.errors
    }
    return map
  }
}

export function isProblemError(error: unknown): error is ProblemError {
  return error instanceof ProblemError
}

/** Convierte una respuesta fallida del backend en `ProblemError`. */
export async function toProblemError(response: Response): Promise<ProblemError> {
  try {
    const body = (await response.json()) as Partial<ProblemDetails>
    return new ProblemError({
      status: response.status,
      title: response.statusText || 'Error de la API',
      ...body,
    })
  } catch {
    return new ProblemError({
      status: response.status,
      title: response.statusText || 'Error de la API',
    })
  }
}
