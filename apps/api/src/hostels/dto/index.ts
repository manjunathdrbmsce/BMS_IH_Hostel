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
// Hostel DTOs
// ---------------------------------------------------------------------------

export class CreateHostelDto {
  @ApiProperty({ example: 'KH', description: 'Unique hostel code' })
  @IsString()
  @MaxLength(10)
  code: string;

  @ApiProperty({ example: 'Krishna Hostel' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ enum: ['BOYS', 'GIRLS', 'CO_ED'] })
  @IsEnum(['BOYS', 'GIRLS', 'CO_ED'])
  type: 'BOYS' | 'GIRLS' | 'CO_ED';

  @ApiPropertyOptional({ example: 'BMS College Campus, Basavanagudi' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  totalBlocks?: number;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactNo?: string;

  @ApiPropertyOptional({ example: 'krishna.hostel@bms.edu' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  capacity?: number;

  @ApiPropertyOptional({ example: 'Premier boys hostel with modern amenities' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateHostelDto extends PartialType(CreateHostelDto) {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE'])
  status?: 'ACTIVE' | 'INACTIVE' | 'UNDER_MAINTENANCE';
}

export class ListHostelsQueryDto {
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

  @ApiPropertyOptional({ enum: ['BOYS', 'GIRLS', 'CO_ED'] })
  @IsOptional()
  @IsEnum(['BOYS', 'GIRLS', 'CO_ED'])
  type?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE'])
  status?: string;
}

// ---------------------------------------------------------------------------
// Room DTOs
// ---------------------------------------------------------------------------

export class CreateRoomDto {
  @ApiProperty({ description: 'Hostel ID this room belongs to' })
  @IsString()
  hostelId: string;

  @ApiProperty({ example: '101' })
  @IsString()
  @MaxLength(20)
  roomNo: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  @Max(20)
  @Type(() => Number)
  floor: number;

  @ApiPropertyOptional({ example: 'A' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  block?: string;

  @ApiPropertyOptional({ enum: ['SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD', 'DORMITORY'], default: 'DOUBLE' })
  @IsOptional()
  @IsEnum(['SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD', 'DORMITORY'])
  type?: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'QUAD' | 'DORMITORY';

  @ApiPropertyOptional({ example: 2, default: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  capacity?: number;

  @ApiPropertyOptional({ example: ['WiFi', 'AC', 'Attached Bathroom'] })
  @IsOptional()
  @IsString({ each: true })
  amenities?: string[];
}

export class UpdateRoomDto extends PartialType(CreateRoomDto) {
  @ApiPropertyOptional({ enum: ['AVAILABLE', 'FULL', 'UNDER_MAINTENANCE', 'CLOSED'] })
  @IsOptional()
  @IsEnum(['AVAILABLE', 'FULL', 'UNDER_MAINTENANCE', 'CLOSED'])
  status?: 'AVAILABLE' | 'FULL' | 'UNDER_MAINTENANCE' | 'CLOSED';
}

export class ListRoomsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  limit?: number;

  @ApiProperty({ description: 'Hostel ID to list rooms for' })
  @IsString()
  hostelId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  floor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  block?: string;

  @ApiPropertyOptional({ enum: ['AVAILABLE', 'FULL', 'UNDER_MAINTENANCE', 'CLOSED'] })
  @IsOptional()
  @IsEnum(['AVAILABLE', 'FULL', 'UNDER_MAINTENANCE', 'CLOSED'])
  status?: string;

  @ApiPropertyOptional({ enum: ['SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD', 'DORMITORY'] })
  @IsOptional()
  @IsEnum(['SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD', 'DORMITORY'])
  type?: string;
}

// ---------------------------------------------------------------------------
// Bulk room creation
// ---------------------------------------------------------------------------

export class BulkCreateRoomsDto {
  @ApiProperty({ description: 'Hostel ID' })
  @IsString()
  hostelId: string;

  @ApiProperty({ example: 1, description: 'Starting floor' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  fromFloor: number;

  @ApiProperty({ example: 4, description: 'Ending floor' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  toFloor: number;

  @ApiProperty({ example: 1, description: 'Starting room number per floor' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  fromRoom: number;

  @ApiProperty({ example: 20, description: 'Ending room number per floor' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  toRoom: number;

  @ApiPropertyOptional({ example: 'A' })
  @IsOptional()
  @IsString()
  block?: string;

  @ApiPropertyOptional({
    enum: ['SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD', 'DORMITORY'],
    default: 'DOUBLE',
  })
  @IsOptional()
  @IsEnum(['SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD', 'DORMITORY'])
  type?: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'QUAD' | 'DORMITORY';

  @ApiPropertyOptional({ example: 2, default: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  capacity?: number;
}

export { CreateHostelDto as default };
