# Security Specification - Khatmat A'ilaty

## Data Invariants
1. A `User` document must exist for every authenticated user who interacts with the system.
2. A `Khatma` must have a `createdBy` field matching the UID of the creator.
3. A `Juz` reservation must have a `reservedById` matching the UID of the user who reserved it.
4. `isAdmin` field in `User` documents cannot be modified by the user themselves (only by existing admins or via console).
5. Timestamps like `createdAt` and `reservedAt` must be set using `request.time`.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to create a `Khatma` with `createdBy` set to another user's UID.
2. **Privilege Escalation**: Attempt to update own `User` document to set `isAdmin: true`.
3. **Reservation Theft**: Attempt to cancel someone else's `Juz` reservation.
4. **Invalid State Transition**: Attempt to reserve a `Juz` that is already `RESERVED`.
5. **Juz Spoofing**: Attempt to reserve a `Juz` but set `reservedBy` name to someone else while using own UID.
6. **Orphaned Writes**: Attempt to create a `Juz` reservation in a non-existent `Khatma`.
7. **Resource Poisoning**: Attempt to set a `Khatma` title to a 2MB string.
8. **Bypassing Terminal State**: Attempt to modify a `Juz` in a `Khatma` that is already marked as `COMPLETED` or `CANCELLED`. (Wait, maybe just `CANCELLED`).
9. **Timestamp Manipulation**: Providing a client-side date for `createdAt` instead of `request.time`.
10. **Shadow Field Injection**: Adding a `verifed: true` field to a `Juz` update.
11. **Malicious ID**: Attempting to create a document with an ID containing path traversal characters like `../`.
12. **Anonymous Access**: Attempting to read or write without being authenticated.

## Implementation Plan
- `isValidId(id)` for path variable hardening.
- `isAdmin()` helper checking `users/$(request.auth.uid).isAdmin`.
- `isValidUser`, `isValidKhatma`, `isValidJuz` helper functions.
- `affectedKeys().hasOnly()` gates for updates.
