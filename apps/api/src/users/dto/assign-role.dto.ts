import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignRoleDto {
    @ApiProperty({
        description: 'Role name to assign',
        example: 'WARDEN',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    roleName: string;

    @ApiPropertyOptional({
        description: 'ID of the hostel this role is scoped to (optional)',
        example: 'a1b2c3d4-1234-4567-8901-123456789abc',
    })
    @IsOptional()
    @IsUUID()
    hostelId?: string;
}
