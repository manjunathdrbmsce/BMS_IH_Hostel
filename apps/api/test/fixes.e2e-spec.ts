import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Bug Fixes E2E Tests
 *
 * Validates the 3 backend fixes against a real running app:
 *  - Fix #4: Allotment assign/transfer — no "Assignment not found" after creation
 *  - Fix #6: Complaints — non-resident student cannot file complaint
 *  - Fix #8: Registration DTO — nested objects are validated, not stripped
 *
 * Prerequisites: PostgreSQL running with migrated schema and seed data.
 * Run: pnpm --filter api test:e2e
 */
describe('Bug Fixes (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();

    // Login as admin
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: 'admin@bms.local', password: 'Admin@123456' });

    adminToken = loginRes.body.data?.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // =====================================================================
  // Fix #8: Registration DTO nested validation
  // =====================================================================
  describe('Fix #8: Registration DTO Validation', () => {
    it('POST /registration/submit should reject empty nested objects', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/registration/submit')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          personalDetails: {},
          academicDetails: {},
          familyDetails: {},
          addressGuardian: {},
          declarations: {},
          registration: {},
        });

      // Should return 400, NOT 201 (which was the pre-fix behavior)
      expect(res.status).toBe(400);
    });

    it('POST /registration/submit should reject when required nested fields are missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/registration/submit')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // Missing personalDetails, academicDetails, etc.
          registration: { academicYear: '2025-2026' },
        });

      expect(res.status).toBe(400);
    });

    it('POST /registration/draft should accept empty body (all optional)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/registration/draft')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      // Should not be a validation error — all fields are optional in SaveDraftDto
      expect(res.status).not.toBe(400);
    });

    it('POST /registration/draft should validate nested objects when present', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/registration/draft')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          academicDetails: { year: -5, semester: 0 }, // invalid values
        });

      expect(res.status).toBe(400);
    });
  });

  // =====================================================================
  // Fix #6: Complaints — non-resident cannot file
  // =====================================================================
  describe('Fix #6: Complaint Bed Assignment Guard', () => {
    it('POST /complaints should reject when student has no bed in hostel', async () => {
      // Use a fake student ID that doesn't have a bed assignment
      const res = await request(app.getHttpServer())
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: '00000000-0000-0000-0000-000000000000', // non-existent
          hostelId: '00000000-0000-0000-0000-000000000000',
          category: 'MAINTENANCE',
          subject: 'Test complaint',
          description: 'This should be rejected',
        });

      // Should be 404 (student not found) or 400 (no bed assignment)
      expect([400, 404]).toContain(res.status);
    });

    it('POST /complaints should require both studentId and hostelId', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: 'MAINTENANCE',
          subject: 'Test complaint',
          description: 'Missing student and hostel',
        });

      expect(res.status).toBe(400);
    });
  });

  // =====================================================================
  // Fix #4: Allotment assign should not return "Assignment not found"
  // =====================================================================
  describe('Fix #4: Allotment Transaction Read-After-Write', () => {
    it('POST /allotments/assign should return proper error for invalid student', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/allotments/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: '00000000-0000-0000-0000-000000000000',
          bedId: '00000000-0000-0000-0000-000000000000',
        });

      // Should be 404 (student not found), NOT "Assignment not found" from transaction bug
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
      // Should NOT contain "Assignment not found" — that was the pre-fix bug
      expect(res.body.message).not.toMatch(/assignment not found/i);
    });

    it('POST /allotments/assign should reject non-UUID studentId', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/allotments/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: 'not-a-uuid',
          bedId: 'also-not-uuid',
        });

      expect(res.status).toBe(400);
    });

    it('POST /allotments/transfer should reject non-UUID fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/allotments/transfer')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: 'not-a-uuid',
          newBedId: 'also-not-uuid',
        });

      expect(res.status).toBe(400);
    });
  });
});
