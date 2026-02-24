import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ---------------------------------------------------------------------------
// Building DTOs
// ---------------------------------------------------------------------------

export class CreateBuildingDto {
  @ApiProperty({ example: 'BLK-A', description: 'Unique building code' })
  @IsString()
  @MaxLength(20)
  code: string;

  @ApiProperty({ example: 'Block A – Krishna Hostel' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Basavanagudi Campus' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional({ example: 'No.1, Bull Temple Road, Basavanagudi' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactNo?: string;

  @ApiPropertyOptional({ example: 'block-a@bms.edu' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 4, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  totalFloors?: number;

  @ApiPropertyOptional({ example: 'Main building with 4 floors and 80 rooms' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateBuildingDto extends PartialType(CreateBuildingDto) {
  @ApiPropertyOptional({
    enum: ['ACTIVE', 'INACTIVE', 'UNDER_CONSTRUCTION', 'UNDER_MAINTENANCE'],
  })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'UNDER_CONSTRUCTION', 'UNDER_MAINTENANCE'])
  status?: 'ACTIVE' | 'INACTIVE' | 'UNDER_CONSTRUCTION' | 'UNDER_MAINTENANCE';
}

export class ListBuildingsQueryDto {
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

  @ApiPropertyOptional({
    enum: ['ACTIVE', 'INACTIVE', 'UNDER_CONSTRUCTION', 'UNDER_MAINTENANCE'],
  })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'UNDER_CONSTRUCTION', 'UNDER_MAINTENANCE'])
  status?: string;
}
