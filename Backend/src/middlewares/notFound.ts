import ApiError from '@/errors/ApiError'
import type { RequestHandler } from 'express'
import httpStatus from 'http-status'

const notFound: RequestHandler = (req, res, next) => {
  next(
    new ApiError(
      httpStatus.NOT_FOUND,
      `API Not Found: [${req.method}] ${req.originalUrl}`
    )
  )
}

export default notFound