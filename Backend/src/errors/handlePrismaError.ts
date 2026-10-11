import type { Prisma } from '@/prisma/generated/prisma/client';
import type { TErrorSource, TGenericErrorResponse } from '@/types/error.interface';

export const handlePrismaError = (
  err: Prisma.PrismaClientKnownRequestError
): TGenericErrorResponse => {
  let errorSources: TErrorSource[] = [];
  let statusCode = 400;
  let message = 'Database Error';

  switch (err.code) {
    // Value too long for the column
    case 'P2000':
      message = 'The provided value for the column is too long';
      errorSources = [
        {
          path: (err.meta?.column_name as string) || '',
          message,
        },
      ];
      break;

    // Record searched for in the where condition does not exist
    case 'P2001':
      statusCode = 404;
      message = 'Record does not exist';
      errorSources = [
        {
          path: '',
          message: 'Record not found in the database',
        },
      ];
      break;

    // Unique constraint failed
    case 'P2002': {
      statusCode = 409;
      const target = (err.meta?.target as string[]) || [];
      message = `Duplicate entry for ${target.join(', ')}`;
      errorSources = target.map((field) => ({
        path: field,
        message: `${field} already exists`,
      }));
      break;
    }

    // Foreign key constraint failed
    case 'P2003':
      message = 'Foreign key constraint failed';
      errorSources = [
        {
          path: (err.meta?.field_name as string) || '',
          message: 'Referenced record does not exist',
        },
      ];
      break;

    // The change you are trying to make would violate the required relation
    case 'P2014':
      message = 'Relation violation';
      errorSources = [
        {
          path: '',
          message: 'The change would violate a required relation between models',
        },
      ];
      break;

    // Record not found (usually on update/delete)
    case 'P2025':
      statusCode = 404;
      message = (err.meta?.cause as string) || 'Record not found';
      errorSources = [
        {
          path: '',
          message,
        },
      ];
      break;

    // Fallback for any other known Prisma errors
    default:
      message = 'Something went wrong in the database';
      errorSources = [
        {
          path: '',
          message: err.message,
        },
      ];
      break;
  }

  return {
    statusCode,
    message,
    errorSources,
  };
};