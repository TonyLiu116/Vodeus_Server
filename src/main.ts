import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "nestjs-config";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as bodyParser from 'body-parser';
import { config } from 'aws-sdk';
import "reflect-metadata"
import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';
import * as FIREBASE_CONFIG from './firebase_config.json';

async function bootstrap() {
  // var https = require('https');
  // var fs = require('fs');
  // var httpsoptions = { key : fs.readFileSync('./privatekey.pem'), cert: fs.readFileSync('./server.crt'), cors:true };
  // const app = await NestFactory.create<NestExpressApplication>(AppModule, httpsoptions);
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });
  const configService = app.get<any>(ConfigService);
  const host = configService.get('app.host')
  const port = configService.get('app.port')
  const prefix = configService.get('app.backend_api_prefix')
  if (prefix) {
    app.setGlobalPrefix(prefix);
  }

  const adminConfig: ServiceAccount = {
    projectId: FIREBASE_CONFIG.project_id,
    privateKey: FIREBASE_CONFIG.private_key.replace(/\\n/g, '\n'),
    clientEmail: FIREBASE_CONFIG.client_email,
  };
  // Initialize the firebase admin app
  admin.initializeApp({
    credential: admin.credential.cert(adminConfig),
  });

  const options = new DocumentBuilder()
    .addBearerAuth()
    .setTitle('Social voice app backend API')
    .setDescription('endpoints')
    .setVersion('1.0')
    .build();
  config.update({
    accessKeyId: configService.get('app.aws_access_key_id'),
    secretAccessKey: configService.get('app.aws_secret_access_key'),
    region: configService.get('app.aws_region'),
  });
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('documentation', app, document);
  app.enableCors();
  app.use(bodyParser.text({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe());
  Logger.log(`Listening at http://${host}:${port}/documentation`)
  await app.listen(port, host);
  // const PORT = process.env.PORT || 3000;
  // await app.listen(PORT);
}
bootstrap().then(() => Logger.log(`${new Date()}`));
