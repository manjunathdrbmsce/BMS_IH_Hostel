import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsEmail,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// ============================================================================
// Enums mirrored from Prisma
// ============================================================================

export enum AdmissionModeDto {
  CET = 'CET',
  COMEDK = 'COMEDK',
  MANAGEMENT = 'MANAGEMENT',
  NRI = 'NRI',
  NRI_SPONSORED = 'NRI_SPONSORED',
  PIO = 'PIO',
  FOREIGN_NATIONAL = 'FOREIGN_NATIONAL',
  OTHER = 'OTHER',
}

export enum RegistrationStatusDto {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  DOCUMENTS_PENDING = 'DOCUMENTS_PENDING',
  APPROVED = 'APPROVED',
  ALLOTTED = 'ALLOTTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  WAITLISTED = 'WAITLISTED',
}

// ============================================================================
// Step 1: Personal Details
// ============================================================================

export class PersonalDetailsDto {
  @ApiProperty({ example: '2002-05-15' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ example: 'Male' })
  @IsString()
  gender: string;

  @ApiProperty({ example: 'O+' })
  @IsString()
  @MaxLength(5)
  bloodGroup: string;

  @ApiPropertyOptional({ example: 'Kannada' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  motherTongue?: string;

  @ApiPropertyOptional({ example: 'Indian' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nationality?: string;

  @ApiPropertyOptional({ example: 'Hindu' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  religion?: string;

  @ApiPropertyOptional({ example: 'GM' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  category?: string;

  @ApiPropertyOptional({ example: 85.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  pucPercentage?: number;

  @ApiPropertyOptional({ enum: AdmissionModeDto })
  @IsOptional()
  @IsEnum(AdmissionModeDto)
  admissionMode?: AdmissionModeDto;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;
}

// ============================================================================
// Step 2: Academic Details
// ============================================================================

export class AcademicDetailsDto {
  @ApiProperty({ example: 'Computer Science & Engineering' })
  @IsString()
  @MaxLength(100)
  department: string;

  @ApiProperty({ example: 'B.E.' })
  @IsString()
  @MaxLength(100)
  course: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  @Max(6)
  year: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  @Max(12)
  semester: number;

  @ApiPropertyOptional({ example: '2025-08-01' })
  @IsOptional()
  @IsDateString()
  admissionDate?: string;
}

// ============================================================================
// Step 3: Family Details
// ============================================================================

export class FamilyDetailsDto {
  @ApiProperty({ example: 'Raghunath Prasad' })
  @IsString()
  @MaxLength(200)
  fatherName: string;

  @ApiProperty({ example: 'Shanta Prasad' })
  @IsString()
  @MaxLength(200)
  motherName: string;

  @ApiPropertyOptional({ example: 'Engineer' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fatherOccupation?: string;

  @ApiPropertyOptional({ example: 'Teacher' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  motherOccupation?: string;

  @ApiPropertyOptional({ example: 'father@example.com' })
  @IsOptional()
  @IsEmail()
  fatherEmail?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  fatherMobile?: string;

  @ApiPropertyOptional({ example: '080-26622100' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  fatherLandline?: string;

  @ApiPropertyOptional({ example: 'mother@example.com' })
  @IsOptional()
  @IsEmail()
  motherEmail?: string;

  @ApiPropertyOptional({ example: '9876543211' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  motherMobile?: string;

  @ApiPropertyOptional({ example: '080-26622101' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  motherLandline?: string;
}

// ============================================================================
// Step 4: Address & Guardian
// ============================================================================

export class AddressGuardianDto {
  @ApiProperty({ example: 'No. 42, Jayanagar 4th Block, Bengaluru 560041' })
  @IsString()
  permanentAddress: string;

  @ApiPropertyOptional({ example: 'Same as permanent address' })
  @IsOptional()
  @IsString()
  communicationAddress?: string;

  @ApiPropertyOptional({ example: '9876543212' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  emergencyContact?: string;

  // Local guardian
  @ApiPropertyOptional({ example: 'Suresh Kumar' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  localGuardianName?: string;

  @ApiPropertyOptional({ example: '#15, MG Road, Bengaluru' })
  @IsOptional()
  @IsString()
  localGuardianAddress?: string;

  @ApiPropertyOptional({ example: '9876543213' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  localGuardianMobile?: string;

  @ApiPropertyOptional({ example: '080-26622102' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  localGuardianLandline?: string;

  @ApiPropertyOptional({ example: 'guardian@example.com' })
  @IsOptional()
  @IsEmail()
  localGuardianEmail?: string;

  @ApiPropertyOptional({ example: 'Known medical conditions' })
  @IsOptional()
  @IsString()
  medicalConditions?: string;
}

// ============================================================================
// Step 5: Documents (International Students)
// ============================================================================

export class DocumentsDto {
  @ApiPropertyOptional({ example: 'J12345678' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  passportNo?: string;

  @ApiPropertyOptional({ example: 'Student visa valid until 2027-06-30' })
  @IsOptional()
  @IsString()
  visaDetails?: string;

  @ApiPropertyOptional({ example: 'FRRO permit no. XYZ123' })
  @IsOptional()
  @IsString()
  residentialPermit?: string;
}

// ============================================================================
// Step 6: Declarations
// ============================================================================

export class DeclarationsDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  hosteliteDeclarationAccepted: boolean;

  @ApiPropertyOptional({ example: '/uploads/documents/hostelite-decl.pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  hosteliteDeclarationDocUrl?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  antiRaggingStudentAccepted: boolean;

  @ApiPropertyOptional({ example: '/uploads/documents/anti-ragging-student.pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  antiRaggingStudentDocUrl?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  antiRaggingParentAccepted: boolean;

  @ApiPropertyOptional({ example: '/uploads/documents/anti-ragging-parent.pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  antiRaggingParentDocUrl?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  hostelAgreementAccepted: boolean;

  @ApiPropertyOptional({ example: '/uploads/documents/hostel-agreement.pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  hostelAgreementDocUrl?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  raggingPreventionAccepted: boolean;

  @ApiPropertyOptional({ example: '/uploads/documents/ragging-prevention.pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  raggingPreventionDocUrl?: string;
}

// ============================================================================
// Combined: Create / Update Registration
// ============================================================================

export class CreateRegistrationDto {
  @ApiProperty({ example: '2025-2026' })
  @IsString()
  @MinLength(9)
  @MaxLength(9)
  academicYear: string;

  @ApiPropertyOptional({ description: 'Preferred hostel ID' })
  @IsOptional()
  @IsUUID()
  hostelId?: string;

  @ApiPropertyOptional({ example: 'DOUBLE' })
  @IsOptional()
  @IsString()
  roomTypePreference?: string;

  @ApiPropertyOptional({ example: 'VEG' })
  @IsOptional()
  @IsString()
  messType?: string;

  @ApiPropertyOptional({ example: 'Stayed in Krishna Hostel 2024-2025' })
  @IsOptional()
  @IsString()
  previousHostelHistory?: string;
}

export class SaveDraftDto {
  @ApiPropertyOptional()
  @IsOptional()
  personalDetails?: PersonalDetailsDto;

  @ApiPropertyOptional()
  @IsOptional()
  academicDetails?: AcademicDetailsDto;

  @ApiPropertyOptional()
  @IsOptional()
  familyDetails?: FamilyDetailsDto;

  @ApiPropertyOptional()
  @IsOptional()
  addressGuardian?: AddressGuardianDto;

  @ApiPropertyOptional()
  @IsOptional()
  documents?: DocumentsDto;

  @ApiPropertyOptional()
  @IsOptional()
  declarations?: DeclarationsDto;

  @ApiPropertyOptional()
  @IsOptional()
  registration?: CreateRegistrationDto;
}

export class SubmitRegistrationDto {
  @ApiProperty()
  personalDetails: PersonalDetailsDto;

  @ApiProperty()
  academicDetails: AcademicDetailsDto;

  @ApiProperty()
  familyDetails: FamilyDetailsDto;

  @ApiProperty()
  addressGuardian: AddressGuardianDto;

  @ApiPropertyOptional()
  @IsOptional()
  documents?: DocumentsDto;

  @ApiProperty()
  declarations: DeclarationsDto;

  @ApiProperty()
  registration: CreateRegistrationDto;
}

// ============================================================================
// Admin: Review Registration
// ============================================================================

export class ReviewRegistrationDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED', 'DOCUMENTS_PENDING', 'WAITLISTED'] })
  @IsEnum(['APPROVED', 'REJECTED', 'DOCUMENTS_PENDING', 'WAITLISTED'] as const)
  status: 'APPROVED' | 'REJECTED' | 'DOCUMENTS_PENDING' | 'WAITLISTED';

  @ApiPropertyOptional({ example: 'All documents verified' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @ApiPropertyOptional({ example: 'Insufficient documents' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

// ============================================================================
// Admin: Allot Room after approval
// ============================================================================

export class AllotRegistrationDto {
  @ApiProperty({ description: 'Hostel ID for allotment' })
  @IsUUID()
  hostelId: string;

  @ApiProperty({ description: 'Bed ID' })
  @IsUUID()
  bedId: string;

  @ApiPropertyOptional({ example: 'IH-2026-0001' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  hostelIdNo?: string;

  @ApiPropertyOptional({ example: 'MR-0001' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  messRollNo?: string;
}

// ============================================================================
// Admin: Record Fee Payment
// ============================================================================

export class RecordFeeDto {
  @ApiProperty({ description: 'Registration ID' })
  @IsUUID()
  registrationId: string;

  @ApiProperty({ enum: ['HOSTEL_FEE', 'MESS_FEE', 'CAUTION_DEPOSIT', 'OTHER'] })
  @IsString()
  feeType: string;

  @ApiProperty({ example: 45000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 'RCP-2026-0001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  receiptNo?: string;

  @ApiPropertyOptional({ example: '2026-02-26' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// Query DTOs
// ============================================================================

export class ListRegistrationsQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: RegistrationStatusDto })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: '2025-2026' })
  @IsOptional()
  @IsString()
  academicYear?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  hostelId?: string;
}
