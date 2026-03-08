###############################################################################
# BMS Hostel – Edge Cases & Advanced RBAC Test Suite
###############################################################################
$ErrorActionPreference = "Continue"
$base = "http://localhost:3001/api/v1"

# Login all roles
$al = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -ContentType "application/json" -Body '{"identifier":"admin@bms.local","password":"Admin@123456"}'
$TOKEN = $al.data.accessToken

$sl = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -ContentType "application/json" -Body '{"identifier":"ashwin.bangera@student.bms.edu","password":"Password@123"}'
$STOKEN = $sl.data.accessToken

$pl = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -ContentType "application/json" -Body '{"identifier":"madhu.jadhav@parent.bms.edu","password":"Password@123"}'
$PTOKEN = $pl.data.accessToken

$ah = @{ Authorization = "Bearer $TOKEN" }
$sh = @{ Authorization = "Bearer $STOKEN" }
$ph = @{ Authorization = "Bearer $PTOKEN" }

$hostelId = "0f171036-44d0-4007-b867-d55c3f179726"
$buildingId = "523a0450-9b16-4c38-83d6-b1aeace9f618"
$adminUserId = "a1f34d7e-d776-4462-82d7-ee7311d24f48"
$studentUserId = "1f3cc803-ac5d-4f2a-8846-511152c3902a"

$pass = 0; $fail = 0; $skip = 0
function T($id, $verdict, $msg) {
    Write-Output "[$verdict] $id : $msg"
    if ($verdict -eq "PASS") { $script:pass++ }
    elseif ($verdict -eq "SKIP") { $script:skip++ }
    else { $script:fail++ }
}

function TestErr($id, $method, $url, $headers, $body, $expectedCode, $desc) {
    try {
        $params = @{ Uri=$url; Method=$method; Headers=$headers; UseBasicParsing=$true }
        if ($body) { $params.ContentType="application/json"; $params.Body=[System.Text.Encoding]::UTF8.GetBytes($body) }
        $r = Invoke-WebRequest @params
        if ($expectedCode -and $r.StatusCode -ne $expectedCode) { T $id "FAIL" "Expected $expectedCode got $($r.StatusCode)" }
        else { T $id "PASS" "$desc ($($r.StatusCode))" }
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        $errMsg = ""
        try { $errMsg = ($_.ErrorDetails.Message | ConvertFrom-Json).message } catch {}
        if ($expectedCode -and $code -eq $expectedCode) { T $id "PASS" "$desc - $errMsg" }
        elseif (-not $expectedCode) { T $id "FAIL" "$code - $errMsg" }
        else { T $id "FAIL" "Expected $expectedCode got $code - $errMsg" }
    }
}

Write-Output "==========================================="
Write-Output "  EDGE CASES & ADVANCED RBAC"
Write-Output "==========================================="

### AUTH EDGE CASES ###
Write-Output "`n--- Auth Edge Cases ---"
TestErr "AE-01" "POST" "$base/auth/login" @{} '{"identifier":"","password":""}' 401 "Empty credentials"
TestErr "AE-02" "POST" "$base/auth/login" @{} '{"identifier":"admin@bms.local","password":"wrong"}' 401 "Wrong password"
TestErr "AE-03" "POST" "$base/auth/signup" @{} '{"firstName":"A","lastName":"B","email":"test-unique-999@test.com","mobile":"9999999999","password":"weak"}' 400 "Weak password rejected"
TestErr "AE-04" "POST" "$base/auth/signup" @{} '{"firstName":"A","lastName":"B","email":"invalid-email","mobile":"9999999998","password":"Strong@12345"}' 400 "Invalid email format"
TestErr "AE-05" "GET" "$base/auth/me" @{Authorization="Bearer invalidtoken123"} $null 401 "Invalid JWT token"
TestErr "AE-06" "POST" "$base/auth/refresh" @{} '{"refreshToken":"invalid-refresh-token"}' 401 "Invalid refresh token"

### PARENT ROLE RBAC ###
Write-Output "`n--- Parent Role RBAC ---"
TestErr "PR-01" "GET" "$base/leave" $ph $null 200 "Parent can list leave"
TestErr "PR-02" "GET" "$base/notices" $ph $null 200 "Parent can list notices"
TestErr "PR-03" "GET" "$base/dashboard/stats" $ph $null 403 "Parent denied dashboard"
TestErr "PR-04" "GET" "$base/users" $ph $null 403 "Parent denied users list"
TestErr "PR-05" "GET" "$base/buildings" $ph $null 403 "Parent denied buildings"
TestErr "PR-06" "GET" "$base/complaints" $ph $null 403 "Parent denied complaints"
TestErr "PR-07" "GET" "$base/violations" $ph $null 403 "Parent denied violations"
TestErr "PR-08" "GET" "$base/gate/entries" $ph $null 403 "Parent denied gate entries"

### STUDENT RBAC BOUNDARIES ###
Write-Output "`n--- Student RBAC Boundaries ---"
TestErr "SR-01" "POST" "$base/buildings" $sh '{"code":"X","name":"X","location":"X","address":"X","contactNo":"1234567890","email":"x@x.com","totalFloors":1}' 403 "Student denied create building"
TestErr "SR-02" "POST" "$base/hostels" $sh '{"code":"X","name":"X","type":"BOYS","address":"X","totalBlocks":1,"contactNo":"1234567890","email":"x@x.com","capacity":10}' 403 "Student denied create hostel"
TestErr "SR-03" "POST" "$base/rooms" $sh '{"hostelId":"'+"$hostelId"+'","roomNo":"X","floor":1}' 403 "Student denied create room"
TestErr "SR-04" "POST" "$base/notices" $sh '{"title":"X","body":"X"}' 403 "Student denied create notice"
TestErr "SR-05" "GET" "$base/registration/stats" $sh $null 403 "Student denied reg stats"
TestErr "SR-06" "POST" "$base/allotments/assign" $sh '{"studentId":"'+"$studentUserId"+'","bedId":"00000000-0000-0000-0000-000000000001"}' 403 "Student denied assign bed"
TestErr "SR-07" "POST" "$base/policies" $sh '{"buildingId":"'+"$buildingId"+'","weekdayCurfew":"22:00","weekendCurfew":"23:00"}' 403 "Student denied create policy"
TestErr "SR-08" "DELETE" "$base/users/$adminUserId" $sh $null 403 "Student denied delete user"
TestErr "SR-09" "DELETE" "$base/buildings/$buildingId" $sh $null 403 "Student denied delete building"

### VALIDATION EDGE CASES ###
Write-Output "`n--- Validation Edge Cases ---"
TestErr "VE-01" "POST" "$base/buildings" $ah '{"code":"","name":"","location":"","address":"","totalFloors":0}' 400 "Empty building fields"
TestErr "VE-02" "POST" "$base/hostels" $ah '{"code":"","name":"","type":"INVALID","address":"","totalBlocks":0,"capacity":-1}' 400 "Invalid hostel type"
TestErr "VE-03" "POST" "$base/rooms" $ah '{"hostelId":"not-a-uuid","roomNo":"","floor":-1}' 400 "Invalid UUID for room"
TestErr "VE-04" "POST" "$base/complaints" $sh '{"category":"NONEXISTENT","subject":"","description":""}' 400 "Invalid complaint category"
TestErr "VE-05" "POST" "$base/leave" $sh '{"type":"INVALID","fromDate":"not-a-date","toDate":"not-a-date","reason":""}' 400 "Invalid leave type and dates"
TestErr "VE-06" "POST" "$base/gate/entries" $ah '{"studentId":"not-uuid","type":"INVALID","gateNo":""}' 400 "Invalid gate entry"
TestErr "VE-07" "POST" "$base/gate/passes" $sh '{"purpose":"","validFrom":"not-a-date","validTo":"not-a-date"}' 400 "Invalid gate pass dates"
TestErr "VE-08" "POST" "$base/notices" $ah '{"title":"","body":"","priority":"NONEXISTENT"}' 400 "Invalid notice priority"
TestErr "VE-09" "POST" "$base/users" $ah '{"email":"invalid","password":"weak"}' 400 "Invalid user creation"
TestErr "VE-10" "POST" "$base/users" $ah '{"email":"valid@test.com","password":"nouppercase1!"}' 400 "Password missing uppercase"

### NOT-FOUND EDGE CASES ###
Write-Output "`n--- Not Found Edge Cases ---"
$fakeUuid = "00000000-0000-0000-0000-000000000000"
TestErr "NF-01" "GET" "$base/users/$fakeUuid" $ah $null 404 "Non-existent user"
TestErr "NF-02" "GET" "$base/buildings/$fakeUuid" $ah $null 404 "Non-existent building"
TestErr "NF-03" "GET" "$base/hostels/$fakeUuid" $ah $null 404 "Non-existent hostel"
TestErr "NF-04" "GET" "$base/rooms/$fakeUuid" $ah $null 404 "Non-existent room"
TestErr "NF-05" "GET" "$base/complaints/$fakeUuid" $ah $null 404 "Non-existent complaint"
TestErr "NF-06" "GET" "$base/leave/$fakeUuid" $ah $null 404 "Non-existent leave"
TestErr "NF-07" "GET" "$base/gate/entries/$fakeUuid" $ah $null 404 "Non-existent gate entry"
TestErr "NF-08" "GET" "$base/gate/passes/$fakeUuid" $ah $null 404 "Non-existent gate pass"
TestErr "NF-09" "GET" "$base/notices/$fakeUuid" $ah $null 404 "Non-existent notice"
TestErr "NF-10" "GET" "$base/violations/$fakeUuid" $ah $null 404 "Non-existent violation"
TestErr "NF-11" "GET" "$base/allotments/$fakeUuid" $ah $null 404 "Non-existent allotment"
TestErr "NF-12" "GET" "$base/registration/$fakeUuid" $ah $null 404 "Non-existent registration"
TestErr "NF-13" "GET" "$base/policies/$fakeUuid" $ah $null 404 "Non-existent policy"
TestErr "NF-14" "GET" "$base/students/profiles/$fakeUuid" $ah $null 404 "Non-existent student profile"

### DUPLICATE/CONFLICT CASES ###
Write-Output "`n--- Conflict/Duplicate Cases ---"
TestErr "DC-01" "POST" "$base/auth/signup" @{} '{"firstName":"A","lastName":"B","email":"ashwin.bangera@student.bms.edu","mobile":"9876543210","password":"Test@12345"}' 409 "Duplicate email signup"
TestErr "DC-02" "POST" "$base/buildings" $ah '{"code":"ANNEX","name":"Dup","location":"X","address":"X","contactNo":"1234567890","email":"x@x.com","totalFloors":1}' 409 "Duplicate building code"
TestErr "DC-03" "POST" "$base/hostels" $ah '{"code":"CH","name":"Dup","type":"BOYS","address":"X","totalBlocks":1,"contactNo":"1234567890","email":"x@x.com","capacity":10}' 409 "Duplicate hostel code"
TestErr "DC-04" "POST" "$base/rooms" $ah '{"hostelId":"'+"$hostelId"+'","roomNo":"101","floor":1}' 409 "Duplicate room number"

### PAGINATION ###
Write-Output "`n--- Pagination Tests ---"
TestErr "PG-01" "GET" "$base/users?page=1&limit=5" $ah $null 200 "Users page 1 limit 5"
TestErr "PG-02" "GET" "$base/users?page=999&limit=5" $ah $null 200 "Users page 999 (empty but 200)"
TestErr "PG-03" "GET" "$base/complaints?page=1&limit=10&status=OPEN" $ah $null 200 "Complaints filtered OPEN"
TestErr "PG-04" "GET" "$base/leave?page=1&limit=5&status=PENDING" $ah $null 200 "Leave filtered PENDING"
TestErr "PG-05" "GET" "$base/gate/entries?page=1&limit=10&type=IN" $ah $null 200 "Gate entries filtered IN"
TestErr "PG-06" "GET" "$base/notices?page=1&limit=5&priority=URGENT" $ah $null 200 "Notices filtered URGENT"
TestErr "PG-07" "GET" "$base/violations?page=1&limit=5&type=LATE_ENTRY" $ah $null 200 "Violations filtered LATE_ENTRY"

### SEARCH ###
Write-Output "`n--- Search/Filter Tests ---"
TestErr "SF-01" "GET" "$base/users?search=ashwin" $ah $null 200 "Search users by name"
TestErr "SF-02" "GET" "$base/students/profiles?search=bangera" $ah $null 200 "Search students by name"
TestErr "SF-03" "GET" "$base/complaints?search=fan" $ah $null 200 "Search complaints"
TestErr "SF-04" "GET" "$base/gate/entries?fromDate=2026-01-01&toDate=2026-12-31" $ah $null 200 "Gate entries date range"
TestErr "SF-05" "GET" "$base/notices?search=maintenance" $ah $null 200 "Search notices"

### CROSS-ROLE TESTS ###
Write-Output "`n--- Cross-Role Access ---"
# Student accessing another student's data
TestErr "CR-01" "GET" "$base/violations/student/$adminUserId" $ah $null 200 "Admin view any student violations"
# Parent leave view
TestErr "CR-02" "GET" "$base/leave" $ph $null 200 "Parent can view leave"
# Student gate passes (own only)
TestErr "CR-03" "GET" "$base/gate/passes" $sh $null 200 "Student can view own passes"
# Student complaint (own only)
TestErr "CR-04" "GET" "$base/complaints" $sh $null 200 "Student can view own complaints"
# Notifications universal
TestErr "CR-05" "GET" "$base/notifications" $ph $null 200 "Parent notifications"
TestErr "CR-06" "GET" "$base/notifications/unread-count" $ph $null 200 "Parent unread count"

### LEAVE WORKFLOW EDGE CASES ###
Write-Output "`n--- Leave Workflow Edges ---"
# Already approved leave cannot be re-approved
TestErr "LW-01" "POST" "$base/leave/bfec7c04-2418-4be0-8300-58d334f0fe19/warden-approve" $ah '{"notes":"re-approve"}' 409 "Cannot re-approve already approved leave"
# Cannot cancel approved leave
TestErr "LW-02" "POST" "$base/leave/bfec7c04-2418-4be0-8300-58d334f0fe19/cancel" $sh $null 409 "Cannot cancel approved leave"
# Already rejected leave cannot be rejected again
TestErr "LW-03" "POST" "$base/leave/9eac33f3-7789-44ec-974c-1004825c0882/reject" $ah '{"rejectionReason":"re-reject"}' 409 "Cannot re-reject"
# Already cancelled leave
TestErr "LW-04" "POST" "$base/leave/968a582f-9233-4e8a-a3db-2bd4a2fd2d05/warden-approve" $ah '{"notes":"try approve"}' 409 "Cannot approve cancelled leave"

### ALLOTMENT EDGE CASES ###
Write-Output "`n--- Allotment Edge Cases ---"
TestErr "AL-01" "POST" "$base/allotments/assign" $ah '{"studentId":"'+"$studentUserId"+'","bedId":"'+"$fakeUuid"+'"}' 404 "Assign to non-existent bed"
TestErr "AL-02" "POST" "$base/allotments/transfer" $ah '{"studentId":"'+"$studentUserId"+'","newBedId":"'+"$fakeUuid"+'"}' 404 "Transfer to non-existent bed"

### COMPLAINT WORKFLOW ###
Write-Output "`n--- Complaint Status Flow ---"
# Get a complaint to test status transitions
$comps = Invoke-RestMethod -Uri "$base/complaints" -Headers $ah
$testCompId = $null
if ($comps.data -is [array] -and $comps.data.Count -gt 0) { $testCompId = $comps.data[0].id }
elseif ($comps.data.data -and $comps.data.data.Count -gt 0) { $testCompId = $comps.data.data[0].id }

if ($testCompId) {
    TestErr "CW-01" "PATCH" "$base/complaints/$testCompId" $ah '{"status":"RESOLVED","resolution":"Fixed the fan"}' 200 "Resolve complaint"
    TestErr "CW-02" "PATCH" "$base/complaints/$testCompId" $ah '{"status":"CLOSED"}' 200 "Close complaint"
    TestErr "CW-03" "PATCH" "$base/complaints/$testCompId" $ah '{"status":"REOPENED"}' 200 "Reopen complaint"
} else {
    T "CW-01" "SKIP" "No complaint to test workflow"
}

### BUILDING/HOSTEL UPDATE & SOFT DELETE ###
Write-Output "`n--- Update & Soft Delete ---"
# Get the test building
$bldgs = Invoke-RestMethod -Uri "$base/buildings" -Headers $ah
$testBldg = ($bldgs.data | Where-Object { $_.code -eq "TEST-BLD-01" })
if ($testBldg) {
    $tbId = $testBldg.id
    TestErr "UD-01" "PATCH" "$base/buildings/$tbId" $ah '{"name":"Test Building Updated","description":"Updated for testing"}' 200 "Update building"
    TestErr "UD-02" "DELETE" "$base/buildings/$tbId" $ah $null 200 "Soft-delete building"
} else {
    T "UD-01" "SKIP" "No test building found"
    T "UD-02" "SKIP" "No test building found"
}

# Get the test hostel
$hstls = Invoke-RestMethod -Uri "$base/hostels" -Headers $ah
$testHstl = ($hstls.data | Where-Object { $_.code -eq "TSTHSTL" })
if ($testHstl) {
    $thId = $testHstl.id
    TestErr "UD-03" "PATCH" "$base/hostels/$thId" $ah '{"name":"Test Hostel Updated","description":"Updated"}' 200 "Update hostel"
    TestErr "UD-04" "DELETE" "$base/hostels/$thId" $ah $null 200 "Soft-delete hostel"
} else {
    T "UD-03" "SKIP" "No test hostel found"
    T "UD-04" "SKIP" "No test hostel found"
}

### REGISTRATION WORKFLOW ###
Write-Output "`n--- Registration Advanced ---"
$myRegs = Invoke-RestMethod -Uri "$base/registration/my" -Headers $sh
$myRegId = $null
if ($myRegs.data -is [array] -and $myRegs.data.Count -gt 0) {
    # Find a draft registration
    $draftReg = $myRegs.data | Where-Object { $_.status -eq "DRAFT" }
    if ($draftReg) { $myRegId = $draftReg.id }
    else { $myRegId = $myRegs.data[0].id }
}
if ($myRegId) {
    TestErr "RW-01" "GET" "$base/registration/$myRegId" $sh $null 200 "Student view own registration"
}

# Admin can view all
TestErr "RW-02" "GET" "$base/registration?page=1&limit=5" $ah $null 200 "Admin paginated registrations"
TestErr "RW-03" "GET" "$base/registration?status=ALLOTTED" $ah $null 200 "Filter registrations by status"

### UPLOADS PATH TRAVERSAL ###
Write-Output "`n--- Upload Security ---"
TestErr "US-01" "GET" "$base/uploads/photos/../../../etc/passwd" $ah $null 400 "Path traversal blocked"
TestErr "US-02" "GET" "$base/uploads/invalid-type/file.jpg" $ah $null 400 "Invalid upload type"

### RATE LIMITING (just verify headers exist) ###
Write-Output "`n--- API Responsiveness ---"
$startTime = Get-Date
TestErr "AP-01" "GET" "$base/dashboard/stats" $ah $null 200 "Dashboard response"
$elapsed1 = ((Get-Date) - $startTime).TotalMilliseconds
TestErr "AP-02" "GET" "$base/hostels" $ah $null 200 "Hostels list response"
$elapsed2 = ((Get-Date) - $startTime).TotalMilliseconds
Write-Output "[INFO] Dashboard: ${elapsed1}ms, Hostels: ${elapsed2}ms"

Write-Output "`n==========================================="
Write-Output "  EDGE CASE SUMMARY"
Write-Output "==========================================="
Write-Output "PASS: $pass | FAIL: $fail | SKIP: $skip | TOTAL: $($pass + $fail + $skip)"
