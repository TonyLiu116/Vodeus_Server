import { ApiModelProperty } from "@nestjs/swagger/dist/decorators/api-model-property.decorator";

export class RecordImgDto {
  @ApiModelProperty({ type: 'string', format: 'binary', required: true })
  file: any;

  @ApiModelProperty({ type: 'string'})
  recordId: string;
}
