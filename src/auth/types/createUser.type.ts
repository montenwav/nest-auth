import { RegisterUserDto } from '../dto/RegisterUser.dto';
import { OAuthProfileType } from './oAuthProfile.type';

export type CreateUserType = RegisterUserDto & OAuthProfileType;
