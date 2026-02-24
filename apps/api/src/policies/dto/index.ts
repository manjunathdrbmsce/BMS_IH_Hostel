import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUUID,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ---------------------------------------------------------------------------
// Building Policy DTOs
// ---------------------------------------------------------------------------

export class CreatePolicyDto {
  @ApiProperty({ description: 'Building ID this policy applies to' })
  @IsUUID()
  buildingId: string;

  // Curfew
  @ApiPropertyOptional({ example: '22:00', description: 'Weekday curfew time (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'weekdayCurfew must be in HH:mm format' })
  weekdayCurfew?: string;

  @ApiPropertyOptional({ example: '23:00', description: 'Weekend curfew time (HH:mm)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'weekendCurfew must be in HH:mm format' })
  weekendCurfew?: string;

  @ApiPropertyOptional({ example: 15, description: 'Grace period in minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  @Type(() => Number)
  toleranceMin?: number;

  // Leave
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  parentApprovalRequired?: boolean;

  @ApiPropertyOptional({ example: 7, description: 'Max leave days per request' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  @Type(() => Number)
  maxLeaveDays?: number;

  // Escalation
  @ApiPropertyOptional({ example: 30, description: 'Minutes late before warden escalation' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(180)
  @Type(() => Number)
  wardenEscalationMin?: number;

  @ApiPropertyOptional({ example: 3, description: 'Repeated violation threshold' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  repeatedViolationThreshold?: number;

  // Notifications
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  notifyParentOnExit?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  notifyParentOnEntry?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  notifyParentOnLate?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  notifyWardenOnLate?: boolean;

  @ApiPropertyOptional({ example: 'Holiday exception: extended curfew' })
  @IsOptional()
  @IsString()
  overrideNotes?: string;
}

export class UpdatePolicyDto extends PartialType(CreatePolicyDto) {}

export class ListPoliciesQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by building ID' })
  @IsOptional()
  @IsUUID()
  buildingId?: string;

  @ApiPropertyOptional({ description: 'Only active policies' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activeOnly?: boolean;
}
