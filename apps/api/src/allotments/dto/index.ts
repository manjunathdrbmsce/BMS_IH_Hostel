import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsEnum,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ---------------------------------------------------------------------------
// Bed Assignment DTOs
// ---------------------------------------------------------------------------

export class AssignBedDto {
  @ApiProperty({ description: 'Student user ID' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ description: 'Bed ID to assign' })
  @IsUUID()
  bedId: string;

  @ApiPropertyOptional({ example: 'First year admission allotment' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ example: 'Preferred lower bunk due to medical condition' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class TransferBedDto {
  @ApiProperty({ description: 'Student user ID' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ description: 'New bed ID to transfer to' })
  @IsUUID()
  newBedId: string;

  @ApiPropertyOptional({ example: 'Room change request approved by warden' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class VacateBedDto {
  @ApiProperty({ description: 'Student user ID' })
  @IsUUID()
  studentId: string;

  @ApiPropertyOptional({ example: 'Semester ended / course completed' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListAssignmentsQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by student user ID' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Filter by bed ID' })
  @IsOptional()
  @IsUUID()
  bedId?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'VACATED', 'TRANSFERRED', 'EXPIRED'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'VACATED', 'TRANSFERRED', 'EXPIRED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by hostel ID' })
  @IsOptional()
  @IsUUID()
  hostelId?: string;
}
