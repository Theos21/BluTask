# BluTask — App Store & Google Play Listing

---

## App Store (iOS)

**App Name** (30 chars)
```
BluTask
```

**Subtitle** (30 chars)
```
Organize your life in one place
```

**Category:** Productivity
**Secondary Category:** Education
**Age Rating:** 4+
**Price:** Free

### Description (4000 chars max)

```
BluTask is the calm, focused home for everything you're working on — tasks, school assignments, entertainment, and your calendar, all in one place.

ORGANIZED BY SPACE
Each area of your life gets its own color-coded space. Tasks for work and personal projects. School for classes and assignments. Watch for your shows and movies. Calendar to see it all in one view.

TASKS THAT STAY SORTED
Create folders, lists, and tags to organize everything. Add tasks naturally — type "Reply to Marcus #admin tomorrow" and BluTask routes it to the right list with the right date. Quick capture means nothing falls through the cracks.

SCHOOL, SIMPLIFIED
Track every class, assignment, and deadline in one place. Color-coded course cards show pending work at a glance. Paste a syllabus and AI structures it into individual assignments with due dates automatically.

YOUR WATCHLIST, ALWAYS CURRENT
Keep track of every show and movie you're watching, want to watch, or have finished. Episode progress, smart queues, and a watchlist that actually keeps up with you.

CALENDAR THAT CONNECTS EVERYTHING
See tasks, school deadlines, and events in a unified weekly view. Time-block your day to plan deep work. Routines and school schedules stay balanced.

DAILY REMINDERS THAT RESPECT YOU
Get notified before deadlines — 1 day out, 1 hour out. A gentle morning summary to start your day. All fully customizable. Notifications arrive on time, every time.

WORKS EVERYWHERE
Web app accessible from any browser. Windows desktop app with global hotkeys and offline sync. Mobile app for capturing and reviewing on the go.

PRIVATE AND SECURE
Your data is encrypted in transit and at rest. Sign in securely with Apple or Google. We never sell your data or show you ads.

BluTask is built for students juggling coursework and everyone who wants one quiet, organized place for everything they're working on.
```

### Keywords (100 chars, comma-separated)
```
tasks,planner,homework,assignments,school,productivity,to-do,calendar,organizer,student,tracker
```

### Support URL
```
mailto:samerbaderwork@gmail.com
```

### Privacy Policy URL
```
https://app.blutask.com/privacy
```

---

## Google Play

**App Title** (50 chars)
```
BluTask - Task & School Planner
```

**Short Description** (80 chars)
```
Organize tasks, school assignments, and your calendar in one focused space.
```

**Category:** Productivity
**Content Rating:** Everyone
**Price:** Free

### Full Description (4000 chars max)

```
BluTask is the calm, organized home for your tasks, school assignments, watchlist, and calendar — all in one place with a clean, focused design.

ORGANIZE BY SPACE
Each area of your life gets its own color-coded space:
• Tasks — folders, lists, and tags for work and personal projects
• School — classes, assignments, and deadlines
• Watch — your shows and movies with episode tracking
• Calendar — everything in one weekly view

SMART TASK CAPTURE
Add tasks naturally without thinking about formatting. Type "Reply to Marcus #admin tomorrow" and BluTask routes it to the right list with the right date. Nothing falls through the cracks.

SCHOOL MODE
Track every class, assignment, and deadline. Color-coded class cards show exactly how much work is pending. Paste your syllabus and AI structures it into individual assignments with due dates.

WATCH TRACKING
Keep your entire watchlist organized. Track what you're watching, what's next, and what you've finished. Episode progress always in sync.

UNIFIED CALENDAR
See tasks, school deadlines, and events side by side. Time-block your day to protect focus time. School routines and personal schedules in one balanced view.

DEADLINE REMINDERS
Get notified 1 day and 1 hour before every deadline. Optional morning summary to start your day focused. All reminders work locally — no server required.

PRIVACY FIRST
Sign in with Google or Apple. Your data is encrypted in transit and at rest using AES-256. We never sell your data or show ads.

BluTask is designed for students who need to track coursework alongside everything else, and for anyone who wants a cleaner, calmer system for getting things done.
```

### Store Tags
```
productivity, task manager, school planner, homework tracker, to-do list, calendar, student app, assignment tracker, organizer, watchlist
```

---

## Submission Checklist

### Android (Google Play Console)
- [ ] Signed release APK or AAB built with `.\gradlew bundleRelease`
- [ ] App signing keystore created and backed up
- [ ] Store listing complete (title, description, screenshots)
- [ ] Feature graphic uploaded (1024x500px) — from BluTask Marketing.html
- [ ] At least 2 phone screenshots uploaded (from BluTask Marketing.html)
- [ ] Content rating questionnaire completed
- [ ] Privacy policy URL entered: `https://app.blutask.com/privacy`
- [ ] Target audience: 13+ (students and professionals)
- [ ] Data safety form completed (collects email, tasks, push tokens)

### iOS (App Store Connect)
- [ ] Archive built in Xcode (`Product → Archive`)
- [ ] App icon 1024x1024 uploaded (from BluTask Icon.html)
- [ ] At least 3 iPhone 6.7" screenshots (from BluTask Marketing.html)
- [ ] Privacy policy URL entered
- [ ] Age rating: 4+
- [ ] Sign In with Apple entitlement configured
- [ ] Push notifications entitlement configured
- [ ] Export Compliance: No encryption (uses standard HTTPS)

### Release Build Commands

**Android release AAB:**
```powershell
cd android
.\gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

**Web production build (console logs stripped):**
```powershell
npm run build
# Vite builds with esbuild drop:['console','debugger'] in production mode
```
