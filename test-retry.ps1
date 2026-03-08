$base = "http://localhost:3001/api/v1"
$al = Invoke-RestMethod "$base/auth/login" -Method POST -ContentType "application/json" -Body '{"identifier":"admin@bms.local","password":"Admin@123456"}'
$TOKEN = $al.data.accessToken
$sl = Invoke-RestMethod "$base/auth/login" -Method POST -ContentType "application/json" -Body '{"identifier":"ashwin.bangera@student.bms.edu","password":"Password@123"}'
$STOKEN = $sl.data.accessToken
$ah = @{ Authorization = "Bearer $TOKEN" }
$sh = @{ Authorization = "Bearer $STOKEN" }

Write-Output "=== Retry Tests ==="

# SR-03: Student denied create room
$body1 = '{"hostelId":"0f171036-44d0-4007-b867-d55c3f179726","roomNo":"X","floor":1}'
try { $null = Invoke-WebRequest "$base/rooms" -Method POST -Headers $sh -ContentType "application/json" -Body $body1 -UseBasicParsing; Write-Output "SR-03: FAIL (got 2xx)" } catch { Write-Output "SR-03: $($_.Exception.Response.StatusCode.value__) - Expected 403" }

# SR-06: Student denied assign bed
$body2 = '{"studentId":"1f3cc803-ac5d-4f2a-8846-511152c3902a","bedId":"00000000-0000-0000-0000-000000000000"}'
try { $null = Invoke-WebRequest "$base/allotments/assign" -Method POST -Headers $sh -ContentType "application/json" -Body $body2 -UseBasicParsing; Write-Output "SR-06: FAIL (got 2xx)" } catch { Write-Output "SR-06: $($_.Exception.Response.StatusCode.value__) - Expected 403" }

# SR-07: Student denied create policy
$body3 = '{"buildingId":"523a0450-9b16-4c38-83d6-b1aeace9f618","weekdayCurfew":"22:00","weekendCurfew":"23:00"}'
try { $null = Invoke-WebRequest "$base/policies" -Method POST -Headers $sh -ContentType "application/json" -Body $body3 -UseBasicParsing; Write-Output "SR-07: FAIL (got 2xx)" } catch { Write-Output "SR-07: $($_.Exception.Response.StatusCode.value__) - Expected 403" }

# DC-04: Duplicate room
$body4 = '{"hostelId":"0f171036-44d0-4007-b867-d55c3f179726","roomNo":"101","floor":1}'
try { $null = Invoke-WebRequest "$base/rooms" -Method POST -Headers $ah -ContentType "application/json" -Body $body4 -UseBasicParsing; Write-Output "DC-04: FAIL (got 2xx)" } catch { Write-Output "DC-04: $($_.Exception.Response.StatusCode.value__) - Expected 409" }

# AL-01: Assign to non-existent bed
$body5 = '{"studentId":"1f3cc803-ac5d-4f2a-8846-511152c3902a","bedId":"00000000-0000-0000-0000-000000000000"}'
try { $null = Invoke-WebRequest "$base/allotments/assign" -Method POST -Headers $ah -ContentType "application/json" -Body $body5 -UseBasicParsing; Write-Output "AL-01: FAIL (got 2xx)" } catch { Write-Output "AL-01: $($_.Exception.Response.StatusCode.value__) - Expected 404" }

# AL-02: Transfer to non-existent bed
$body6 = '{"studentId":"1f3cc803-ac5d-4f2a-8846-511152c3902a","newBedId":"00000000-0000-0000-0000-000000000000"}'
try { $null = Invoke-WebRequest "$base/allotments/transfer" -Method POST -Headers $ah -ContentType "application/json" -Body $body6 -UseBasicParsing; Write-Output "AL-02: FAIL (got 2xx)" } catch { Write-Output "AL-02: $($_.Exception.Response.StatusCode.value__) - Expected 404" }

# LW-02: Check leave status after cancel attempt
$lv = Invoke-RestMethod "$base/leave/bfec7c04-2418-4be0-8300-58d334f0fe19" -Headers $ah
Write-Output "LW-02: Leave status = $($lv.data.status)"

Write-Output "=== Done ==="
