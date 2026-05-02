import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Validate,
  MinLength,
} from 'class-validator';
import { Match } from 'src/libs/common/decorators/match.decorator';

export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  fullname: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @Validate(Match, { message: 'Passwords do not match' })
  passwordConfirm: string;
}
