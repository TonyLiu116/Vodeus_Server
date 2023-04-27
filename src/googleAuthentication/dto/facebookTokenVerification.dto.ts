import { IsString, IsNotEmpty } from 'class-validator';

export class FacebookTokenVerificationDto {

  @IsNotEmpty()
  facebookId: string;

}

export default FacebookTokenVerificationDto;