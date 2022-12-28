import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PublicFileEntity } from "../entities/public-file.entity";
import { Repository, UpdateResult } from "typeorm";
import { S3 } from "aws-sdk";
import { v4 as uuid } from "uuid";
import { ConfigService } from "nestjs-config";
import { isUUID } from "class-validator";
import { FileTypeEnum } from "../lib/enum";
import {Storage} from "@google-cloud/storage";

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(PublicFileEntity) private publicFilesRepository: Repository<PublicFileEntity>,
    private readonly configService: ConfigService
  ) {
  }

  async uploadFile(dataBuffer: Buffer, filename: string, type: FileTypeEnum) {
    const s3 = new S3();
    const fname = `${uuid()}-${filename}`;
    const uploadResult = await s3.upload({
      Bucket: this.configService.get("app.aws_public_bucket_name"),
      Body: dataBuffer,
      Key: fname,
      ACL:'public-read'
    })
      .promise();

    // const storage = new Storage({
    //   keyFilename: "./voccoservice-911c27e53b70.json"
    // });
    
    // const bucket = storage.bucket("voccosrg");
    // const fname = `${uuid()}-${filename}`;
    // const file = bucket.file(fname);
    // const stream = file.createWriteStream();
    // stream.on("finish", async () => {
    //   return await file.setMetadata({
    //     metadata: {media:fname},
    //   });
    // });
    // stream.end(dataBuffer);
    const createFileEntity = new PublicFileEntity();
    createFileEntity.key = uploadResult.Key;
    createFileEntity.url = uploadResult.Location;
    createFileEntity.type = type;
    return this.publicFilesRepository.save(createFileEntity);
  }

  public async getPrivateFile(fileId) {
    if (!isUUID(fileId)) {
      throw new BadRequestException("id is not a uuid");
    }
    const s3 = new S3();
    const fileInfo = await this.publicFilesRepository.findOne({ where: {id: fileId} });
    if (fileInfo) {
      const stream = await s3.getObject({
        Bucket: this.configService.get("app.aws_public_bucket_name"),
        Key: fileInfo.key
      })
        .createReadStream();
      return {
        stream,
        info: fileInfo
      };
    }
    throw new NotFoundException();
  }
}
