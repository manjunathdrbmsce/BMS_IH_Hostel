import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  SubmitRegistrationDto,
  SaveDraftDto,
  PersonalDetailsDto,
  AcademicDetailsDto,
  FamilyDetailsDto,
  AddressGuardianDto,
  DeclarationsDto,
  CreateRegistrationDto,
} from './index';

/**
 * Registration DTO Validation Tests
 *
 * Validates Fix #8: SubmitRegistrationDto & SaveDraftDto must properly
 * validate nested objects using @ValidateNested + @Type decorators.
 *
 * Previously, the global ValidationPipe with `whitelist: true` silently
 * stripped nested objects because @ValidateNested/@Type/@IsDefined were missing.
 */
describe('Registration DTOs (Fix #8)', () => {
  // ── Helper ──────────────────────────────────────────────────────────

  const validPersonal = {
    dateOfBirth: '2002-05-15',
    gender: 'Male',
    bloodGroup: 'O+',
  };

  const validAcademic = {
    department: 'Computer Science',
    course: 'B.E.',
    year: 1,
    semester: 1,
  };

  const validFamily = {
    fatherName: 'Raghunath Prasad',
    motherName: 'Shanta Prasad',
  };

  const validAddress = {
    permanentAddress: 'No. 42, Jayanagar, Bengaluru',
  };

  const validDeclarations = {
    hosteliteDeclarationAccepted: true,
    antiRaggingStudentAccepted: true,
    antiRaggingParentAccepted: true,
    hostelAgreementAccepted: true,
    raggingPreventionAccepted: true,
  };

  const validRegistration = {
    academicYear: '2025-2026',
  };

  // =====================================================================
  // SubmitRegistrationDto — required nested validation
  // =====================================================================
  describe('SubmitRegistrationDto', () => {
    it('should pass validation with all required nested fields', async () => {
      const dto = plainToInstance(SubmitRegistrationDto, {
        personalDetails: validPersonal,
        academicDetails: validAcademic,
        familyDetails: validFamily,
        addressGuardian: validAddress,
        declarations: validDeclarations,
        registration: validRegistration,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should FAIL when personalDetails is missing (Fix #8 - @IsDefined)', async () => {
      const dto = plainToInstance(SubmitRegistrationDto, {
        academicDetails: validAcademic,
        familyDetails: validFamily,
        addressGuardian: validAddress,
        declarations: validDeclarations,
        registration: validRegistration,
      });

      const errors = await validate(dto);
      const personalError = errors.find((e) => e.property === 'personalDetails');
      expect(personalError).toBeDefined();
    });

    it('should FAIL when academicDetails is missing', async () => {
      const dto = plainToInstance(SubmitRegistrationDto, {
        personalDetails: validPersonal,
        familyDetails: validFamily,
        addressGuardian: validAddress,
        declarations: validDeclarations,
        registration: validRegistration,
      });

      const errors = await validate(dto);
      const academicError = errors.find((e) => e.property === 'academicDetails');
      expect(academicError).toBeDefined();
    });

    it('should FAIL when declarations is missing', async () => {
      const dto = plainToInstance(SubmitRegistrationDto, {
        personalDetails: validPersonal,
        academicDetails: validAcademic,
        familyDetails: validFamily,
        addressGuardian: validAddress,
        registration: validRegistration,
      });

      const errors = await validate(dto);
      const declError = errors.find((e) => e.property === 'declarations');
      expect(declError).toBeDefined();
    });

    it('should VALIDATE nested object fields (Fix #8 - @ValidateNested)', async () => {
      const dto = plainToInstance(SubmitRegistrationDto, {
        personalDetails: { dateOfBirth: 'not-a-date', gender: 123, bloodGroup: 'O+' }, // invalid dateOfBirth
        academicDetails: validAcademic,
        familyDetails: validFamily,
        addressGuardian: validAddress,
        declarations: validDeclarations,
        registration: validRegistration,
      });

      const errors = await validate(dto);
      // Should have nested validation errors for personalDetails.dateOfBirth
      const personalError = errors.find((e) => e.property === 'personalDetails');
      expect(personalError).toBeDefined();
      expect(personalError!.children).toBeDefined();
      expect(personalError!.children!.length).toBeGreaterThan(0);
    });

    it('should TRANSFORM nested objects via @Type (Fix #8)', async () => {
      const plain = {
        personalDetails: validPersonal,
        academicDetails: { ...validAcademic, year: '2', semester: '3' }, // string that should transform
        familyDetails: validFamily,
        addressGuardian: validAddress,
        declarations: validDeclarations,
        registration: validRegistration,
      };

      const dto = plainToInstance(SubmitRegistrationDto, plain);

      // The nested object should be an instance of AcademicDetailsDto, not a plain object
      expect(dto.academicDetails).toBeInstanceOf(AcademicDetailsDto);
      expect(dto.personalDetails).toBeInstanceOf(PersonalDetailsDto);
      expect(dto.familyDetails).toBeInstanceOf(FamilyDetailsDto);
      expect(dto.addressGuardian).toBeInstanceOf(AddressGuardianDto);
      expect(dto.declarations).toBeInstanceOf(DeclarationsDto);
      expect(dto.registration).toBeInstanceOf(CreateRegistrationDto);
    });

    it('should allow optional documents field to be omitted', async () => {
      const dto = plainToInstance(SubmitRegistrationDto, {
        personalDetails: validPersonal,
        academicDetails: validAcademic,
        familyDetails: validFamily,
        addressGuardian: validAddress,
        declarations: validDeclarations,
        registration: validRegistration,
        // documents omitted
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate nested academic year constraints (min 1, max 6)', async () => {
      const dto = plainToInstance(SubmitRegistrationDto, {
        personalDetails: validPersonal,
        academicDetails: { ...validAcademic, year: -1, semester: 0 },
        familyDetails: validFamily,
        addressGuardian: validAddress,
        declarations: validDeclarations,
        registration: validRegistration,
      });

      const errors = await validate(dto);
      const academicError = errors.find((e) => e.property === 'academicDetails');
      expect(academicError).toBeDefined();
      expect(academicError!.children!.length).toBeGreaterThan(0);
    });

    it('should reject when academicYear length is wrong', async () => {
      const dto = plainToInstance(SubmitRegistrationDto, {
        personalDetails: validPersonal,
        academicDetails: validAcademic,
        familyDetails: validFamily,
        addressGuardian: validAddress,
        declarations: validDeclarations,
        registration: { academicYear: '2025' }, // too short, needs exactly 9 chars
      });

      const errors = await validate(dto);
      const regError = errors.find((e) => e.property === 'registration');
      expect(regError).toBeDefined();
    });
  });

  // =====================================================================
  // SaveDraftDto — all fields optional but validated when present
  // =====================================================================
  describe('SaveDraftDto', () => {
    it('should pass with empty object (all optional)', async () => {
      const dto = plainToInstance(SaveDraftDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with partial nested fields', async () => {
      const dto = plainToInstance(SaveDraftDto, {
        personalDetails: validPersonal,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should VALIDATE nested fields when present (Fix #8)', async () => {
      const dto = plainToInstance(SaveDraftDto, {
        academicDetails: { department: '', course: '', year: -5, semester: 0 },
      });

      const errors = await validate(dto);
      const academicError = errors.find((e) => e.property === 'academicDetails');
      expect(academicError).toBeDefined();
      // Should have children errors for the invalid nested fields
      expect(academicError!.children).toBeDefined();
      expect(academicError!.children!.length).toBeGreaterThan(0);
    });

    it('should TRANSFORM nested objects via @Type for SaveDraftDto (Fix #8)', async () => {
      const dto = plainToInstance(SaveDraftDto, {
        personalDetails: validPersonal,
        academicDetails: validAcademic,
      });

      expect(dto.personalDetails).toBeInstanceOf(PersonalDetailsDto);
      expect(dto.academicDetails).toBeInstanceOf(AcademicDetailsDto);
    });
  });

  // =====================================================================
  // Individual nested DTOs
  // =====================================================================
  describe('PersonalDetailsDto', () => {
    it('should validate required fields', async () => {
      const dto = plainToInstance(PersonalDetailsDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const fields = errors.map((e) => e.property);
      expect(fields).toContain('dateOfBirth');
      expect(fields).toContain('gender');
      expect(fields).toContain('bloodGroup');
    });

    it('should accept valid personal details', async () => {
      const dto = plainToInstance(PersonalDetailsDto, validPersonal);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('AcademicDetailsDto', () => {
    it('should reject year outside 1-6 range', async () => {
      const dto = plainToInstance(AcademicDetailsDto, { ...validAcademic, year: 0 });
      const errors = await validate(dto);
      expect(errors.find((e) => e.property === 'year')).toBeDefined();
    });

    it('should reject semester outside 1-12 range', async () => {
      const dto = plainToInstance(AcademicDetailsDto, { ...validAcademic, semester: 13 });
      const errors = await validate(dto);
      expect(errors.find((e) => e.property === 'semester')).toBeDefined();
    });

    it('should reject negative year', async () => {
      const dto = plainToInstance(AcademicDetailsDto, { ...validAcademic, year: -1 });
      const errors = await validate(dto);
      expect(errors.find((e) => e.property === 'year')).toBeDefined();
    });
  });

  describe('DeclarationsDto', () => {
    it('should require all boolean acceptances', async () => {
      const dto = plainToInstance(DeclarationsDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThanOrEqual(5);
    });

    it('should pass with all true', async () => {
      const dto = plainToInstance(DeclarationsDto, validDeclarations);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
