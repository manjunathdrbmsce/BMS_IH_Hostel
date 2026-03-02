import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
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
        example: 'a1b2c3d4-...',
    })
    @IsString()
    @IsOptional()
    hostelId?: string;
}
