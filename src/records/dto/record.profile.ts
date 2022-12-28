import { ApiProperty } from "@nestjs/swagger";
import { ApiModelProperty } from "@nestjs/swagger/dist/decorators/api-model-property.decorator";

export class RecordDataDto {

  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  emoji: string;

  @ApiProperty()
  bio: string;

  @ApiProperty()
  link: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  privacy: boolean;

  @ApiProperty()
  notSafe: boolean;

  @ApiProperty()
  temporary: boolean;

  @ApiModelProperty({ type: 'string', format: 'binary', required: false })
  file: any;
}
