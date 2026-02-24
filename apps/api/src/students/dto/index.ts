import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsBoolean,
  IsDateString,
  IsEnum,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ---------------------------------------------------------------------------
// Student Profile DTOs
// ---------------------------------------------------------------------------

export class CreateStudentProfileDto {
  @ApiProperty({ description: 'User ID of the student' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ example: '2004-06-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'O+', description: 'Blood group (A+, B-, AB+, O-, etc.)' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  bloodGroup?: string;

  @ApiPropertyOptional({ enum: ['Male', 'Female', 'Other'] })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  gender?: string;

  @ApiPropertyOptional({ example: 'Computer Science' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ example: 'B.E.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  course?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  @Type(() => Number)
  year?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  semester?: number;

  @ApiPropertyOptional({ example: '2023-08-01' })
  @IsOptional()
  @IsDateString()
  admissionDate?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  emergencyContact?: string;

  @ApiPropertyOptional({ example: 'No. 42, MG Road, Bangalore – 560001' })
  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @ApiPropertyOptional({ example: 'Mild asthma, no allergies' })
  @IsOptional()
  @IsString()
  medicalConditions?: string;
}

export class UpdateStudentProfileDto extends PartialType(CreateStudentProfileDto) {}

export class ListStudentsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'Computer Science' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  @Type(() => Number)
  year?: number;
}

// ---------------------------------------------------------------------------
// Guardian Link DTOs
// ---------------------------------------------------------------------------

export class CreateGuardianLinkDto {
  @ApiProperty({ description: 'Student (ward) user ID' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ description: 'Guardian / parent user ID' })
  @IsUUID()
  guardianId: string;

  @ApiProperty({ example: 'Father', description: 'Relation (Father, Mother, Guardian, etc.)' })
  @IsString()
  @MaxLength(50)
  relation: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPrimary?: boolean;
}

export class UpdateGuardianLinkDto {
  @ApiPropertyOptional({ example: 'Mother' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  relation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPrimary?: boolean;
}
