import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PublicFileEntity } from "../entities/public-file.entity";
import { Repository } from "typeorm";
import { S3 } from "aws-sdk";
import { v4 as uuid } from "uuid";
import { ConfigService } from "nestjs-config";
import { isUUID } from "class-validator";
import { FileTypeEnum } from "../lib/enum";
import {Storage} from "@google-cloud/storage";

@Injectable()
export class AssociationService {
  constructor(
  ) {
  }

  async getAssociation(){
    const data = {
      applinks:{
        apps:[],
        details:[
          {
            appID:"SF6VT86H77.org.vocco",
            paths:["*"]
          }
        ]
      }
    }
    return data;
  }
}
