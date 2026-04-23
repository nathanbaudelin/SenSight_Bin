import { getSchemaPath } from '@nestjs/swagger';

export function responseWithOptionalData(
  responseDto: any,
  extraDtos?: any | any[] | null,
  paginatedDto?: any | null,
) {
  const base = [{ $ref: getSchemaPath(responseDto) }];

  if (!extraDtos) {
    return {
      schema: {
        allOf: base,
      },
    };
  }

  const extraArray = Array.isArray(extraDtos) ? extraDtos : [extraDtos];

  let dataSchema: any;

  if (extraArray.length === 1) {
    dataSchema = { $ref: getSchemaPath(extraArray[0]) };
  } else {
    dataSchema = {
      oneOf: extraArray.map((dto) => ({
        $ref: getSchemaPath(dto),
      })),
    };
  }

  let finalDataSchema = dataSchema;

  if (paginatedDto) {
    finalDataSchema = {
      allOf: [
        { $ref: getSchemaPath(paginatedDto) },
        {
          type: 'object',
          properties: {
            data: dataSchema,
          },
        },
      ],
    };
  }

  return {
    schema: {
      allOf: [
        ...base,
        {
          type: 'object',
          properties: {
            data: finalDataSchema,
          },
        },
      ],
    },
  };
}
