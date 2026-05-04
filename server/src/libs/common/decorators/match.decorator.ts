import {
  ValidatorConstraint,
  ValidationArguments,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'Match' })
export class Match implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    const { passwordConfirm } = args.object as any;
    return passwordConfirm === value;
  }

  defaultMessage() {
    return `Password doesn't match`;
  }
}
