# Student Year Semester Validation

## Summary

Added conditional validation for student academic year and semester while creating or updating student profiles.

## Rule

The semester must match the selected academic year:

| Year | Allowed Semesters |
|---|---|
| 1st Year | 1, 2 |
| 2nd Year | 3, 4 |
| 3rd Year | 5, 6 |
| 4th Year | 7, 8 |

Semester is rejected when submitted without year.

## Frontend Changes

File:

- `apps/web/src/app/dashboard/students/page.tsx`

Changes:

- Restricted year options to 1st through 4th year.
- Made the semester dropdown depend on the selected year.
- Reset semester when year changes.
- Added submit-time validation before creating the student profile.

## Backend Changes

Files:

- `apps/api/src/students/dto/index.ts`
- `apps/api/src/students/students.service.ts`

Changes:

- Restricted `year` DTO validation to 1 through 4.
- Restricted `semester` DTO validation to 1 through 8.
- Added service-level validation for `createProfile`.
- Added service-level validation for `updateProfile`.
- Rejected `semester` when `year` is missing from the same request.

## Expected Result

Invalid combinations such as these are blocked:

```text
Year 1 + Semester 3
Year 2 + Semester 5
Year 4 + Semester 2
Semester 6 without Year
```

Valid combinations continue to work:

```text
Year 1 + Semester 1
Year 2 + Semester 4
Year 3 + Semester 6
Year 4 + Semester 8
```
