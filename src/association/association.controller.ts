import {
  Body,
  Controller, Delete, Get,
  HttpStatus, Logger,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  Header,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiTags,
  ApiQuery,
  ApiResponse
} from "@nestjs/swagger";
import { createReadStream } from 'fs';
import { join } from 'path';
import type { Response } from 'express';
import { AssociationService } from "./association.service";

@Controller('apple-app-site-association')
export class AssociationController {
  private readonly logger = new Logger(AssociationController.name);

  constructor(private associationService: AssociationService) {
  }
  // @Get()
  // @Header('Content-Type', 'application/json')
  // //@Header('Content-Disposition', 'attachment; filename="apple-app-site-association"')
  // getFile(
  //   //@Res() res
  // ) {
  //   const file = createReadStream(join(process.cwd(), 'apple-app-site-association'));
  //   return new StreamableFile(file);
  //   const data = {
  //     applinks:{
  //       apps:[],
  //       details:[
  //         {
  //           appId:"SF6VT86H77.org.vocco",
  //           paths:["*"]
  //         }
  //       ]
  //     }
  //   }
  //   return res.json(data);
  // }

  @ApiResponse ({ status: HttpStatus.OK })
  @Get("")
  getAssociation(
    @Res() res,
  ) {
    return this.associationService.getAssociation()
      .then((data) => res.json(data))
      .catch(err => !err.status ? this.logger.error(err) : res.status(err.status).send(err.response));
  }
}