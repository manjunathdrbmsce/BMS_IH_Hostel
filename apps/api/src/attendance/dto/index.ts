import {
    IsString,
    IsOptional,
    IsEnum,
    IsInt,
    IsNumber,
    IsUUID,
    IsDateString,
    Min,
    Max,
    MaxLength,
    MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ---------------------------------------------------------------------------
// Session DTOs
// ---------------------------------------------------------------------------

export class CreateSessionDto {
    @ApiProperty({ description: 'Hostel ID to run roll-call for' })
    @IsUUID()
    hostelId: string;

    @ApiPropertyOptional({ example: 'Evening Roll-Call', maxLength: 200 })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    title?: string;

    @ApiProperty({ description: 'GPS latitude of session location', example: 12.9716 })
    @IsNumber()
    gpsLat: number;

    @ApiProperty({ description: 'GPS longitude of session location', example: 77.5946 })
    @IsNumber()
    gpsLng: number;

    @ApiPropertyOptional({ description: 'Duration in minutes (default 5)', default: 5 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(60)
    @Type(() => Number)
    durationMin?: number;

    @ApiPropertyOptional({ description: 'GPS geofence radius in meters', default: 150 })
    @IsOptional()
    @IsInt()
    @Min(10)
    @Max(1000)
    @Type(() => Number)
    gpsRadiusM?: number;
}

// ---------------------------------------------------------------------------
// Mark Attendance DTO
// ---------------------------------------------------------------------------

export class MarkAttendanceDto {
    @ApiProperty({ description: 'The rotating session token from QR code' })
    @IsString()
    @MinLength(1)
    sessionToken: string;

    @ApiProperty({ description: 'Session ID' })
    @IsUUID()
    sessionId: string;

    @ApiProperty({ description: 'Device fingerprint hash' })
    @IsString()
    @MinLength(8)
    @MaxLength(255)
    deviceFingerprint: string;

    @ApiProperty({ description: 'Student GPS latitude', example: 12.9716 })
    @IsNumber()
    gpsLat: number;

    @ApiProperty({ description: 'Student GPS longitude', example: 77.5946 })
    @IsNumber()
    gpsLng: number;
}

// ---------------------------------------------------------------------------
// Device DTOs
// ---------------------------------------------------------------------------

export class RegisterDeviceDto {
    @ApiProperty({ description: 'Device fingerprint hash' })
    @IsString()
    @MinLength(8)
    @MaxLength(255)
    fingerprint: string;

    @ApiPropertyOptional({ example: 'Samsung Galaxy A52' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    deviceName?: string;

    @ApiPropertyOptional({ example: 'Android', enum: ['Android', 'iOS', 'Web'] })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    platform?: string;
}

export class RequestDeviceChangeDto {
    @ApiProperty({ description: 'New device fingerprint' })
    @IsString()
    @MinLength(8)
    @MaxLength(255)
    newFingerprint: string;

    @ApiPropertyOptional({ example: 'iPhone 14' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    newDeviceName?: string;

    @ApiPropertyOptional({ example: 'iOS' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    newPlatform?: string;

    @ApiPropertyOptional({ example: 'Lost my old phone' })
    @IsOptional()
    @IsString()
    reason?: string;
}

export class ReviewDeviceChangeDto {
    @ApiPropertyOptional({ description: 'Rejection reason (required when rejecting)' })
    @IsOptional()
    @IsString()
    reason?: string;
}

// ---------------------------------------------------------------------------
// Query DTOs
// ---------------------------------------------------------------------------

export class ListAttendanceQueryDto {
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

    @ApiPropertyOptional({ description: 'Filter by date (YYYY-MM-DD)' })
    @IsOptional()
    @IsDateString()
    date?: string;

    @ApiPropertyOptional({ description: 'Filter by hostel ID' })
    @IsOptional()
    @IsUUID()
    hostelId?: string;

    @ApiPropertyOptional({ enum: ['PRESENT', 'ABSENT', 'ON_LEAVE', 'LATE', 'UNKNOWN'] })
    @IsOptional()
    @IsEnum(['PRESENT', 'ABSENT', 'ON_LEAVE', 'LATE', 'UNKNOWN'])
    status?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;
}

export class StudentAttendanceQueryDto {
    @ApiPropertyOptional({ description: 'Start date' })
    @IsOptional()
    @IsDateString()
    from?: string;

    @ApiPropertyOptional({ description: 'End date' })
    @IsOptional()
    @IsDateString()
    to?: string;
}

export class ListDeviceRequestsQueryDto {
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

    @ApiPropertyOptional({ enum: ['PENDING', 'APPROVED', 'REJECTED'] })
    @IsOptional()
    @IsEnum(['PENDING', 'APPROVED', 'REJECTED'])
    status?: string;
}
