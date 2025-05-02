import { IsString, IsEmail, IsNotEmpty, Length } from 'class-validator';

export class CreateManagerDto {
	@IsString()
	@IsNotEmpty()
	@Length(1, 255)
	name: string;

	@IsEmail()
	@IsNotEmpty()
	@Length(1, 255)
	email: string;

	@IsString()
	@IsNotEmpty()
	@Length(1, 20)
	phone: string;

	@IsString()
	@IsNotEmpty()
	@Length(1, 100)
	position: string;

	@IsString()
	@IsNotEmpty()
	@Length(1, 255)
	userId: string;

	@IsString()
	@IsNotEmpty()
	@Length(1, 255)
	firstName: string;

	@IsString()
	@IsNotEmpty()
	@Length(1, 100)
	department: string;

	@IsString()
	@IsNotEmpty()
	@Length(1, 10)
	extension: string;
}
