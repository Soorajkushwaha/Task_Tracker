# WorkTrack Zero-Trust Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Strict Document Ownership**: Every document in `tasks`, `operations`, `purchaseOrders`, `escalations`, `assignments`, `projects`, `timeLogs`, `activityLogs`, `importJobs`, and `notificationPreferences` must have `ownerId == request.auth.uid`.
2. **Verified Email Allowlist Enforcement**: Write and read access requires `request.auth != null && request.auth.token.email_verified == true`.
3. **Immutable Audit Trail**: `activityLogs` and `importJobs` are append-only (`allow update, delete: if false;`).
4. **Immutable Ownership & Creation Timestamps**: `ownerId` and `createdAt` can never change during `update`.
5. **Server Timestamps**: `createdAt` and `updatedAt` must equal `request.time`.
6. **Strict Schema & Volumetric Bounds**: All strings and arrays have explicit `.size()` bounds; `hasOnly()` blocks ghost fields.
7. **Query Enforcer**: Every `allow list` rule validates `resource.data.ownerId == request.auth.uid` so un-scoped queries are rejected.

## 2. The "Dirty Dozen" Payloads
1. **Identity Spoofing**: Creating a task with `ownerId: "victim-uid"` while authenticated as `"attacker-uid"` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoofing**: Writing with `email: "simple.sooraj@gmail.com"` and `email_verified: false` -> `PERMISSION_DENIED`.
3. **Shadow Field Injection**: Updating a task with `{ title: "Valid", isAdmin: true }` -> `PERMISSION_DENIED` (`hasOnly` check).
4. **Ownership Hijack on Update**: Updating `ownerId` on an existing operation record -> `PERMISSION_DENIED`.
5. **Audit Log Tampering**: Updating or deleting an `activityLogs` document -> `PERMISSION_DENIED`.
6. **Denial-of-Wallet String Bomb**: Creating a task with a 10,000-character `title` -> `PERMISSION_DENIED`.
7. **ID Poisoning**: Creating a document with a 500-character or special-character document ID -> `PERMISSION_DENIED` (`isValidId` check).
8. **Unbounded Tag Array**: Creating a task with 50 tags (`tags.size() > 10`) -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Creating a record with a backdated `createdAt` not matching `request.time` -> `PERMISSION_DENIED`.
10. **Cross-Tenant List Scraping**: Querying `collection(db, 'tasks')` without `where('ownerId', '==', uid)` -> `PERMISSION_DENIED`.
11. **PII Profile Leak**: Reading `/users/{otherUid}` when `request.auth.uid != otherUid` -> `PERMISSION_DENIED`.
12. **Invalid Enum State Injection**: Setting `priority: "SUPER_CRITICAL"` on a task -> `PERMISSION_DENIED`.
