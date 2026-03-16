import { HttpException, HttpStatus } from '@nestjs/common';
import { ResponseDto } from './response.dto';
import { ResponseStatusEnum } from './enums';

export class ApiException extends HttpException {
  constructor(
    message: string,
    statusCode = HttpStatus.BAD_REQUEST,
    data?: any,
  ) {
    const response = new ResponseDto();
    response.status = ResponseStatusEnum.ERROR;
    response.message = message;
    response.data = data;

    super(response, statusCode);
  }
}
