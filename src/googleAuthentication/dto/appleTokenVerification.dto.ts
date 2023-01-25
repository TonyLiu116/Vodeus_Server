import { IsString, IsNotEmpty } from 'class-validator';

export class AppleTokenVerificationDto {

  @IsNotEmpty()
  identityToken: string;

}

export default AppleTokenVerificationDto;