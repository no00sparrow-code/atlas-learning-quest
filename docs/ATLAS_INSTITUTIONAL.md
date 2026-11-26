# Institutional Atlas

Last reviewed: 26 November 2026

## Status

<badge>NOT IMPLEMENTED</badge>

The repository currently has no functioning institutional tenant, teacher account, classroom, assignment, reporting or institutional administration system. The reference backend schema and the Master Development Directive describe future requirements; they are not evidence that these features exist.

Institutional Atlas should be developed after secure identity, account isolation, cloud sync, audit logging and safeguarding foundations are verified.

## Intended scope

Institutional Atlas is a separate capability for schools and educational organisations. It should support:

- Organisations and verified organisation administrators.
- Teacher accounts and institution-managed access.
- Classrooms and private learning groups.
- Curriculum and learning pathways.
- Assignments, quizzes and practical challenges.
- Learner progress and knowledge-gap reports.
- Teacher dashboards and institutional administration.
- Exports and retention controls appropriate to the organisation.

## Proposed domain boundaries

| Domain | Purpose | Access boundary |
|---|---|---|
| Organisation | Tenant identity and configuration | Organisation administrators |
| Membership | Teacher, learner and administrator membership | Organisation-scoped |
| Classroom | Class roster and learning group | Assigned teachers and members |
| Curriculum | Approved learning pathways | Organisation policy |
| Assignment | Work issued by a teacher | Assigned learners and teachers |
| Submission | Learner work and feedback | Learner and authorised teacher |
| Progress report | Mastery, revision and knowledge gaps | Minimum necessary teacher access |
| Audit | Sensitive administrative activity | Authorised institutional administrators |

These are design boundaries, not current database tables or APIs.

## Security and safeguarding requirements

- Every institutional record must be tenant-scoped.
- Teachers must only see learners and classrooms they are authorised to access.
- Learners must not be able to change their organisation, classroom or role by editing client state.
- Institutional administrators and ordinary teachers need separate permissions.
- Use server-derived identity and RLS; never trust browser-supplied organisation IDs or role flags.
- Minimise student data collection.
- Define age-appropriate privacy, retention, deletion and export policies.
- Private messages must not become visible to teachers by default.
- Any exceptional safeguarding access must be narrowly authorised, justified and audited.
- Provide reporting and escalation procedures appropriate to the institution and jurisdiction.

## Required integration tests

- Two organisations cannot read or modify each other's data.
- A teacher cannot access an unassigned classroom.
- A learner cannot read another learner's submission or report.
- A teacher cannot promote themselves to an administrator.
- A removed member loses access immediately.
- Organisation deletion and learner data export follow approved retention rules.
- Audit logs capture sensitive role and access changes.

## Dependencies and blockers

- Lovable Cloud Auth and secure sessions.
- Reviewed multi-tenant RLS policies.
- Two-account and cross-tenant security tests.
- Institutional owner and safeguarding policies.
- Jurisdiction-specific privacy and child-protection review.
- Approved data retention, export and deletion process.

Do not build institutional dashboards on top of browser-local demo state and present them as school-ready functionality.
