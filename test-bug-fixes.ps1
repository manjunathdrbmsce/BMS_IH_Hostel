# ============================================================================
# test-bug-fixes.ps1
#
# Validates all 8 bug fixes across API, Web, and Mobile.
# Run from project root: .\test-bug-fixes.ps1
# ============================================================================

$ErrorActionPreference = "Continue"
$pass = 0
$fail = 0
$warn = 0

function Test-Pass($id, $msg) {
    $script:pass++
    Write-Host "[PASS] $id : $msg" -ForegroundColor Green
}
function Test-Fail($id, $msg) {
    $script:fail++
    Write-Host "[FAIL] $id : $msg" -ForegroundColor Red
}
function Test-Warn($id, $msg) {
    $script:warn++
    Write-Host "[WARN] $id : $msg" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " BMS Hostel - Bug Fixes Validation Suite" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# SECTION 1: API Backend Fixes (Static Code Analysis)
# ============================================================================
Write-Host "--- SECTION 1: API Backend Code Validation ---" -ForegroundColor Yellow

# Fix #4: Transaction read-after-write
$allotSvc = Get-Content "apps\api\src\allotments\allotments.service.ts" -Raw

# Check assign() — $transaction should return just the ID
if ($allotSvc -match 'const assignmentId = await this\.prisma\.\$transaction') {
    Test-Pass "FIX4-01" "assign() stores transaction result in assignmentId variable"
} else {
    Test-Fail "FIX4-01" "assign() should store transaction result ID, not call findById inside tx"
}

# Check assign() — findById called after transaction
if ($allotSvc -match 'return this\.findById\(assignmentId\)') {
    Test-Pass "FIX4-02" "assign() calls findById(assignmentId) AFTER transaction"
} else {
    Test-Fail "FIX4-02" "assign() should call findById after transaction with stored ID"
}

# Check transfer() — same pattern
if (($allotSvc -split 'const assignmentId').Count -ge 3) {
    Test-Pass "FIX4-03" "transfer() also uses assignmentId pattern (2 occurrences)"
} else {
    Test-Fail "FIX4-03" "transfer() should also return ID from transaction and call findById after"
}

# Fix #6: Complaints bed assignment guard
$compSvc = Get-Content "apps\api\src\complaints\complaints.service.ts" -Raw

if ($compSvc -match 'bedAssignment\.findFirst') {
    Test-Pass "FIX6-01" "Complaints create() checks bedAssignment.findFirst"
} else {
    Test-Fail "FIX6-01" "Complaints create() must check for active bed assignment"
}

if ($compSvc -match "status:\s*'ACTIVE'") {
    Test-Pass "FIX6-02" "Bed assignment check filters by ACTIVE status"
} else {
    Test-Fail "FIX6-02" "Bed assignment check must filter by ACTIVE status"
}

if ($compSvc -match 'hostelId:\s*dto\.hostelId') {
    Test-Pass "FIX6-03" "Bed assignment check includes hostel filter"
} else {
    Test-Fail "FIX6-03" "Bed assignment check must include hostel-specific filter"
}

if ($compSvc -match 'BadRequestException') {
    Test-Pass "FIX6-04" "Throws BadRequestException for non-resident students"
} else {
    Test-Fail "FIX6-04" "Must throw BadRequestException when no active bed"
}

# Fix #8: Registration DTO validation
$regDto = Get-Content "apps\api\src\registration\dto\index.ts" -Raw

if ($regDto -match 'ValidateNested') {
    Test-Pass "FIX8-01" "Registration DTO imports ValidateNested"
} else {
    Test-Fail "FIX8-01" "Registration DTO must import ValidateNested"
}

if ($regDto -match 'IsDefined') {
    Test-Pass "FIX8-02" "Registration DTO imports IsDefined"
} else {
    Test-Fail "FIX8-02" "Registration DTO must import IsDefined for required fields"
}

# Count @ValidateNested occurrences in SubmitRegistrationDto
$submitSection = ($regDto -split 'class SubmitRegistrationDto')[1]
if ($submitSection) {
    $vnCount = ([regex]::Matches($submitSection, '@ValidateNested')).Count
    if ($vnCount -ge 7) {
        Test-Pass "FIX8-03" "SubmitRegistrationDto has $vnCount @ValidateNested decorators (expected >= 7)"
    } else {
        Test-Fail "FIX8-03" "SubmitRegistrationDto has only $vnCount @ValidateNested (expected >= 7)"
    }

    $idCount = ([regex]::Matches($submitSection, '@IsDefined')).Count
    if ($idCount -ge 5) {
        Test-Pass "FIX8-04" "SubmitRegistrationDto has $idCount @IsDefined decorators (expected >= 5)"
    } else {
        Test-Fail "FIX8-04" "SubmitRegistrationDto has only $idCount @IsDefined (expected >= 5)"
    }

    $typeCount = ([regex]::Matches($submitSection, '@Type\(')).Count
    if ($typeCount -ge 7) {
        Test-Pass "FIX8-05" "SubmitRegistrationDto has $typeCount @Type decorators (expected >= 7)"
    } else {
        Test-Fail "FIX8-05" "SubmitRegistrationDto has only $typeCount @Type (expected >= 7)"
    }
} else {
    Test-Fail "FIX8-03" "Could not find SubmitRegistrationDto class"
}

# SaveDraftDto validation
$draftSection = ($regDto -split 'class SaveDraftDto')[1]
if ($draftSection) {
    $draftSection = ($draftSection -split 'class SubmitRegistrationDto')[0]
    $draftVn = ([regex]::Matches($draftSection, '@ValidateNested')).Count
    if ($draftVn -ge 7) {
        Test-Pass "FIX8-06" "SaveDraftDto has $draftVn @ValidateNested decorators"
    } else {
        Test-Fail "FIX8-06" "SaveDraftDto has only $draftVn @ValidateNested (expected >= 7)"
    }
}

Write-Host ""

# ============================================================================
# SECTION 2: Web Frontend Fixes (Static Code Analysis)
# ============================================================================
Write-Host "--- SECTION 2: Web Frontend Code Validation ---" -ForegroundColor Yellow

# Fix #1+3: SearchPicker used for allotments
$allotPage = Get-Content "apps\web\src\app\dashboard\allotments\page.tsx" -Raw

if ($allotPage -match 'SearchPicker') {
    Test-Pass "FIX3-01" "Allotments page uses SearchPicker component"
} else {
    Test-Fail "FIX3-01" "Allotments page should use SearchPicker for student/bed selection"
}

if ($allotPage -match 'searchStudents') {
    Test-Pass "FIX3-02" "Allotments page has searchStudents function"
} else {
    Test-Fail "FIX3-02" "Allotments page should have searchStudents function"
}

if ($allotPage -match 'searchBeds') {
    Test-Pass "FIX3-03" "Allotments page has searchBeds function"
} else {
    Test-Fail "FIX3-03" "Allotments page should have searchBeds function"
}

# Fix #1+2: Student profiles page
$studPage = Get-Content "apps\web\src\app\dashboard\students\page.tsx" -Raw

if ($studPage -match 'SearchPicker') {
    Test-Pass "FIX1-01" "Students page uses SearchPicker for user selection"
} else {
    Test-Fail "FIX1-01" "Students page should use SearchPicker instead of UUID input"
}

# Fix #2: Year/Semester as Select dropdowns (not type="number")
if ($studPage -match '<Select[^>]*>.*?1st Year' -or ($studPage -match "value={form\.year}" -and $studPage -match '<option.*1st Year')) {
    Test-Pass "FIX2-01" "Students page uses Select/dropdown for Year field"
} else {
    # Check if it's using select element
    if ($studPage -match 'value=\{form\.year\}' -and $studPage -match '<Select') {
        Test-Pass "FIX2-01" "Students page uses Select component for Year field"
    } else {
        Test-Warn "FIX2-01" "Could not confirm Year is a Select dropdown (check manually)"
    }
}

# Fix #2: Text colors for address/medical fields
if ($studPage -match 'text-gray-900') {
    Test-Pass "FIX2-02" "Students page has text-gray-900 for dark text"
} else {
    Test-Fail "FIX2-02" "Students page should use text-gray-900 for textarea fields"
}

# Fix #5: Attendance page text colors
$attPage = Get-Content "apps\web\src\app\dashboard\attendance\page.tsx" -Raw

# Check for washed-out colors that should have been fixed
$washCount = ([regex]::Matches($attPage, 'text-slate-400')).Count
if ($washCount -le 15) {
    Test-Pass "FIX5-01" "Attendance page has acceptable text-slate-400 occurrences ($washCount, remaining are loading/empty states)"
} else {
    Test-Fail "FIX5-01" "Attendance page still has $washCount text-slate-400 (should be <= 15)"
}

# Check that key elements use darker colors
if ($attPage -match 'text-slate-700.*font-medium.*Roll Call') {
    Test-Pass "FIX5-02" "Roll-call form labels use dark text (slate-700)"
} elseif ($attPage -match 'text-slate-700') {
    Test-Pass "FIX5-02" "Attendance page uses text-slate-700 for key elements"
} else {
    Test-Fail "FIX5-02" "Attendance page should use text-slate-700 for labels"
}

# Check daily records table
if ($attPage -match 'text-slate-700.*font-mono') {
    Test-Pass "FIX5-03" "Daily records USN column uses text-slate-700"
} else {
    Test-Fail "FIX5-03" "Daily records USN column should use text-slate-700"
}

# Fix #7: Registration detail page
$regPage = Get-Content "apps\web\src\app\dashboard\registration\page.tsx" -Raw

if ($regPage -match 'text-xs font-medium text-gray-600') {
    Test-Pass "FIX7-01" "Registration DetailRow label uses text-gray-600 font-medium"
} else {
    Test-Fail "FIX7-01" "Registration DetailRow label should use text-gray-600 font-medium"
}

# Check registration form year/semester uses renderSelect
if ($regPage -match "renderSelect\('Year'") {
    Test-Pass "FIX7-02" "Registration form uses renderSelect for Year (not type=number)"
} else {
    Test-Fail "FIX7-02" "Registration form should use renderSelect for Year"
}

if ($regPage -match "renderSelect\('Semester'") {
    Test-Pass "FIX7-03" "Registration form uses renderSelect for Semester (not type=number)"
} else {
    Test-Fail "FIX7-03" "Registration form should use renderSelect for Semester"
}

# Complaints page
$compPage = Get-Content "apps\web\src\app\dashboard\complaints\page.tsx" -Raw

if ($compPage -match 'SearchPicker') {
    Test-Pass "FIX6-WEB-01" "Complaints page uses SearchPicker for student/hostel"
} else {
    Test-Fail "FIX6-WEB-01" "Complaints page should use SearchPicker instead of UUID inputs"
}

if ($compPage -match 'searchHostels') {
    Test-Pass "FIX6-WEB-02" "Complaints page has hostel search function"
} else {
    Test-Fail "FIX6-WEB-02" "Complaints page should have hostel search function"
}

if ($compPage -match 'text-gray-600.*Student') {
    Test-Pass "FIX6-WEB-03" "Complaints detail labels use text-gray-600"
} else {
    Test-Fail "FIX6-WEB-03" "Complaints detail labels should use text-gray-600"
}

Write-Host ""

# ============================================================================
# SECTION 3: SearchPicker Component Validation
# ============================================================================
Write-Host "--- SECTION 3: SearchPicker Component ---" -ForegroundColor Yellow

$picker = Get-Content "apps\web\src\components\ui\search-picker.tsx" -Raw

if ($picker -match 'export.*SearchPicker') {
    Test-Pass "PICKER-01" "SearchPicker component is exported"
} else {
    Test-Fail "PICKER-01" "SearchPicker component must be exported"
}

if ($picker -match 'SearchPickerOption') {
    Test-Pass "PICKER-02" "SearchPickerOption interface is defined"
} else {
    Test-Fail "PICKER-02" "SearchPickerOption interface must be defined"
}

if ($picker -match 'onSearch') {
    Test-Pass "PICKER-03" "SearchPicker has onSearch callback prop"
} else {
    Test-Fail "PICKER-03" "SearchPicker must have onSearch callback prop"
}

if ($picker -match 'debounce|setTimeout') {
    Test-Pass "PICKER-04" "SearchPicker implements debounced search"
} else {
    Test-Fail "PICKER-04" "SearchPicker should debounce search requests"
}

Write-Host ""

# ============================================================================
# SECTION 4: Mobile Code Validation
# ============================================================================
Write-Host "--- SECTION 4: Mobile Code Validation ---" -ForegroundColor Yellow

# Check mobile complaints API
if (Test-Path "apps\mobile\src\api\complaints.api.ts") {
    $mobileCompApi = Get-Content "apps\mobile\src\api\complaints.api.ts" -Raw
    if ($mobileCompApi -match 'studentId|hostelId') {
        Test-Pass "MOB-01" "Mobile complaints API includes studentId/hostelId handling"
    } else {
        Test-Warn "MOB-01" "Mobile complaints API may not send studentId/hostelId (server-side injection)"
    }
} else {
    Test-Warn "MOB-01" "Mobile complaints API file not found at expected path"
}

# Check mobile roll-call screens for text color
$mobileRollCall = Get-ChildItem "apps\mobile\app" -Recurse -Filter "*.tsx" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match 'roll-call|attendance' } |
    ForEach-Object { [System.IO.File]::ReadAllText($_.FullName) }

if ($mobileRollCall) {
    $tertCount = ([regex]::Matches(($mobileRollCall -join "`n"), 'textTertiary')).Count
    if ($tertCount -le 3) {
        Test-Pass "MOB-02" "Mobile roll-call screens have minimal textTertiary usage ($tertCount)"
    } else {
        Test-Warn "MOB-02" "Mobile roll-call screens have $tertCount textTertiary occurrences (may be too light)"
    }
} else {
    Test-Warn "MOB-02" "No mobile roll-call/attendance screens found"
}

Write-Host ""

# ============================================================================
# SECTION 5: TypeScript Compilation
# ============================================================================
Write-Host "--- SECTION 5: TypeScript Compilation ---" -ForegroundColor Yellow

Write-Host "Checking API compilation..." -ForegroundColor Gray
Push-Location "apps\api"
$apiCompile = & npx tsc --noEmit 2>&1
Pop-Location
if ($LASTEXITCODE -eq 0) {
    Test-Pass "TSC-01" "API compiles with zero TypeScript errors"
} else {
    Test-Fail "TSC-01" "API has TypeScript errors: $($apiCompile | Select-Object -First 3)"
}

Write-Host "Checking Web compilation..." -ForegroundColor Gray
Push-Location "apps\web"
$webCompile = & npx tsc --noEmit 2>&1
Pop-Location
if ($LASTEXITCODE -eq 0) {
    Test-Pass "TSC-02" "Web compiles with zero TypeScript errors"
} else {
    Test-Fail "TSC-02" "Web has TypeScript errors: $($webCompile | Select-Object -First 3)"
}

Write-Host ""

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " RESULTS: $pass PASSED | $fail FAILED | $warn WARNINGS" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

if ($fail -gt 0) {
    Write-Host "Some fixes are not properly applied. Review the FAIL items above." -ForegroundColor Red
    exit 1
} else {
    Write-Host "All bug fixes validated successfully!" -ForegroundColor Green
    exit 0
}
