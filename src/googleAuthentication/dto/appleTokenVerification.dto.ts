import { IsString, IsNotEmpty } from 'class-validator';

export class AppleTokenVerificationDto {
  @IsString()
  @IsNotEmpty()
  nonce: string;

  @IsString()
  @IsNotEmpty()
  identityToken: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}

export default AppleTokenVerificationDto;