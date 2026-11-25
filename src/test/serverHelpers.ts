import { menu } from '../fixtures'
import { isErrorBody } from '../server/http'
import type { ErrorBody, ServerResponse } from '../types/api'

// Success body, or fail the test with the error code.
export function ok<Body>(response: ServerResponse<Body | ErrorBody>): Body {
  const { body } = response
  if (isErrorBody(body)) {
    throw new Error(`Expected success, got ${response.status} ${body.code}: ${body.message}`)
  }
  return body
}

// Error body, or fail the test.
export function errorOf<Body>(response: ServerResponse<Body | ErrorBody>): ErrorBody {
  const { body } = response
  if (!isErrorBody(body)) throw new Error(`Expected an error, got ${response.status}`)
  return body
}

// Ingredient id by its fixture name, so test text stays id-free.
export function ingredientId(name: string): string {
  const found = menu.ingredients.find((i) => i.name === name)
  if (!found) throw new Error(`Unknown ingredient: ${name}`)
  return found.id
}
