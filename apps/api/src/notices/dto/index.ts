import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
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
// Notice DTOs
// ---------------------------------------------------------------------------

export class CreateNoticeDto {
  @ApiProperty({ example: 'Water supply disruption on Feb 28' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Due to maintenance, water supply will be disrupted from 10 AM to 4 PM...' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ enum: ['INFO', 'WARNING', 'URGENT'], default: 'INFO' })
  @IsOptional()
  @IsEnum(['INFO', 'WARNING', 'URGENT'])
  priority?: string;

  @ApiPropertyOptional({ enum: ['ALL', 'BUILDING', 'HOSTEL'], default: 'ALL' })
  @IsOptional()
  @IsEnum(['ALL', 'BUILDING', 'HOSTEL'])
  scope?: string;

  @ApiPropertyOptional({ description: 'Target building ID (when scope = BUILDING)' })
  @IsOptional()
  @IsUUID()
  targetBuildingId?: string;

  @ApiPropertyOptional({ description: 'Target hostel ID (when scope = HOSTEL)' })
  @IsOptional()
  @IsUUID()
  targetHostelId?: string;

  @ApiPropertyOptional({ description: 'Expiry date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateNoticeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ enum: ['INFO', 'WARNING', 'URGENT'] })
  @IsOptional()
  @IsEnum(['INFO', 'WARNING', 'URGENT'])
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class ListNoticesQueryDto {
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

  @ApiPropertyOptional({ enum: ['ALL', 'BUILDING', 'HOSTEL'] })
  @IsOptional()
  @IsEnum(['ALL', 'BUILDING', 'HOSTEL'])
  scope?: string;

  @ApiPropertyOptional({ enum: ['INFO', 'WARNING', 'URGENT'] })
  @IsOptional()
  @IsEnum(['INFO', 'WARNING', 'URGENT'])
  priority?: string;

  @ApiPropertyOptional({ description: 'Filter active only', default: true })
  @IsOptional()
  @Type(() => Boolean)
  activeOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
