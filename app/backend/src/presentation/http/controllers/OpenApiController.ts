import type { Request, Response } from 'express'
import type { OpenApiDocument } from '../openapi/document.js'

/**
 * Serves the API description.
 *
 * The document is built once at composition and held, not rebuilt per
 * request: it depends only on configuration, which cannot change without a
 * restart, so rebuilding it would be work with no possible different answer.
 */
export class OpenApiController {
  constructor(private readonly document: OpenApiDocument) {}

  serve = (_req: Request, res: Response): void => {
    res.json(this.document)
  }
}
