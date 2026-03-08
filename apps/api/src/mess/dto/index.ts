import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsUUID,
  IsBoolean,
  IsNumber,
  IsArray,
  IsDateString,
  Min,
  Max,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ============================================================================
// Menu DTOs
// ============================================================================

export class MenuItemDto {
  @ApiProperty({ enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] })
  @IsEnum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])
  day: string;

  @ApiProperty({ enum: ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'] })
  @IsEnum(['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'])
  mealType: string;

  @ApiProperty({ example: 'Idli, Sambar, Chutney, Coffee' })
  @IsString()
  items: string;

  @ApiPropertyOptional({ example: 'Festival special' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  specialNote?: string;
}

export class CreateMenuDto {
  @ApiProperty()
  @IsUUID()
  hostelId: string;

  @ApiProperty({ example: 'Spring 2026 Week Menu' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ enum: ['VEG', 'NON_VEG'] })
  @IsEnum(['VEG', 'NON_VEG'])
  messType: string;

  @ApiProperty({ example: '2026-03-10' })
  @IsDateString()
  effectiveFrom: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [MenuItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MenuItemDto)
  items: MenuItemDto[];
}

export class UpdateMenuDto {
  @ApiPropertyOptional({ example: 'Updated Spring Menu' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: '2026-03-15' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2026-07-31' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [MenuItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuItemDto)
  items?: MenuItemDto[];
}

export class QueryMenuDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  hostelId?: string;

  @ApiPropertyOptional({ enum: ['VEG', 'NON_VEG'] })
  @IsOptional()
  @IsEnum(['VEG', 'NON_VEG'])
  messType?: string;

  @ApiPropertyOptional({ enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'] })
  @IsOptional()
  @IsEnum(['DRAFT', 'ACTIVE', 'ARCHIVED'])
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

// ============================================================================
// Meal Scan DTOs
// ============================================================================

export class ScanMealDto {
  @ApiProperty({ description: 'Student ID to scan' })
  @IsUUID()
  studentId: string;

  @ApiProperty()
  @IsUUID()
  hostelId: string;

  @ApiProperty({ enum: ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'] })
  @IsEnum(['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'])
  mealType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceFingerprint?: string;
}

export class ScanGuestDto {
  @ApiProperty()
  @IsUUID()
  hostelId: string;

  @ApiProperty({ enum: ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'] })
  @IsEnum(['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'])
  mealType: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MaxLength(200)
  guestName: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  guestCount?: number;

  @ApiProperty({ description: 'Host student ID' })
  @IsUUID()
  studentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class QueryScansDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  hostelId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ enum: ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'] })
  @IsOptional()
  @IsEnum(['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'])
  mealType?: string;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isGuest?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

// ============================================================================
// Feedback DTOs
// ============================================================================

export class CreateFeedbackDto {
  @ApiProperty()
  @IsUUID()
  hostelId: string;

  @ApiProperty({ example: '2026-03-08' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'] })
  @IsEnum(['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'])
  mealType: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}

// ============================================================================
// Rebate DTOs
// ============================================================================

export class CreateRebateDto {
  @ApiProperty()
  @IsUUID()
  hostelId: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  fromDate: string;

  @ApiProperty({ example: '2026-03-05' })
  @IsDateString()
  toDate: string;

  @ApiProperty({ example: 'Home leave for family function' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Link to approved leave request' })
  @IsOptional()
  @IsUUID()
  leaveId?: string;
}

export class QueryRebatesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  hostelId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ enum: ['PENDING', 'APPROVED', 'REJECTED', 'CREDITED'] })
  @IsOptional()
  @IsEnum(['PENDING', 'APPROVED', 'REJECTED', 'CREDITED'])
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ReviewRebateDto {
  @ApiPropertyOptional({ description: 'Rebate amount to credit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

// ============================================================================
// Stats & Report DTOs
// ============================================================================

export class QueryStatsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  hostelId?: string;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class QueryReportDto {
  @ApiProperty()
  @IsUUID()
  hostelId: string;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ enum: ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'] })
  @IsOptional()
  @IsEnum(['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'])
  mealType?: string;
}
