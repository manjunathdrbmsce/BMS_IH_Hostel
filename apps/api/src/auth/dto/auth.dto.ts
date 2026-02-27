import { IsNotEmpty, IsString, MinLength, MaxLength, IsEmail, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Email, mobile number, or USN',
    example: 'admin@bms.local',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identifier: string;

  @ApiProperty({
    description: 'Account password',
    example: 'Admin@123456',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class StudentSignupDto {
  @ApiProperty({ description: 'First name', example: 'Raj' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Kumar' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ description: 'Email address', example: 'raj.kumar@bms.edu' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiProperty({ description: 'Mobile number', example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, { message: 'Mobile must be a valid 10-digit Indian mobile number' })
  mobile: string;

  @ApiPropertyOptional({ description: 'University Seat Number', example: '1BM22CS001' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  usn?: string;

  @ApiProperty({ description: 'Password (min 8 chars, must include uppercase, lowercase, number, special char)', example: 'Student@123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;
}
