import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsUUID,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ---------------------------------------------------------------------------
// List / Filter
// ---------------------------------------------------------------------------

export class ListViolationsQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by student ID' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ enum: ['LATE_ENTRY', 'OVERSTAY', 'EARLY_EXIT'] })
  @IsOptional()
  @IsEnum(['LATE_ENTRY', 'OVERSTAY', 'EARLY_EXIT'])
  type?: string;

  @ApiPropertyOptional({ enum: ['NONE', 'WARNED', 'ESCALATED', 'RESOLVED'] })
  @IsOptional()
  @IsEnum(['NONE', 'WARNED', 'ESCALATED', 'RESOLVED'])
  escalationState?: string;

  @ApiPropertyOptional({ description: 'From date' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'To date' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

// ---------------------------------------------------------------------------
// Resolve
// ---------------------------------------------------------------------------

export class ResolveViolationDto {
  @ApiPropertyOptional({ description: 'Resolution notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
