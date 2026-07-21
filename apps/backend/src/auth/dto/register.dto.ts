import {
IsEmail,
IsString,
MinLength
} from 'class-validator';

export class RegisterDto {

@IsString()
firstName!:string;

@IsString()
lastName!:string;

@IsEmail()
email!:string;

@MinLength(8)
password!:string;

}