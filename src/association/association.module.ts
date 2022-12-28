import { Module } from '@nestjs/common';
import { AssociationController } from './association.controller';
import { AssociationService } from './association.service';

@Module({
  providers: [AssociationService],
  controllers: [AssociationController]
})
export class AssociationModule {}
