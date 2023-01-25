import { IsString, IsNotEmpty } from 'class-validator';

export class AppleTokenVerificationDto {
  @IsString()
  nonce: string;

  @IsString()
  @IsNotEmpty()
  identityToken: string;

  @IsString()
  code: string;
}

export default AppleTokenVerificationDto;