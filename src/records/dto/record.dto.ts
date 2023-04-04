import { ApiModelProperty } from "@nestjs/swagger/dist/decorators/api-model-property.decorator";
import { ApiProperty } from "@nestjs/swagger";

export class RecordDto {

  @ApiModelProperty({ type: 'string', })
  title: string;

  @ApiModelProperty({ type: 'string', })
  content: string;

  @ApiModelProperty({ type: 'string', example: '😎'})
  emoji: string;

  @ApiModelProperty({ type: 'string', example: 45})
  duration: string;

  @ApiModelProperty({ type: 'string'})
  category: string;

  @ApiModelProperty({ type: 'string'})
  recordText: string;

  @ApiModelProperty({ type: 'string', nullable:true})
  address: string;

  @ApiModelProperty({ example: false })
  privacy: boolean;

  @ApiModelProperty({ example: false })
  notSafe: boolean;

  @ApiModelProperty({ example: false })
  temporary: boolean;

  @ApiModelProperty({ type: 'string', format: 'binary' })
  audioFile: any;

  @ApiModelProperty({ type: 'string', format: 'binary' })
  imageFile: any;

  @ApiProperty({ example: "9daaf749-6202-4b6f-86fc-133ce7ed8c23" })
  id: string;

  @ApiModelProperty({ type: 'string' })
  createdAt: string;
}
