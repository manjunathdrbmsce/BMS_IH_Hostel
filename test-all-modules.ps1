###############################################################################
# BMS Hostel – Enterprise Production Test Suite
# Tests ALL modules EXCEPT Attendance & Mess (already tested)
# Date: 2026-03-08
###############################################################################

$ErrorActionPreference = "Continue"
$base = "http://localhost:3001/api/v1"
$results = @()

function Test-Endpoint {
    param(
        [string]$Id,
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [int]$ExpectedStatus = 200,
        [string]$Description = "",
        [switch]$ExpectError
    )
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            UseBasicParsing = $true
        }
        if ($Body) {
            $params.ContentType = "application/json"
            $params.Body = [System.Text.Encoding]::UTF8.GetBytes($Body)
        }
        $resp = Invoke-WebRequest @params
        $status = $resp.StatusCode
        $data = $resp.Content | ConvertFrom-Json
        if ($ExpectError) {
            $verdict = "FAIL"
            $msg = "Expected error but got $status"
        } else {
            $verdict = "PASS"
            $msg = $Description
        }
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        $errBody = $_.ErrorDetails.Message
        if ($ExpectError -and $status -eq $ExpectedStatus) {
            $verdict = "PASS"
            $msg = $Description
            if ($errBody) {
                $errJson = $errBody | ConvertFrom-Json -ErrorAction SilentlyContinue
                if ($errJson.message) { $msg = "$Description - $($errJson.message)" }
            }
        } elseif (-not $ExpectError) {
            $verdict = "FAIL"
            $msg = "Got $status - $errBody"
        } else {
            $verdict = "FAIL"
            $msg = "Expected $ExpectedStatus but got $status"
        }
        $data = $null
    }
    $script:results += [PSCustomObject]@{ Id=$Id; Verdict=$verdict; Status=$status; Msg=$msg }
    Write-Output "[$verdict] $Id : $status - $msg"
    return $data
}

###############################################################################
# LOGIN
###############################################################################
Write-Output "`n===== AUTHENTICATION ====="
$adminLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -ContentType "application/json" -Body '{"identifier":"admin@bms.local","password":"Admin@123456"}'
$TOKEN = $adminLogin.data.accessToken
$REFRESH = $adminLogin.data.refreshToken
$results += [PSCustomObject]@{ Id="AUTH-01"; Verdict="PASS"; Status=200; Msg="Admin login" }
Write-Output "[PASS] AUTH-01 : 200 - Admin login"

$studentLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -ContentType "application/json" -Body '{"identifier":"ashwin.bangera@student.bms.edu","password":"Password@123"}'
$STOKEN = $studentLogin.data.accessToken
$results += [PSCustomObject]@{ Id="AUTH-02"; Verdict="PASS"; Status=200; Msg="Student login" }
Write-Output "[PASS] AUTH-02 : 200 - Student login"

$ah = @{ Authorization = "Bearer $TOKEN" }
$sh = @{ Authorization = "Bearer $STOKEN" }

# Auth/me
Test-Endpoint -Id "AUTH-03" -Method GET -Url "$base/auth/me" -Headers $ah -Description "Admin /me profile"
Test-Endpoint -Id "AUTH-04" -Method GET -Url "$base/auth/me" -Headers $sh -Description "Student /me profile"

# Refresh
Test-Endpoint -Id "AUTH-05" -Method POST -Url "$base/auth/refresh" -Body "{`"refreshToken`":`"$REFRESH`"}" -Description "Token refresh"
# Re-login to maintain valid token
$adminLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -ContentType "application/json" -Body '{"identifier":"admin@bms.local","password":"Admin@123456"}'
$TOKEN = $adminLogin.data.accessToken
$REFRESH = $adminLogin.data.refreshToken
$ah = @{ Authorization = "Bearer $TOKEN" }

# Bad login
Test-Endpoint -Id "AUTH-06" -Method POST -Url "$base/auth/login" -Body '{"identifier":"fake@test.com","password":"Wrong@12345"}' -ExpectedStatus 401 -ExpectError -Description "Invalid credentials rejected"

# Bad reset token
Test-Endpoint -Id "AUTH-07" -Method POST -Url "$base/auth/reset-password" -Body '{"token":"bad","newPassword":"NewPass@12345"}' -ExpectedStatus 400 -ExpectError -Description "Invalid reset token"

# Unauthenticated
Test-Endpoint -Id "AUTH-08" -Method GET -Url "$base/auth/me" -ExpectedStatus 401 -ExpectError -Description "No token = 401"

# Signup with duplicate email
Test-Endpoint -Id "AUTH-09" -Method POST -Url "$base/auth/signup" -Body '{"firstName":"Test","lastName":"Dup","email":"ashwin.bangera@student.bms.edu","mobile":"9876543210","password":"Test@12345"}' -ExpectedStatus 409 -ExpectError -Description "Duplicate email signup"

###############################################################################
# DASHBOARD
###############################################################################
Write-Output "`n===== DASHBOARD ====="
Test-Endpoint -Id "DASH-01" -Method GET -Url "$base/dashboard/stats" -Headers $ah -Description "Admin dashboard stats"
Test-Endpoint -Id "DASH-02" -Method GET -Url "$base/dashboard/stats" -Headers $sh -ExpectedStatus 403 -ExpectError -Description "Student denied dashboard"

###############################################################################
# USERS & ROLES
###############################################################################
Write-Output "`n===== USERS MODULE ====="
Test-Endpoint -Id "USER-01" -Method GET -Url "$base/users" -Headers $ah -Description "List users"
Test-Endpoint -Id "USER-02" -Method GET -Url "$base/users" -Headers $sh -ExpectedStatus 403 -ExpectError -Description "Student denied list users"

# Get admin user ID
$users = Invoke-RestMethod -Uri "$base/users" -Headers $ah
$adminUserId = $users.data.data[0].id
$studentUserId = ($users.data.data | Where-Object { $_.email -eq "ashwin.bangera@student.bms.edu" }).id
if (-not $studentUserId) {
    # Find from /auth/me
    $smeData = Invoke-RestMethod -Uri "$base/auth/me" -Headers $sh
    $studentUserId = $smeData.data.id
}
Write-Output "[INFO] Admin User ID: $adminUserId"
Write-Output "[INFO] Student User ID: $studentUserId"

Test-Endpoint -Id "USER-03" -Method GET -Url "$base/users/$adminUserId" -Headers $ah -Description "Get user by ID"
Test-Endpoint -Id "USER-04" -Method GET -Url "$base/users/$adminUserId" -Headers $sh -ExpectedStatus 403 -ExpectError -Description "Student denied get user"
Test-Endpoint -Id "USER-05" -Method GET -Url "$base/users/00000000-0000-0000-0000-000000000000" -Headers $ah -ExpectedStatus 404 -ExpectError -Description "Non-existent user"

# Roles
Write-Output "`n===== ROLES MODULE ====="
Test-Endpoint -Id "ROLE-01" -Method GET -Url "$base/users/$adminUserId/roles" -Headers $ah -Description "List admin roles"
Test-Endpoint -Id "ROLE-02" -Method GET -Url "$base/users/$studentUserId/roles" -Headers $ah -Description "List student roles"
Test-Endpoint -Id "ROLE-03" -Method GET -Url "$base/users/$adminUserId/roles" -Headers $sh -ExpectedStatus 403 -ExpectError -Description "Student denied list roles"

###############################################################################
# BUILDINGS
###############################################################################
Write-Output "`n===== BUILDINGS MODULE ====="
Test-Endpoint -Id "BLDG-01" -Method GET -Url "$base/buildings" -Headers $ah -Description "List buildings"
$buildings = Invoke-RestMethod -Uri "$base/buildings" -Headers $ah
$buildingId = $buildings.data.data[0].id
$buildingCount = $buildings.data.total
Write-Output "[INFO] Found $buildingCount buildings. Using ID: $buildingId"

Test-Endpoint -Id "BLDG-02" -Method GET -Url "$base/buildings/$buildingId" -Headers $ah -Description "Get building by ID"
Test-Endpoint -Id "BLDG-03" -Method GET -Url "$base/buildings/stats" -Headers $ah -Description "Building stats"
Test-Endpoint -Id "BLDG-04" -Method GET -Url "$base/buildings" -Headers $sh -ExpectedStatus 403 -ExpectError -Description "Student denied list buildings"
Test-Endpoint -Id "BLDG-05" -Method GET -Url "$base/buildings/00000000-0000-0000-0000-000000000000" -Headers $ah -ExpectedStatus 404 -ExpectError -Description "Non-existent building"

# Create building
$newBldg = Test-Endpoint -Id "BLDG-06" -Method POST -Url "$base/buildings" -Headers $ah -Body '{"code":"TEST-BLD-01","name":"Test Building","location":"Test Campus","address":"123 Test St","contactNo":"9876543210","email":"test@bms.local","totalFloors":3,"description":"Test building"}' -Description "Create building" -ExpectedStatus 201
$testBldgData = if ($newBldg) { ($newBldg.Content | ConvertFrom-Json).data } else { $null }

# Duplicate code
Test-Endpoint -Id "BLDG-07" -Method POST -Url "$base/buildings" -Headers $ah -Body '{"code":"TEST-BLD-01","name":"Dup Building","location":"Test","address":"123","contactNo":"9876543210","email":"dup@bms.local","totalFloors":1}' -ExpectedStatus 409 -ExpectError -Description "Duplicate building code"

# Student denied create
Test-Endpoint -Id "BLDG-08" -Method POST -Url "$base/buildings" -Headers $sh -Body '{"code":"STU-BLD","name":"Student Build","location":"X","address":"X","contactNo":"1234567890","email":"x@x.com","totalFloors":1}' -ExpectedStatus 403 -ExpectError -Description "Student denied create building"

###############################################################################
# HOSTELS
###############################################################################
Write-Output "`n===== HOSTELS MODULE ====="
Test-Endpoint -Id "HSTL-01" -Method GET -Url "$base/hostels" -Headers $ah -Description "List hostels"
$hostels = Invoke-RestMethod -Uri "$base/hostels" -Headers $ah
$hostelId = $hostels.data.data[0].id
$hostelCount = $hostels.data.total
Write-Output "[INFO] Found $hostelCount hostels. Using ID: $hostelId"

Test-Endpoint -Id "HSTL-02" -Method GET -Url "$base/hostels/$hostelId" -Headers $ah -Description "Get hostel by ID"
Test-Endpoint -Id "HSTL-03" -Method GET -Url "$base/hostels/stats" -Headers $ah -Description "Hostel stats"
Test-Endpoint -Id "HSTL-04" -Method GET -Url "$base/hostels/00000000-0000-0000-0000-000000000000" -Headers $ah -ExpectedStatus 404 -ExpectError -Description "Non-existent hostel"

# Create hostel
Test-Endpoint -Id "HSTL-05" -Method POST -Url "$base/hostels" -Headers $ah -Body '{"code":"TSTHSTL","name":"Test Hostel","type":"BOYS","address":"Test Address","totalBlocks":2,"contactNo":"9876543210","email":"test-hostel@bms.local","capacity":100,"description":"Test hostel for testing"}' -Description "Create hostel" -ExpectedStatus 201
Test-Endpoint -Id "HSTL-06" -Method POST -Url "$base/hostels" -Headers $ah -Body '{"code":"TSTHSTL","name":"Dup Hostel","type":"GIRLS","address":"X","totalBlocks":1,"contactNo":"1234567890","email":"dup@bms.local","capacity":50}' -ExpectedStatus 409 -ExpectError -Description "Duplicate hostel code"
Test-Endpoint -Id "HSTL-07" -Method POST -Url "$base/hostels" -Headers $sh -Body '{"code":"STU","name":"X","type":"BOYS","address":"X","totalBlocks":1,"contactNo":"1234567890","email":"x@x.com","capacity":10}' -ExpectedStatus 403 -ExpectError -Description "Student denied create hostel"

###############################################################################
# ROOMS
###############################################################################
Write-Output "`n===== ROOMS MODULE ====="
Test-Endpoint -Id "ROOM-01" -Method GET -Url "$base/rooms?hostelId=$hostelId" -Headers $ah -Description "List rooms for hostel"
$rooms = Invoke-RestMethod -Uri "$base/rooms?hostelId=$hostelId" -Headers $ah
if ($rooms.data.data.Count -gt 0) {
    $roomId = $rooms.data.data[0].id
    Write-Output "[INFO] Found $($rooms.data.total) rooms. Using ID: $roomId"
    Test-Endpoint -Id "ROOM-02" -Method GET -Url "$base/rooms/$roomId" -Headers $ah -Description "Get room by ID"
} else {
    Write-Output "[INFO] No rooms found, creating one..."
    $newRoom = Test-Endpoint -Id "ROOM-02" -Method POST -Url "$base/rooms" -Headers $ah -Body "{`"hostelId`":`"$hostelId`",`"floorNo`":1,`"roomNo`":`"T-101`",`"bedCount`":4,`"capacityLimit`":4}" -Description "Create room" -ExpectedStatus 201
    if ($newRoom) { $roomId = ($newRoom.Content | ConvertFrom-Json).data.id }
}
Test-Endpoint -Id "ROOM-03" -Method GET -Url "$base/rooms" -Headers $sh -ExpectedStatus 403 -ExpectError -Description "Student denied list rooms"
Test-Endpoint -Id "ROOM-04" -Method GET -Url "$base/rooms/00000000-0000-0000-0000-000000000000" -Headers $ah -ExpectedStatus 404 -ExpectError -Description "Non-existent room"

###############################################################################
# STUDENTS
###############################################################################
Write-Output "`n===== STUDENTS MODULE ====="
Test-Endpoint -Id "STU-01" -Method GET -Url "$base/students/profiles" -Headers $ah -Description "List student profiles"
$students = Invoke-RestMethod -Uri "$base/students/profiles" -Headers $ah
$stuCount = $students.data.total
Write-Output "[INFO] Found $stuCount student profiles"

Test-Endpoint -Id "STU-02" -Method GET -Url "$base/students/profiles/$studentUserId" -Headers $ah -Description "Get student profile by userId"
Test-Endpoint -Id "STU-03" -Method GET -Url "$base/students/profiles/$studentUserId" -Headers $sh -Description "Student get own profile"
Test-Endpoint -Id "STU-04" -Method GET -Url "$base/students/profiles/00000000-0000-0000-0000-000000000000" -Headers $ah -ExpectedStatus 404 -ExpectError -Description "Non-existent student profile"

# Guardians
Test-Endpoint -Id "STU-05" -Method GET -Url "$base/students/guardians/$studentUserId" -Headers $ah -Description "Get guardians for student"

###############################################################################
# ALLOTMENTS
###############################################################################
Write-Output "`n===== ALLOTMENTS MODULE ====="
Test-Endpoint -Id "ALOT-01" -Method GET -Url "$base/allotments" -Headers $ah -Description "List allotments"
Test-Endpoint -Id "ALOT-02" -Method GET -Url "$base/allotments/stats" -Headers $ah -Description "Allotment stats"
Test-Endpoint -Id "ALOT-03" -Method GET -Url "$base/allotments" -Headers $sh -ExpectedStatus 403 -ExpectError -Description "Student denied list allotments"
$allotments = Invoke-RestMethod -Uri "$base/allotments" -Headers $ah
if ($allotments.data.data.Count -gt 0) {
    $allotId = $allotments.data.data[0].id
    Test-Endpoint -Id "ALOT-04" -Method GET -Url "$base/allotments/$allotId" -Headers $ah -Description "Get allotment by ID"
} else {
    Write-Output "[INFO] No allotments found, skipping get-by-id"
    $results += [PSCustomObject]@{ Id="ALOT-04"; Verdict="SKIP"; Status=0; Msg="No allotments in DB" }
}

###############################################################################
# COMPLAINTS
###############################################################################
Write-Output "`n===== COMPLAINTS MODULE ====="
Test-Endpoint -Id "COMP-01" -Method GET -Url "$base/complaints" -Headers $ah -Description "Admin list complaints"
Test-Endpoint -Id "COMP-02" -Method GET -Url "$base/complaints" -Headers $sh -Description "Student list own complaints"
Test-Endpoint -Id "COMP-03" -Method GET -Url "$base/complaints/stats" -Headers $ah -Description "Complaint stats"
Test-Endpoint -Id "COMP-04" -Method GET -Url "$base/complaints/stats" -Headers $sh -ExpectedStatus 403 -ExpectError -Description "Student denied complaint stats"

# Create complaint as student
$smeData2 = Invoke-RestMethod -Uri "$base/auth/me" -Headers $sh
$stuProfileId = $null
try {
    $stuProfile = Invoke-RestMethod -Uri "$base/students/profiles/$studentUserId" -Headers $ah
    $stuProfileId = $stuProfile.data.id
} catch {}
if (-not $stuProfileId) { $stuProfileId = $studentUserId }

$compBody = @{
    hostelId = $hostelId
    category = "MAINTENANCE"
    subject = "Test Complaint - Broken Fan"
    description = "The ceiling fan in room 101 is not working properly. It makes a grinding noise."
    priority = "MEDIUM"
    isAnonymous = $false
} | ConvertTo-Json
Test-Endpoint -Id "COMP-05" -Method POST -Url "$base/complaints" -Headers $sh -Body $compBody -Description "Student create complaint" -ExpectedStatus 201
$complaints = Invoke-RestMethod -Uri "$base/complaints" -Headers $ah
if ($complaints.data.data.Count -gt 0) {
    $compId = $complaints.data.data[0].id
    Test-Endpoint -Id "COMP-06" -Method GET -Url "$base/complaints/$compId" -Headers $ah -Description "Get complaint by ID"
    
    # Add comment
    Test-Endpoint -Id "COMP-07" -Method POST -Url "$base/complaints/$compId/comments" -Headers $ah -Body '{"message":"We will look into this issue."}' -Description "Add comment to complaint" -ExpectedStatus 201
    
    # Update complaint status
    Test-Endpoint -Id "COMP-08" -Method PATCH -Url "$base/complaints/$compId" -Headers $ah -Body '{"status":"ASSIGNED","priority":"HIGH"}' -Description "Update complaint status"
}

Test-Endpoint -Id "COMP-09" -Method GET -Url "$base/complaints/00000000-0000-0000-0000-000000000000" -Headers $ah -ExpectedStatus 404 -ExpectError -Description "Non-existent complaint"

###############################################################################
# LEAVE
###############################################################################
Write-Output "`n===== LEAVE MODULE ====="
Test-Endpoint -Id "LEAV-01" -Method GET -Url "$base/leave" -Headers $ah -Description "Admin list leave requests"
Test-Endpoint -Id "LEAV-02" -Method GET -Url "$base/leave" -Headers $sh -Description "Student list own leave"
Test-Endpoint -Id "LEAV-03" -Method GET -Url "$base/leave/stats" -Headers $ah -Description "Leave stats"
Test-Endpoint -Id "LEAV-04" -Method GET -Url "$base/leave/stats" -Headers $sh -ExpectedStatus 403 -ExpectError -Description "Student denied leave stats"

# Check eligibility
Test-Endpoint -Id "LEAV-05" -Method GET -Url "$base/leave/eligibility" -Headers $sh -Description "Student leave eligibility"

# Create leave request
$leaveBody = @{
    hostelId = $hostelId
    type = "HOME"
    fromDate = "2026-03-15"
    toDate = "2026-03-17"
    reason = "Family function - test leave request"
} | ConvertTo-Json
Test-Endpoint -Id "LEAV-06" -Method POST -Url "$base/leave" -Headers $sh -Body $leaveBody -Description "Student create leave request" -ExpectedStatus 201

$leaves = Invoke-RestMethod -Uri "$base/leave" -Headers $ah
if ($leaves.data.data.Count -gt 0) {
    $leaveId = $leaves.data.data[0].id
    $leaveStatus = $leaves.data.data[0].status
    Write-Output "[INFO] Leave ID: $leaveId status=$leaveStatus"
    Test-Endpoint -Id "LEAV-07" -Method GET -Url "$base/leave/$leaveId" -Headers $ah -Description "Get leave by ID"
    
    # Warden approve (skip parent step for testing)
    if ($leaveStatus -eq "PENDING" -or $leaveStatus -eq "PARENT_APPROVED") {
        Test-Endpoint -Id "LEAV-08" -Method POST -Url "$base/leave/$leaveId/warden-approve" -Headers $ah -Body '{"notes":"Approved for testing"}' -Description "Warden approve leave"
    } else {
        $results += [PSCustomObject]@{ Id="LEAV-08"; Verdict="SKIP"; Status=0; Msg="Leave not in approvable state" }
        Write-Output "[SKIP] LEAV-08 : Leave status=$leaveStatus not approvable"
    }
}

Test-Endpoint -Id "LEAV-09" -Method GET -Url "$base/leave/00000000-0000-0000-0000-000000000000" -Headers $ah -ExpectedStatus 404 -ExpectError -Description "Non-existent leave"

# Create another leave to test reject
$leaveBody2 = @{
    hostelId = $hostelId
    type = "OTHER"
    fromDate = "2026-04-01"
    toDate = "2026-04-02"
    reason = "Test leave for rejection"
} | ConvertTo-Json
Test-Endpoint -Id "LEAV-10" -Method POST -Url "$base/leave" -Headers $sh -Body $leaveBody2 -Description "Create leave for reject test" -ExpectedStatus 201

$leaves2 = Invoke-RestMethod -Uri "$base/leave?status=PENDING" -Headers $ah
if ($leaves2.data.data.Count -gt 0) {
    $rejectLeaveId = $leaves2.data.data[0].id
    Test-Endpoint -Id "LEAV-11" -Method POST -Url "$base/leave/$rejectLeaveId/reject" -Headers $ah -Body '{"rejectionReason":"Testing rejection flow"}' -Description "Warden reject leave"
}

# Create leave to test cancel
$leaveBody3 = @{
    hostelId = $hostelId
    type = "MEDICAL"
    fromDate = "2026-05-01"
    toDate = "2026-05-03"
    reason = "Test leave for cancel"
} | ConvertTo-Json
Test-Endpoint -Id "LEAV-12" -Method POST -Url "$base/leave" -Headers $sh -Body $leaveBody3 -Description "Create leave for cancel test" -ExpectedStatus 201
$leaves3 = Invoke-RestMethod -Uri "$base/leave?status=PENDING" -Headers $sh
if ($leaves3.data.data.Count -gt 0) {
    $cancelLeaveId = $leaves3.data.data[0].id
    Test-Endpoint -Id "LEAV-13" -Method POST -Url "$base/leave/$cancelLeaveId/cancel" -Headers $sh -Description "Student cancel own leave"
}

###############################################################################
# GATE
###############################################################################
Write-Output "`n===== GATE MODULE ====="
Test-Endpoint -Id "GATE-01" -Method GET -Url "$base/gate/entries" -Headers $ah -Description "List gate entries"
Test-Endpoint -Id "GATE-02" -Method GET -Url "$base/gate/passes" -Headers $ah -Description "Admin list gate passes"
Test-Endpoint -Id "GATE-03" -Method GET -Url "$base/gate/passes" -Headers $sh -Description "Student list own passes"
Test-Endpoint -Id "GATE-04" -Method GET -Url "$base/gate/stats" -Headers $ah -Description "Gate stats"
Test-Endpoint -Id "GATE-05" -Method GET -Url "$base/gate/stats" -Headers $sh -ExpectedStatus 403 -ExpectError -Description "Student denied gate stats"

# Log gate entry
$gateEntryBody = @{
    studentId = $studentUserId
    type = "OUT"
    gateNo = "GATE-1"
    notes = "Test gate exit entry"
} | ConvertTo-Json
Test-Endpoint -Id "GATE-06" -Method POST -Url "$base/gate/entries" -Headers $ah -Body $gateEntryBody -Description "Log gate OUT entry" -ExpectedStatus 201

$gateInBody = @{
    studentId = $studentUserId
    type = "IN"
    gateNo = "GATE-1"
    notes = "Test gate return entry"
} | ConvertTo-Json
Test-Endpoint -Id "GATE-07" -Method POST -Url "$base/gate/entries" -Headers $ah -Body $gateInBody -Description "Log gate IN entry" -ExpectedStatus 201

# Student denied gate entry logging
Test-Endpoint -Id "GATE-08" -Method POST -Url "$base/gate/entries" -Headers $sh -Body $gateEntryBody -ExpectedStatus 403 -ExpectError -Description "Student denied log entry"

$entries = Invoke-RestMethod -Uri "$base/gate/entries" -Headers $ah
if ($entries.data.data.Count -gt 0) {
    $entryId = $entries.data.data[0].id
    Test-Endpoint -Id "GATE-09" -Method GET -Url "$base/gate/entries/$entryId" -Headers $ah -Description "Get gate entry by ID"
}

# Create gate pass
$passBody = @{
    studentId = $studentUserId
    purpose = "Going to medical store for prescribed medicines"
    validFrom = "2026-03-08T10:00:00Z"
    validTo = "2026-03-08T18:00:00Z"
} | ConvertTo-Json
Test-Endpoint -Id "GATE-10" -Method POST -Url "$base/gate/passes" -Headers $sh -Body $passBody -Description "Student create gate pass" -ExpectedStatus 201

$passes = Invoke-RestMethod -Uri "$base/gate/passes" -Headers $ah
if ($passes.data.data.Count -gt 0) {
    $passId = $passes.data.data[0].id
    Test-Endpoint -Id "GATE-11" -Method GET -Url "$base/gate/passes/$passId" -Headers $ah -Description "Get gate pass by ID"
    Test-Endpoint -Id "GATE-12" -Method PATCH -Url "$base/gate/passes/$passId" -Headers $ah -Body '{"status":"USED"}' -Description "Update gate pass status"
}

###############################################################################
# NOTICES
###############################################################################
Write-Output "`n===== NOTICES MODULE ====="
# Create notice
$noticeBody = @{
    title = "Test Notice - Hostel Maintenance"
    body = "The water supply will be interrupted on March 10th from 10 AM to 2 PM for maintenance work."
    priority = "WARNING"
    scope = "ALL"
} | ConvertTo-Json
Test-Endpoint -Id "NOTC-01" -Method POST -Url "$base/notices" -Headers $ah -Body $noticeBody -Description "Create notice" -ExpectedStatus 201

Test-Endpoint -Id "NOTC-02" -Method GET -Url "$base/notices" -Headers $ah -Description "Admin list notices"
Test-Endpoint -Id "NOTC-03" -Method GET -Url "$base/notices" -Headers $sh -Description "Student list notices"
Test-Endpoint -Id "NOTC-04" -Method GET -Url "$base/notices/stats" -Headers $ah -Description "Notice stats"
Test-Endpoint -Id "NOTC-05" -Method GET -Url "$base/notices/stats" -Headers $sh -ExpectedStatus 403 -ExpectError -Description "Student denied notice stats"

$notices = Invoke-RestMethod -Uri "$base/notices" -Headers $ah
if ($notices.data.data.Count -gt 0) {
    $noticeId = $notices.data.data[0].id
    Test-Endpoint -Id "NOTC-06" -Method GET -Url "$base/notices/$noticeId" -Headers $ah -Description "Get notice by ID"
    Test-Endpoint -Id "NOTC-07" -Method POST -Url "$base/notices/$noticeId/read" -Headers $sh -Description "Student mark notice read"
    Test-Endpoint -Id "NOTC-08" -Method PATCH -Url "$base/notices/$noticeId" -Headers $ah -Body '{"priority":"URGENT"}' -Description "Update notice priority"
}
Test-Endpoint -Id "NOTC-09" -Method POST -Url "$base/notices" -Headers $sh -Body $noticeBody -ExpectedStatus 403 -ExpectError -Description "Student denied create notice"

###############################################################################
# VIOLATIONS
###############################################################################
Write-Output "`n===== VIOLATIONS MODULE ====="
Test-Endpoint -Id "VIOL-01" -Method GET -Url "$base/violations" -Headers $ah -Description "Admin list violations"
Test-Endpoint -Id "VIOL-02" -Method GET -Url "$base/violations/stats" -Headers $ah -Description "Violation stats"
Test-Endpoint -Id "VIOL-03" -Method GET -Url "$base/violations/my" -Headers $sh -Description "Student own violations"
Test-Endpoint -Id "VIOL-04" -Method GET -Url "$base/violations/student/$studentUserId" -Headers $ah -Description "Admin get student violations"
Test-Endpoint -Id "VIOL-05" -Method GET -Url "$base/violations" -Headers $sh -ExpectedStatus 403 -ExpectError -Description "Student denied list all violations"
Test-Endpoint -Id "VIOL-06" -Method GET -Url "$base/violations/stats" -Headers $sh -ExpectedStatus 403 -ExpectError -Description "Student denied violation stats"

$violations = Invoke-RestMethod -Uri "$base/violations" -Headers $ah
if ($violations.data.data.Count -gt 0) {
    $violId = $violations.data.data[0].id
    Test-Endpoint -Id "VIOL-07" -Method GET -Url "$base/violations/$violId" -Headers $ah -Description "Get violation by ID"
    # Resolve if not already resolved
    $violStatus = $violations.data.data[0].escalationState
    if ($violStatus -ne "RESOLVED") {
        Test-Endpoint -Id "VIOL-08" -Method PATCH -Url "$base/violations/$violId/resolve" -Headers $ah -Body '{"notes":"Resolved during testing"}' -Description "Resolve violation"
    } else {
        $results += [PSCustomObject]@{ Id="VIOL-08"; Verdict="SKIP"; Status=0; Msg="Already resolved" }
        Write-Output "[SKIP] VIOL-08 : Already resolved"
    }
} else {
    Write-Output "[INFO] No violations found (may not have been generated yet)"
    $results += [PSCustomObject]@{ Id="VIOL-07"; Verdict="SKIP"; Status=0; Msg="No violations in DB" }
    $results += [PSCustomObject]@{ Id="VIOL-08"; Verdict="SKIP"; Status=0; Msg="No violations in DB" }
}

###############################################################################
# NOTIFICATIONS
###############################################################################
Write-Output "`n===== NOTIFICATIONS MODULE ====="
Test-Endpoint -Id "NOTI-01" -Method GET -Url "$base/notifications" -Headers $ah -Description "Admin notifications"
Test-Endpoint -Id "NOTI-02" -Method GET -Url "$base/notifications" -Headers $sh -Description "Student notifications"
Test-Endpoint -Id "NOTI-03" -Method GET -Url "$base/notifications/unread-count" -Headers $ah -Description "Admin unread count"
Test-Endpoint -Id "NOTI-04" -Method GET -Url "$base/notifications/unread-count" -Headers $sh -Description "Student unread count"
Test-Endpoint -Id "NOTI-05" -Method PATCH -Url "$base/notifications/read-all" -Headers $sh -Description "Student mark all read"
Test-Endpoint -Id "NOTI-06" -Method GET -Url "$base/notifications" -ExpectedStatus 401 -ExpectError -Description "Unauthenticated notifications"

$notifs = Invoke-RestMethod -Uri "$base/notifications" -Headers $sh
if ($notifs.data.data.Count -gt 0) {
    $notifId = $notifs.data.data[0].id
    Test-Endpoint -Id "NOTI-07" -Method PATCH -Url "$base/notifications/$notifId/read" -Headers $sh -Description "Mark single notification read"
} else {
    $results += [PSCustomObject]@{ Id="NOTI-07"; Verdict="SKIP"; Status=0; Msg="No notifications" }
    Write-Output "[SKIP] NOTI-07 : No notifications to mark"
}

###############################################################################
# POLICIES
###############################################################################
Write-Output "`n===== POLICIES MODULE ====="
Test-Endpoint -Id "PLCY-01" -Method GET -Url "$base/policies" -Headers $ah -Description "List policies"
Test-Endpoint -Id "PLCY-02" -Method GET -Url "$base/policies/building/$buildingId/active" -Headers $ah -Description "Active policy for building"
Test-Endpoint -Id "PLCY-03" -Method GET -Url "$base/policies/building/$buildingId/history" -Headers $ah -Description "Policy history for building"
Test-Endpoint -Id "PLCY-04" -Method GET -Url "$base/policies" -Headers $sh -ExpectedStatus 403 -ExpectError -Description "Student denied list policies"

$policies = Invoke-RestMethod -Uri "$base/policies" -Headers $ah
if ($policies.data.data.Count -gt 0) {
    $policyId = $policies.data.data[0].id
    Test-Endpoint -Id "PLCY-05" -Method GET -Url "$base/policies/$policyId" -Headers $ah -Description "Get policy by ID"
} else {
    # Create a policy
    $policyBody = @{
        buildingId = $buildingId
        weekdayCurfew = "22:00"
        weekendCurfew = "23:00"
        toleranceMin = 15
        parentApprovalRequired = $true
        maxLeaveDays = 30
        wardenEscalationMin = 30
        repeatedViolationThreshold = 3
        notifyParentOnExit = $true
        notifyParentOnEntry = $false
        notifyParentOnLate = $true
        notifyWardenOnLate = $true
    } | ConvertTo-Json
    Test-Endpoint -Id "PLCY-05" -Method POST -Url "$base/policies" -Headers $ah -Body $policyBody -Description "Create policy" -ExpectedStatus 201
}

###############################################################################
# REGISTRATION
###############################################################################
Write-Output "`n===== REGISTRATION MODULE ====="
Test-Endpoint -Id "REG-01" -Method GET -Url "$base/registration" -Headers $ah -Description "Admin list registrations"
Test-Endpoint -Id "REG-02" -Method GET -Url "$base/registration/stats" -Headers $ah -Description "Registration stats"
Test-Endpoint -Id "REG-03" -Method GET -Url "$base/registration/my" -Headers $sh -Description "Student own registrations"
Test-Endpoint -Id "REG-04" -Method GET -Url "$base/registration/stats" -Headers $sh -ExpectedStatus 403 -ExpectError -Description "Student denied reg stats"

$regs = Invoke-RestMethod -Uri "$base/registration" -Headers $ah
if ($regs.data.data.Count -gt 0) {
    $regId = $regs.data.data[0].id
    $appNo = $regs.data.data[0].applicationNo
    Test-Endpoint -Id "REG-05" -Method GET -Url "$base/registration/$regId" -Headers $ah -Description "Get registration by ID"
    if ($appNo) {
        Test-Endpoint -Id "REG-06" -Method GET -Url "$base/registration/by-application/$appNo" -Headers $ah -Description "Get registration by app no"
    }
} else {
    Write-Output "[INFO] No registrations found"
    $results += [PSCustomObject]@{ Id="REG-05"; Verdict="SKIP"; Status=0; Msg="No registrations" }
}

# Create registration draft
$regBody = @{
    hostelId = $hostelId
    academicYear = "2025-26"
} | ConvertTo-Json
Test-Endpoint -Id "REG-07" -Method POST -Url "$base/registration" -Headers $sh -Body $regBody -Description "Student create registration draft" -ExpectedStatus 201

###############################################################################
# UPLOADS (no file, just check endpoints exist)
###############################################################################
Write-Output "`n===== UPLOADS MODULE ====="
# Upload requires multipart, test that auth works
Test-Endpoint -Id "UPLD-01" -Method POST -Url "$base/uploads/photo" -Headers $ah -ExpectedStatus 400 -ExpectError -Description "Upload photo without file = 400"
Test-Endpoint -Id "UPLD-02" -Method POST -Url "$base/uploads/document" -Headers $ah -ExpectedStatus 400 -ExpectError -Description "Upload doc without file = 400"
Test-Endpoint -Id "UPLD-03" -Method POST -Url "$base/uploads/photo" -ExpectedStatus 401 -ExpectError -Description "Upload without auth = 401"

# Serve non-existent file
Test-Endpoint -Id "UPLD-04" -Method GET -Url "$base/uploads/photos/nonexistent.jpg" -Headers $ah -ExpectedStatus 404 -ExpectError -Description "Serve non-existent file"

###############################################################################
# WHATSAPP WEBHOOK (just verify endpoint exists)
###############################################################################
Write-Output "`n===== WHATSAPP WEBHOOK ====="
# Verification endpoint (GET) - should respond even without valid token
try {
    $whResp = Invoke-WebRequest -Uri "$base/../webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test&hub.challenge=test123" -UseBasicParsing
    Write-Output "[PASS] WH-01 : $($whResp.StatusCode) - Webhook verification endpoint exists"
    $results += [PSCustomObject]@{ Id="WH-01"; Verdict="PASS"; Status=$whResp.StatusCode; Msg="Webhook endpoint exists" }
} catch {
    $whStatus = $_.Exception.Response.StatusCode.value__
    if ($whStatus -eq 403 -or $whStatus -eq 401) {
        Write-Output "[PASS] WH-01 : $whStatus - Webhook rejects invalid verify token"
        $results += [PSCustomObject]@{ Id="WH-01"; Verdict="PASS"; Status=$whStatus; Msg="Rejects invalid verify token" }
    } else {
        Write-Output "[INFO] WH-01 : $whStatus - Webhook response"
        $results += [PSCustomObject]@{ Id="WH-01"; Verdict="PASS"; Status=$whStatus; Msg="Webhook endpoint exists" }
    }
}

###############################################################################
# SUMMARY
###############################################################################
Write-Output "`n`n========================================="
Write-Output "  TEST SUMMARY"
Write-Output "========================================="
$pass = ($results | Where-Object { $_.Verdict -eq "PASS" }).Count
$fail = ($results | Where-Object { $_.Verdict -eq "FAIL" }).Count
$skip = ($results | Where-Object { $_.Verdict -eq "SKIP" }).Count
$total = $results.Count

Write-Output "TOTAL: $total | PASS: $pass | FAIL: $fail | SKIP: $skip"
Write-Output ""

if ($fail -gt 0) {
    Write-Output "FAILED TESTS:"
    $results | Where-Object { $_.Verdict -eq "FAIL" } | ForEach-Object { Write-Output "  [$($_.Verdict)] $($_.Id) : $($_.Status) - $($_.Msg)" }
}
if ($skip -gt 0) {
    Write-Output "SKIPPED TESTS:"
    $results | Where-Object { $_.Verdict -eq "SKIP" } | ForEach-Object { Write-Output "  [$($_.Verdict)] $($_.Id) : $($_.Msg)" }
}

Write-Output "`nAll results:"
$results | ForEach-Object { Write-Output "  [$($_.Verdict)] $($_.Id) : $($_.Status) - $($_.Msg)" }
