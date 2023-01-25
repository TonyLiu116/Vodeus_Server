import { IsString, IsNotEmpty } from 'class-validator';

export class AppleTokenVerificationDto {

  @IsString()
  @IsNotEmpty()
  identityToken: string;

}

export default AppleTokenVerificationDto;