

# RLS Security Test Suite - Implementation Plan

## Overview

Create a comprehensive Supabase migration that tests Row Level Security (RLS) policies to verify that users cannot access each other's data. This is a critical security verification that should run during deployment.

## What This Test Will Do

1. **Create two test users** with predictable UUIDs
2. **Insert test data** for User 1 across all core tables
3. **Switch context** to User 2 and verify they CANNOT see User 1's data
4. **Verify protection** for all CRUD operations (SELECT, INSERT, UPDATE, DELETE)
5. **Verify User 1 CAN see** their own data (positive test)
6. **Clean up** all test data automatically
7. **Fail the migration** if any security test fails

## Tables Being Tested

| Table | Primary Key | Test Data |
|-------|-------------|-----------|
| `tasks` | `task_id` | "User 1 Secret Task" |
| `cycles_90_day` | `cycle_id` | "User 1 Secret Goal" |
| `daily_plans` | `day_id` | "User 1 Secret Plan" |
| `projects` | `id` | "User 1 Secret Project" |
| `ideas_db` | `idea_id` | "User 1 Secret Idea" |
| `journal_pages` | `id` | "User 1 Secret Journal" |

## Test Cases

### Data Isolation Tests (6 tests)
- ✅ User 2 cannot SELECT User 1's tasks
- ✅ User 2 cannot SELECT User 1's cycles
- ✅ User 2 cannot SELECT User 1's daily plans
- ✅ User 2 cannot SELECT User 1's projects
- ✅ User 2 cannot SELECT User 1's ideas
- ✅ User 2 cannot SELECT User 1's journal pages

### Positive Access Test (1 test)
- ✅ User 1 CAN see their own data

### Write Protection Tests (3 tests)
- ✅ User 2 cannot INSERT data as User 1
- ✅ User 2 cannot UPDATE User 1's data
- ✅ User 2 cannot DELETE User 1's data

**Total: 10 tests**

## Technical Implementation

### Test User IDs
```sql
test_user_1 UUID := '10000000-0000-0000-0000-000000000001'
test_user_2 UUID := '20000000-0000-0000-0000-000000000002'
```

### Context Switching Pattern
```sql
-- Switch to authenticated user context
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub = 'user-uuid-here';

-- Run test query
SELECT ... 

-- Reset role
RESET ROLE;
```

### Result Tracking
- Track passed/failed count
- Accumulate results in TEXT variable
- RAISE EXCEPTION if any test fails (stops deployment)

## File to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/[timestamp]_rls_security_test.sql` | Comprehensive RLS bypass test suite |

## Expected Console Output

```
===========================================
RLS SECURITY TEST SUITE
Testing data isolation between users
===========================================

Setting up test data...
Test data created ✓

TEST 1: Tasks table RLS
TEST 2: Cycles table RLS
TEST 3: Daily Plans table RLS
TEST 4: Projects table RLS
TEST 5: Ideas table RLS
TEST 6: Journal Pages table RLS
TEST 7: User can see own data
TEST 8: INSERT protection
TEST 9: UPDATE protection
TEST 10: DELETE protection

Cleaning up test data...
Cleanup complete ✓

===========================================
TEST RESULTS
===========================================
✅ Tasks: User 2 cannot see User 1 data
✅ Cycles: User 2 cannot see User 1 data
✅ Daily Plans: User 2 cannot see User 1 data
✅ Projects: User 2 cannot see User 1 data
✅ Ideas: User 2 cannot see User 1 data
✅ Journal Pages: User 2 cannot see User 1 data
✅ User 1 can see their own data
✅ INSERT protection: User 2 cannot insert as User 1
✅ UPDATE protection: User 2 cannot update User 1 data
✅ DELETE protection: User 2 cannot delete User 1 data

Passed: 10 | Failed: 0
===========================================

✅ ALL TESTS PASSED - RLS is properly configured
```

## Failure Behavior

If any test fails:
```
❌ CRITICAL: User 2 can see User 1 tasks!

...

Passed: 8 | Failed: 2
===========================================

ERROR: SECURITY VULNERABILITIES DETECTED! 2 test(s) failed. FIX IMMEDIATELY before proceeding.
```

The migration will FAIL, preventing deployment until RLS issues are fixed.

## Risk Assessment

| Aspect | Risk | Notes |
|--------|------|-------|
| Test execution | 🟢 None | Read-only tests wrapped in transaction |
| Data cleanup | 🟢 None | Cleanup runs in same transaction |
| Production impact | 🟢 None | Uses fake UUIDs that don't exist |
| False positives | 🟢 Low | Tests clear expectations |

## Implementation Ready

This migration will be self-contained and can be run immediately after approval.

