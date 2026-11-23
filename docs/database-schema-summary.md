# Database Schema and Relationships

Core entities implemented in Prisma schema:

- User
- Role
- UserRole
- AuditReport
- Recommendation
- FollowUpUpdate
- Justification
- NotificationLog
- ReportType
- LegalEntity
- Site
- Department
- RecommendationStatus
- NotificationSetting
- Document
- AuditLog
- UserProfile

## Key relationships

- AuditReport 1..N Recommendation
- Recommendation 1..N FollowUpUpdate
- Recommendation 1..N Justification
- User N..N Role through UserRole
- Department 1..N User and 1..N Recommendation
- LegalEntity 1..N Site and 1..N Recommendation
- RecommendationStatus 1..N Recommendation
- User 1..N audit and ownership relations (creator, updater, owner, closer)

## Integrity controls

- Composite uniqueness for recommendation number per report.
- Indexes on due dates, status, departments for follow-up and dashboard performance.
- Notification dedupe key: recommendationId + recipientId + eventKey + scheduledAt.
- Soft archival through archive state fields instead of destructive deletion.
- Timestamps and user references for traceability.
