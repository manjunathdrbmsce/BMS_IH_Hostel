import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
    @ApiProperty({
        description: 'Email address associated with the account',
        example: 'student@bms.edu',
    })
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(255)
    email: string;
}

export class ResetPasswordDto {
    @ApiProperty({ description: 'Password reset token received via email/response' })
    @IsString()
    @IsNotEmpty()
    token: string;

    @ApiProperty({
        description: 'New password (min 8 chars, must include uppercase, lowercase, number, special char)',
        example: 'NewPass@123',
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(128)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/, {
        message:
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    })
    newPassword: string;
}
