import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Match } from 'src/libs/common/decorators/match.decorator';

export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Password must be at least 2 characters long' })
  fullname: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4, { message: 'Password must be at least 4 characters long' })
  password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4, { message: 'Password must be at least 4 characters long' })
  @Match('password', { message: 'Passwords do not match' })
  passwordConfirm: string;
}
