# 🎓 SkillBridge — On-Demand Tutoring Marketplace (Backend)

SkillBridge is a scalable marketplace backend platform that connects students with subject-matter expert tutors for live learning sessions. It manages dynamic tutor availability, conflict-free booking slots, and session progress tracking.

### ✨ Key Features
- **Role Architecture:** Tailored workflows for `STUDENT`, `TUTOR`, and `ADMIN`.
- **Dynamic Slot Booking:** Prevents double-booking issues with dynamic availability management.
- **Session Lifecycle:** Tracks booking states (`PENDING` ➔ `CONFIRMED` ➔ `COMPLETED` / `CANCELLED`).
- **Tutor Verification System:** Admin workflow for approving tutor profiles and qualifications.
- **Review & Ratings:** Post-session feedback loop to maintain teaching quality.

### 🛠️ Tech Stack
- **Language:** TypeScript
- **Runtime:** Node.js / Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma