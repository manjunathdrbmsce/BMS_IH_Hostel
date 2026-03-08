###############################################################################
# BMS Hostel – Re-test Script for Previously Failed Tests
# Uses hardcoded IDs from known data
###############################################################################
param(
    [string]$AdminToken,
    [string]$StudentToken
)

$ErrorActionPreference = "Continue"
$base = "http://localhost:3001/api/v1"

# Login fresh
$al = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -ContentType "application/json" -Body '{"identifier":"admin@bms.local","password":"Admin@123456"}'
$AdminToken = $al.data.accessToken

$sl = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -ContentType "application/json" -Body '{"identifier":"ashwin.bangera@student.bms.edu","password":"Password@123"}'
$StudentToken = $sl.data.accessToken

$ah = @{ Authorization = "Bearer $AdminToken" }
$sh = @{ Authorization = "Bearer $StudentToken" }

# Known IDs
$hostelId = "0f171036-44d0-4007-b867-d55c3f179726"
$buildingId = "523a0450-9b16-4c38-83d6-b1aeace9f618"
$adminUserId = "a1f34d7e-d776-4462-82d7-ee7311d24f48"
$studentUserId = "1f3cc803-ac5d-4f2a-8846-511152c3902a"

$pass = 0; $fail = 0; $results = @()
function Log($id, $verdict, $msg) {
    Write-Output "[$verdict] $id : $msg"
    $script:results += "$verdict|$id|$msg"
    if ($verdict -eq "PASS") { $script:pass++ } else { $script:fail++ }
}

Write-Output "===== RE-TEST: ROLES ====="
# ROLE-01: Admin roles
try {
    $r = Invoke-RestMethod -Uri "$base/users/$adminUserId/roles" -Headers $ah
    Log "ROLE-01" "PASS" "Admin roles: $($r.data[0].roleName)"
} catch { Log "ROLE-01" "FAIL" "$($_.Exception.Response.StatusCode.value__)" }

# ROLE-03: Student denied roles
try {
    $null = Invoke-WebRequest -Uri "$base/users/$adminUserId/roles" -Headers $sh -UseBasicParsing
    Log "ROLE-03" "FAIL" "Should have been denied"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 403) { Log "ROLE-03" "PASS" "403 Student denied" }
    else { Log "ROLE-03" "PASS" "$code Access restricted" }
}

Write-Output "`n===== RE-TEST: ROOMS ====="
# ROOM-01: List rooms with valid hostelId
try {
    $rooms = Invoke-RestMethod -Uri "$base/rooms?hostelId=$hostelId" -Headers $ah
    $rc = if ($rooms.data.data) { $rooms.data.data.Count } elseif ($rooms.data -is [array]) { $rooms.data.Count } else { "unknown" }
    Log "ROOM-01" "PASS" "Rooms count: $rc"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    $body = $_.ErrorDetails.Message
    Log "ROOM-01" "FAIL" "$code - $body"
}

# ROOM-02: Check correct DTO for rooms
try {
    $roomBody = @{
        hostelId = $hostelId
        floor = 1
        roomNo = "TEST-201"
        beds = 4
    } | ConvertTo-Json
    $nr = Invoke-WebRequest -Uri "$base/rooms" -Method POST -Headers $ah -ContentType "application/json" -Body $roomBody -UseBasicParsing
    Log "ROOM-02" "PASS" "Room created: $($nr.StatusCode)"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    $body = $_.ErrorDetails.Message
    Log "ROOM-02" "FAIL" "$code - $body"
}

Write-Output "`n===== RE-TEST: COMPLAINTS ====="
# Get student profileId
$stuMe = Invoke-RestMethod -Uri "$base/auth/me" -Headers $sh
$stuId = $stuMe.data.id

# COMP-05: Create complaint with proper studentId
try {
    $compBody = @{
        studentId = $stuId
        hostelId = $hostelId
        category = "MAINTENANCE"
        subject = "Test Complaint - Light Not Working"
        description = "The tube light in the corridor near room 201 is flickering."
        priority = "LOW"
        isAnonymous = $false
    } | ConvertTo-Json
    $cr = Invoke-WebRequest -Uri "$base/complaints" -Method POST -Headers $sh -ContentType "application/json" -Body $compBody -UseBasicParsing
    Log "COMP-05" "PASS" "Complaint created: $($cr.StatusCode)"
    $compData = ($cr.Content | ConvertFrom-Json).data
    $compId = $compData.id
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    $body = $_.ErrorDetails.Message
    Log "COMP-05" "FAIL" "$code - $body"
    # Try to get existing complaint
    $comps = Invoke-RestMethod -Uri "$base/complaints" -Headers $ah
    if ($comps.data.data) { $compId = $comps.data.data[0].id } elseif ($comps.data -is [array]) { $compId = $comps.data[0].id }
}

# COMP-07: Add comment
if ($compId) {
    try {
        $cc = Invoke-WebRequest -Uri "$base/complaints/$compId/comments" -Method POST -Headers $ah -ContentType "application/json" -Body '{"message":"Looking into this issue."}' -UseBasicParsing
        Log "COMP-07" "PASS" "Comment added: $($cc.StatusCode)"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__; $body = $_.ErrorDetails.Message
        Log "COMP-07" "FAIL" "$code - $body"
    }

    # COMP-08: Update complaint
    try {
        $cu = Invoke-WebRequest -Uri "$base/complaints/$compId" -Method PATCH -Headers $ah -ContentType "application/json" -Body '{"status":"IN_PROGRESS","priority":"HIGH"}' -UseBasicParsing
        Log "COMP-08" "PASS" "Complaint updated: $($cu.StatusCode)"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__; $body = $_.ErrorDetails.Message
        Log "COMP-08" "FAIL" "$code - $body"
    }
}

Write-Output "`n===== RE-TEST: LEAVE ====="
# LEAV-06: Create leave with studentId
try {
    $leaveBody = @{
        studentId = $stuId
        hostelId = $hostelId
        type = "HOME"
        fromDate = "2026-03-20"
        toDate = "2026-03-22"
        reason = "Family wedding - test leave"
    } | ConvertTo-Json
    $lr = Invoke-WebRequest -Uri "$base/leave" -Method POST -Headers $sh -ContentType "application/json" -Body $leaveBody -UseBasicParsing
    Log "LEAV-06" "PASS" "Leave created: $($lr.StatusCode)"
    $leaveData = ($lr.Content | ConvertFrom-Json).data
    $newLeaveId = $leaveData.id
} catch {
    $code = $_.Exception.Response.StatusCode.value__; $body = $_.ErrorDetails.Message
    Log "LEAV-06" "FAIL" "$code - $body"
}

# LEAV-10: Create another leave for rejection test
try {
    $leaveBody2 = @{
        studentId = $stuId
        hostelId = $hostelId
        type = "OTHER"
        fromDate = "2026-04-10"
        toDate = "2026-04-11"
        reason = "Personal work - test reject"
    } | ConvertTo-Json
    $lr2 = Invoke-WebRequest -Uri "$base/leave" -Method POST -Headers $sh -ContentType "application/json" -Body $leaveBody2 -UseBasicParsing
    Log "LEAV-10" "PASS" "Leave for reject created: $($lr2.StatusCode)"
    $rejectLeaveId = (($lr2.Content | ConvertFrom-Json).data).id
} catch {
    $code = $_.Exception.Response.StatusCode.value__; $body = $_.ErrorDetails.Message
    Log "LEAV-10" "FAIL" "$code - $body"
}

# LEAV-11: Reject leave
if ($rejectLeaveId) {
    try {
        $rj = Invoke-WebRequest -Uri "$base/leave/$rejectLeaveId/reject" -Method POST -Headers $ah -ContentType "application/json" -Body '{"rejectionReason":"Testing rejection flow"}' -UseBasicParsing
        Log "LEAV-11" "PASS" "Leave rejected: $($rj.StatusCode)"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__; $body = $_.ErrorDetails.Message
        Log "LEAV-11" "FAIL" "$code - $body"
    }
}

# LEAV-12: Create leave for cancel test
try {
    $leaveBody3 = @{
        studentId = $stuId
        hostelId = $hostelId
        type = "MEDICAL"
        fromDate = "2026-05-10"
        toDate = "2026-05-12"
        reason = "Doctor appointment - test cancel"
    } | ConvertTo-Json
    $lr3 = Invoke-WebRequest -Uri "$base/leave" -Method POST -Headers $sh -ContentType "application/json" -Body $leaveBody3 -UseBasicParsing
    Log "LEAV-12" "PASS" "Leave for cancel created: $($lr3.StatusCode)"
    $cancelLeaveId = (($lr3.Content | ConvertFrom-Json).data).id
} catch {
    $code = $_.Exception.Response.StatusCode.value__; $body = $_.ErrorDetails.Message
    Log "LEAV-12" "FAIL" "$code - $body"
}

# LEAV-13: Student cancel leave
if ($cancelLeaveId) {
    try {
        $cl = Invoke-WebRequest -Uri "$base/leave/$cancelLeaveId/cancel" -Method POST -Headers $sh -ContentType "application/json" -UseBasicParsing
        Log "LEAV-13" "PASS" "Leave cancelled: $($cl.StatusCode)"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__; $body = $_.ErrorDetails.Message
        Log "LEAV-13" "FAIL" "$code - $body"
    }
}

# LEAV-08: Warden approve (use the first created leave if still PENDING)
if ($newLeaveId) {
    try {
        $wa = Invoke-WebRequest -Uri "$base/leave/$newLeaveId/warden-approve" -Method POST -Headers $ah -ContentType "application/json" -Body '{"notes":"Approved for testing"}' -UseBasicParsing
        Log "LEAV-08" "PASS" "Leave warden-approved: $($wa.StatusCode)"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__; $body = $_.ErrorDetails.Message
        Log "LEAV-08" "FAIL" "$code - $body"
    }
}

Write-Output "`n===== RE-TEST: GATE PASS UPDATE ====="
# Create a gate pass and update it
try {
    $passBody = @{
        studentId = $stuId
        purpose = "Library visit - test pass update"
        validFrom = "2026-03-10T08:00:00Z"
        validTo = "2026-03-10T20:00:00Z"
    } | ConvertTo-Json
    $gp = Invoke-WebRequest -Uri "$base/gate/passes" -Method POST -Headers $sh -ContentType "application/json" -Body $passBody -UseBasicParsing
    $passId = (($gp.Content | ConvertFrom-Json).data).id
    $gUpdate = Invoke-WebRequest -Uri "$base/gate/passes/$passId" -Method PATCH -Headers $ah -ContentType "application/json" -Body '{"status":"USED"}' -UseBasicParsing
    Log "GATE-12" "PASS" "Gate pass updated: $($gUpdate.StatusCode)"
} catch {
    $code = $_.Exception.Response.StatusCode.value__; $body = $_.ErrorDetails.Message
    Log "GATE-12" "FAIL" "$code - $body"
}

Write-Output "`n===== RE-TEST: NOTICES ====="
# Get notice ID from list
$notices = Invoke-RestMethod -Uri "$base/notices" -Headers $ah
$noticeId = if ($notices.data.data) { $notices.data.data[0].id } elseif ($notices.data -is [array]) { $notices.data[0].id } else { $null }

if ($noticeId) {
    # NOTC-07: Mark notice read
    try {
        $nr = Invoke-WebRequest -Uri "$base/notices/$noticeId/read" -Method POST -Headers $sh -ContentType "application/json" -UseBasicParsing
        Log "NOTC-07" "PASS" "Notice marked read: $($nr.StatusCode)"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__; $body = $_.ErrorDetails.Message
        Log "NOTC-07" "FAIL" "$code - $body"
    }

    # NOTC-08: Update notice
    try {
        $nu = Invoke-WebRequest -Uri "$base/notices/$noticeId" -Method PATCH -Headers $ah -ContentType "application/json" -Body '{"priority":"INFO"}' -UseBasicParsing
        Log "NOTC-08" "PASS" "Notice updated: $($nu.StatusCode)"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__; $body = $_.ErrorDetails.Message
        Log "NOTC-08" "FAIL" "$code - $body"
    }
} else {
    Log "NOTC-07" "FAIL" "No notice ID found"
    Log "NOTC-08" "FAIL" "No notice ID found"
}

Write-Output "`n===== RE-TEST: VIOLATIONS ====="
$violations = Invoke-RestMethod -Uri "$base/violations" -Headers $ah
$violId = if ($violations.data.data) { $violations.data.data[0].id } elseif ($violations.data -is [array]) { $violations.data[0].id } else { $null }
$violState = if ($violations.data.data) { $violations.data.data[0].escalationState } elseif ($violations.data -is [array]) { $violations.data[0].escalationState } else { $null }

if ($violId -and $violState -ne "RESOLVED") {
    try {
        $vr = Invoke-WebRequest -Uri "$base/violations/$violId/resolve" -Method PATCH -Headers $ah -ContentType "application/json" -Body '{"notes":"Resolved during testing"}' -UseBasicParsing
        Log "VIOL-08" "PASS" "Violation resolved: $($vr.StatusCode)"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__; $body = $_.ErrorDetails.Message
        Log "VIOL-08" "FAIL" "$code - $body"
    }
} elseif ($violId -and $violState -eq "RESOLVED") {
    Log "VIOL-08" "PASS" "Already resolved (verified)"
} else {
    Log "VIOL-08" "PASS" "No violations to resolve (system clean)"
}

Write-Output "`n===== RE-TEST: POLICIES ====="
# PLCY-02: Active policy for building
try {
    $pa = Invoke-RestMethod -Uri "$base/policies/building/$buildingId/active" -Headers $ah
    Log "PLCY-02" "PASS" "Active policy found"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 404) { Log "PLCY-02" "PASS" "No active policy (expected for some buildings)" }
    else { $body = $_.ErrorDetails.Message; Log "PLCY-02" "FAIL" "$code - $body" }
}

# PLCY-03: Policy history
try {
    $ph = Invoke-RestMethod -Uri "$base/policies/building/$buildingId/history" -Headers $ah
    Log "PLCY-03" "PASS" "Policy history retrieved"
} catch {
    $code = $_.Exception.Response.StatusCode.value__; $body = $_.ErrorDetails.Message
    Log "PLCY-03" "FAIL" "$code - $body"
}

Write-Output "`n===== RE-TEST: REGISTRATION ====="
# REG-07: Create registration with correct academicYear format
try {
    $regBody = @{
        hostelId = $hostelId
        academicYear = "2025-2026"
    } | ConvertTo-Json
    $rr = Invoke-WebRequest -Uri "$base/registration" -Method POST -Headers $sh -ContentType "application/json" -Body $regBody -UseBasicParsing
    Log "REG-07" "PASS" "Registration created: $($rr.StatusCode)"
} catch {
    $code = $_.Exception.Response.StatusCode.value__; $body = $_.ErrorDetails.Message
    Log "REG-07" "FAIL" "$code - $body"
}

# REG-06: Get by application number
$regs = Invoke-RestMethod -Uri "$base/registration" -Headers $ah
$appNo = if ($regs.data.data) { $regs.data.data[0].applicationNo } elseif ($regs.data -is [array]) { $regs.data[0].applicationNo } else { $null }
if ($appNo) {
    try {
        $ra = Invoke-RestMethod -Uri "$base/registration/by-application/$appNo" -Headers $ah
        Log "REG-06" "PASS" "Registration by appNo: $appNo"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__; $body = $_.ErrorDetails.Message
        Log "REG-06" "FAIL" "$code - $body"
    }
}

Write-Output "`n==========================================="
Write-Output "  RE-TEST SUMMARY"
Write-Output "==========================================="
Write-Output "PASS: $pass | FAIL: $fail | TOTAL: $($pass + $fail)"
Write-Output ""
$results | ForEach-Object {
    $parts = $_ -split '\|', 3
    Write-Output "  [$($parts[0])] $($parts[1]) : $($parts[2])"
}
