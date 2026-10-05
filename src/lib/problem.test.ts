import { describe, expect, it } from 'vitest'
import { ProblemError, isProblemError, toProblemError } from './problem.ts'

describe('toProblemError', () => {
  it('extrae el problem+json del backend', async () => {
    const response = new Response(
      JSON.stringify({
        type: 'about:blank',
        title: 'Entidad no procesable',
        status: 422,
        detail: 'El pago excede el saldo actual de la tarjeta.',
        code: 'UNPROCESSABLE_ENTITY',
        reason: 'PAYMENT_EXCEEDS_BALANCE',
        requestId: 'req-1',
        errors: [{ field: 'amount', errors: ['amount excede el saldo'] }],
      }),
      { status: 422, headers: { 'content-type': 'application/problem+json' } },
    )

    const error = await toProblemError(response)

    expect(error).toBeInstanceOf(ProblemError)
    expect(isProblemError(error)).toBe(true)
    expect(error.status).toBe(422)
    expect(error.reason).toBe('PAYMENT_EXCEEDS_BALANCE')
    expect(error.requestId).toBe('req-1')
    expect(error.message).toContain('excede el saldo')
    expect(error.fieldErrors()).toEqual({ amount: ['amount excede el saldo'] })
  })

  it('usa el status HTTP cuando la respuesta no trae cuerpo', async () => {
    const response = new Response('', { status: 500 })
    const error = await toProblemError(response)

    expect(error.status).toBe(500)
    expect(error.reason).toBeUndefined()
    expect(error.fieldErrors()).toEqual({})
  })
})
