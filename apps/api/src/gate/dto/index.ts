import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsUUID,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ---------------------------------------------------------------------------
// Gate Entry DTOs
// ---------------------------------------------------------------------------

export class CreateGateEntryDto {
  @ApiProperty({ description: 'Student user ID' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ enum: ['IN', 'OUT'] })
  @IsEnum(['IN', 'OUT'])
  type: 'IN' | 'OUT';

  @ApiProperty({ example: 'Gate-1', description: 'Gate number' })
  @IsString()
  @MaxLength(20)
  gateNo: string;

  @ApiPropertyOptional({ description: 'Linked leave request ID' })
  @IsOptional()
  @IsUUID()
  linkedLeaveId?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ---------------------------------------------------------------------------
// Gate Pass DTOs
// ---------------------------------------------------------------------------

export class CreateGatePassDto {
  @ApiProperty({ description: 'Student user ID' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ example: 'Medical appointment at hospital' })
  @IsString()
  @MaxLength(500)
  purpose: string;

  @ApiPropertyOptional({ example: 'Rajesh Kumar' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  visitorName?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  visitorPhone?: string;

  @ApiProperty({ example: '2026-03-01T09:00:00Z', description: 'Valid from datetime' })
  @IsDateString()
  validFrom: string;

  @ApiProperty({ example: '2026-03-01T18:00:00Z', description: 'Valid to datetime' })
  @IsDateString()
  validTo: string;
}

export class UpdateGatePassDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'])
  status?: string;
}

// ---------------------------------------------------------------------------
// Query DTOs
// ---------------------------------------------------------------------------

export class ListGateEntriesQueryDto {
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

  @ApiPropertyOptional({ enum: ['IN', 'OUT'] })
  @IsOptional()
  @IsEnum(['IN', 'OUT'])
  type?: string;

  @ApiPropertyOptional({ description: 'Show only late entries' })
  @IsOptional()
  @Type(() => Boolean)
  lateOnly?: boolean;

  @ApiPropertyOptional({ description: 'Filter entries from this date' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Filter entries to this date' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class ListGatePassesQueryDto {
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

  @ApiPropertyOptional({ enum: ['ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
