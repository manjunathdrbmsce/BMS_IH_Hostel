import {
  IsBoolean,
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsUUID,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ---------------------------------------------------------------------------
// Complaint DTOs
// ---------------------------------------------------------------------------

export class CreateComplaintDto {
  @ApiProperty({ description: 'Student user ID' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ description: 'Hostel ID' })
  @IsUUID()
  hostelId: string;

  @ApiProperty({ enum: ['MAINTENANCE', 'ELECTRICAL', 'PLUMBING', 'MESS', 'HYGIENE', 'SECURITY', 'OTHER'] })
  @IsEnum(['MAINTENANCE', 'ELECTRICAL', 'PLUMBING', 'MESS', 'HYGIENE', 'SECURITY', 'OTHER'])
  category: string;

  @ApiProperty({ example: 'Water leaking from ceiling' })
  @IsString()
  @MaxLength(200)
  subject: string;

  @ApiProperty({ example: 'Water is continuously leaking from the ceiling in room 201...' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  priority?: string;

  @ApiPropertyOptional({ description: 'Submit complaint anonymously', default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}

export class UpdateComplaintDto {
  @ApiPropertyOptional({ enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'] })
  @IsOptional()
  @IsEnum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Assign to a staff user ID' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  priority?: string;

  @ApiPropertyOptional({ description: 'Resolution notes (when resolving)' })
  @IsOptional()
  @IsString()
  resolution?: string;
}

export class AddCommentDto {
  @ApiProperty({ description: 'Comment message' })
  @IsString()
  message: string;
}

export class ListComplaintsQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by hostel ID' })
  @IsOptional()
  @IsUUID()
  hostelId?: string;

  @ApiPropertyOptional({
    enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'],
  })
  @IsOptional()
  @IsEnum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'])
  status?: string;

  @ApiPropertyOptional({
    enum: ['MAINTENANCE', 'ELECTRICAL', 'PLUMBING', 'MESS', 'HYGIENE', 'SECURITY', 'OTHER'],
  })
  @IsOptional()
  @IsEnum(['MAINTENANCE', 'ELECTRICAL', 'PLUMBING', 'MESS', 'HYGIENE', 'SECURITY', 'OTHER'])
  category?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
