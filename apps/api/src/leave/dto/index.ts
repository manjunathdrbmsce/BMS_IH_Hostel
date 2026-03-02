import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsUUID,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ---------------------------------------------------------------------------
// Leave Request DTOs
// ---------------------------------------------------------------------------

export class CreateLeaveRequestDto {
  @ApiProperty({ description: 'Student user ID' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ description: 'Hostel ID the student belongs to' })
  @IsUUID()
  hostelId: string;

  @ApiProperty({ enum: ['HOME', 'MEDICAL', 'EMERGENCY', 'OTHER'] })
  @IsEnum(['HOME', 'MEDICAL', 'EMERGENCY', 'OTHER'])
  type: 'HOME' | 'MEDICAL' | 'EMERGENCY' | 'OTHER';

  @ApiProperty({ example: '2026-03-01', description: 'Leave start date' })
  @IsDateString()
  fromDate: string;

  @ApiProperty({ example: '2026-03-05', description: 'Leave end date' })
  @IsDateString()
  toDate: string;

  @ApiProperty({ example: 'Going home for family function' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'URL of proof/attachment (uploaded via /uploads)' })
  @IsOptional()
  @IsString()
  proofUrl?: string;
}

export class ApproveLeaveDto {
  @ApiPropertyOptional({ description: 'Optional notes from approver' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectLeaveDto {
  @ApiProperty({ description: 'Reason for rejection' })
  @IsString()
  rejectionReason: string;
}

export class ListLeaveQueryDto {
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
    enum: ['PENDING', 'PARENT_APPROVED', 'PARENT_REJECTED', 'WARDEN_APPROVED', 'REJECTED', 'CANCELLED'],
  })
  @IsOptional()
  @IsEnum(['PENDING', 'PARENT_APPROVED', 'PARENT_REJECTED', 'WARDEN_APPROVED', 'REJECTED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional({
    enum: ['HOME', 'MEDICAL', 'EMERGENCY', 'OTHER'],
  })
  @IsOptional()
  @IsEnum(['HOME', 'MEDICAL', 'EMERGENCY', 'OTHER'])
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
