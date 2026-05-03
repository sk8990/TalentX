# Graph Report - .  (2026-05-03)

## Corpus Check
- Large corpus: 305 files · ~154,770 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 1049 nodes · 1472 edges · 49 communities detected
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 139 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_approveRecruiter()|approveRecruiter()]]
- [[_COMMUNITY_createPaymentOrder()|createPaymentOrder()]]
- [[_COMMUNITY_TalentXBrand()|TalentXBrand()]]
- [[_COMMUNITY_applicationController.js|applicationController.js]]
- [[_COMMUNITY_defaultTemplate.js|defaultTemplate.js]]
- [[_COMMUNITY_PackageQuotaExceededModal()|PackageQuotaExceededModal()]]
- [[_COMMUNITY_plans.js|plans.js]]
- [[_COMMUNITY_documentVerificationService.js|documentVerificationService.js]]
- [[_COMMUNITY_interviewerController.js|interviewerController.js]]
- [[_COMMUNITY_contentService.js|contentService.js]]
- [[_COMMUNITY_fixtures.js|fixtures.js]]
- [[_COMMUNITY_getServerOrigin()|getServerOrigin()]]
- [[_COMMUNITY_server.js|server.js]]
- [[_COMMUNITY_emailService.js|emailService.js]]
- [[_COMMUNITY_approveStudent()|approveStudent()]]
- [[_COMMUNITY_AIInterviewRoom.jsx|AIInterviewRoom.jsx]]
- [[_COMMUNITY_geminiService.js|geminiService.js]]
- [[_COMMUNITY_jobMatch.js|jobMatch.js]]
- [[_COMMUNITY_superAdminController.js|superAdminController.js]]
- [[_COMMUNITY_Interviews.jsx|Interviews.jsx]]
- [[_COMMUNITY_studentAccessHelper.js|studentAccessHelper.js]]
- [[_COMMUNITY_requireJobLimit.js|requireJobLimit.js]]
- [[_COMMUNITY_ProtectedUploadLink()|ProtectedUploadLink()]]
- [[_COMMUNITY_exportController.js|exportController.js]]
- [[_COMMUNITY_fileDownloadController.js|fileDownloadController.js]]
- [[_COMMUNITY_Assessments.jsx|Assessments.jsx]]
- [[_COMMUNITY_StudentSettings.jsx|StudentSettings.jsx]]
- [[_COMMUNITY_companyController.js|companyController.js]]
- [[_COMMUNITY_migratePhase7.js|migratePhase7.js]]
- [[_COMMUNITY_testDb.js|testDb.js]]
- [[_COMMUNITY_smoke-http.js|smoke-http.js]]
- [[_COMMUNITY_jobVisibilityHelper.js|jobVisibilityHelper.js]]
- [[_COMMUNITY_secureFilePath.js|secureFilePath.js]]
- [[_COMMUNITY_resumeParserService.js|resumeParserService.js]]
- [[_COMMUNITY_animations.js|animations.js]]
- [[_COMMUNITY_TrustSection.jsx|TrustSection.jsx]]
- [[_COMMUNITY_RecruiterInterviewers.jsx|RecruiterInterviewers.jsx]]
- [[_COMMUNITY_MyProfile.jsx|MyProfile.jsx]]
- [[_COMMUNITY_buildApp()|buildApp()]]
- [[_COMMUNITY_recruiterApprovalController.js|recruiterApprovalController.js]]
- [[_COMMUNITY_migratePhase8.js|migratePhase8.js]]
- [[_COMMUNITY_DarkModeToggle()|DarkModeToggle()]]
- [[_COMMUNITY_DashboardCards.jsx|DashboardCards.jsx]]
- [[_COMMUNITY_LearnMoreSectionView.jsx|LearnMoreSectionView.jsx]]
- [[_COMMUNITY_studentController.js|studentController.js]]
- [[_COMMUNITY_onboardingAuth.js|onboardingAuth.js]]
- [[_COMMUNITY_createSuperAdmin.js|createSuperAdmin.js]]
- [[_COMMUNITY_emailService.test.js|emailService.test.js]]
- [[_COMMUNITY_DocumentUploadCard.jsx|DocumentUploadCard.jsx]]

## God Nodes (most connected - your core abstractions)
1. `useConfirmDialog()` - 17 edges
2. `useSubscription()` - 17 edges
3. `readStoredSession()` - 14 edges
4. `getLearnMoreSectionContent()` - 12 edges
5. `validateInterviewRoomAccess()` - 10 edges
6. `notify()` - 10 edges
7. `statusToneClass()` - 10 edges
8. `logout()` - 10 edges
9. `normalizeCompanyName()` - 9 edges
10. `buildStudentPortalPayload()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `getRecruiterReviewQueue()` --calls--> `toObjectIdString()`  [INFERRED]
  backend\services\onboarding\reviewService.js → backend\services\onboarding\helpers.js
- `StudentVerificationPage()` --calls--> `useConfirmDialog()`  [INFERRED]
  frontend\src\pages\college-admin\StudentVerificationPage.jsx → frontend\src\components\useConfirmDialog.js
- `buildStudentInterviewAccess()` --calls--> `buildInterviewAccess()`  [INFERRED]
  backend\controllers\applicationController.js → backend\utils\interviewAccess.js
- `applyInterviewSessionAccess()` --calls--> `hasInterviewSessionEnded()`  [INFERRED]
  backend\controllers\applicationController.js → backend\utils\interviewLifecycle.js
- `updateStatus()` --calls--> `notifyApplicationStatus()`  [INFERRED]
  backend\controllers\applicationController.js → backend\services\notificationService.js

## Communities

### Community 0 - "approveRecruiter()"
Cohesion: 0.05
Nodes (43): approveRecruiter(), createCollege(), createCollegeAdmin(), createPackage(), deleteCollege(), disableRecruiter(), disableUniversity(), enableRecruiter() (+35 more)

### Community 1 - "createPaymentOrder()"
Cohesion: 0.04
Nodes (27): createPaymentOrder(), verifyPayment(), cancelSubscription(), getMySubscription(), Login(), FeatureGate(), formatPlan(), UpgradeCard() (+19 more)

### Community 2 - "TalentXBrand()"
Cohesion: 0.05
Nodes (35): TalentXMark(), AcceptOfferWizard(), buildDocumentMap(), FinalAcceptStep(), findStep(), formatDate(), getOfferApplicationId(), getVerificationLabel() (+27 more)

### Community 3 - "applicationController.js"
Cohesion: 0.06
Nodes (40): buildAIInterviewStudentPayload(), buildInterviewPayload(), getAIInterviewQuestion(), getStudentNotificationContext(), normalizeAIInterviewConfigInput(), resetAIInterviewArtifacts(), updateStatus(), writeApplicationAudit() (+32 more)

### Community 4 - "defaultTemplate.js"
Cohesion: 0.08
Nodes (49): buildDayOneStep(), buildDefaultTemplateDefinition(), buildDocumentStep(), buildOfferStep(), buildPreJoiningStep(), buildStepStatusBanner(), createSubmissionWithRetry(), getFirstCurrentStep() (+41 more)

### Community 5 - "PackageQuotaExceededModal()"
Cohesion: 0.06
Nodes (14): PackageQuotaExceededModal(), getAllowedRoles(), ProtectedRoute(), PublicRoute(), VerifyAndRedirect(), AdminDashboard(), getCurrentUserRole(), OnboardingPortal() (+6 more)

### Community 6 - "plans.js"
Cohesion: 0.12
Nodes (33): clonePlanConfig(), getPlansForFeature(), normalizePlanKey(), buildForbiddenPayload(), checkPackageLimit(), findActiveSubscription(), getPackageEntitlementsForUser(), getResetBoundary() (+25 more)

### Community 7 - "documentVerificationService.js"
Cohesion: 0.14
Nodes (28): findStudentForUser(), findTemplateStep(), validateRequiredFields(), findOnboardingInstanceForStudentUser(), acceptOnboardingOffer(), findInstanceByStepIdForStudent(), getDocumentStep(), getExpectedStudentName() (+20 more)

### Community 8 - "interviewerController.js"
Cohesion: 0.1
Nodes (16): applyInterviewSessionAccess(), buildStudentInterviewAccess(), applyInterviewSessionAccess(), categorizeInterview(), loadStatsByInterviewerUserIds(), buildWindowErrorMessage(), getAssignedInterviewerUserId(), getInterviewJoinRequest() (+8 more)

### Community 9 - "contentService.js"
Cohesion: 0.2
Nodes (21): buildCompanyTokens(), buildFallbackLocations(), buildFallbackTaskContent(), buildFallbackVideoAsset(), buildLocationSearchQueries(), buildTaskSpecificSections(), buildVideoSearchPlanFallback(), buildVideoSearchQueries() (+13 more)

### Community 10 - "fixtures.js"
Cohesion: 0.19
Nodes (18): authHeader(), createApplication(), createCollegeAdmin(), createCollegeStudent(), createInterviewer(), createJob(), createPayment(), createRecruiter() (+10 more)

### Community 11 - "getServerOrigin()"
Cohesion: 0.11
Nodes (8): getServerOrigin(), formatDateTime(), nowInput(), resolveSocketOrigin(), VirtualInterviewRoom(), FeedbackPreview(), getDefaultInterviewerFeedbackForm(), InterviewerFeedbackForm()

### Community 12 - "server.js"
Cohesion: 0.15
Nodes (16): startServer(), notify(), notifyApplicationStatus(), notifyInterviewScheduled(), notifyInterviewSlotBooked(), notifyInterviewSlotsOpened(), notifyOfferReceived(), notifyRecruiterApproved() (+8 more)

### Community 13 - "emailService.js"
Cohesion: 0.18
Nodes (15): approveDocumentStep(), assertRecruiterOwnsInstance(), findLatestDocumentSubmission(), getRecruiterReviewQueue(), rejectDocumentStep(), buildTransporter(), escapeHtml(), getTransporter() (+7 more)

### Community 14 - "approveStudent()"
Cohesion: 0.13
Nodes (9): approveStudent(), getApprovedStudents(), getCollegeJobs(), getCollegeProfile(), getPendingStudents(), getPlacementReports(), getRejectedStudents(), rejectStudent() (+1 more)

### Community 15 - "AIInterviewRoom.jsx"
Cohesion: 0.14
Nodes (7): AIInterviewRoom(), formatDateTime(), formatDurationClock(), getAiPresenceLabel(), getDefaultChecks(), getQuestionChipLabel(), getSpeechRecognitionCtor()

### Community 16 - "geminiService.js"
Cohesion: 0.28
Nodes (15): generateContentWithGemini(), generateJobDescription(), generateTextWithGemini(), getGeminiClient(), getModelCandidates(), normalizeBranch(), normalizeBranchList(), normalizeDomain() (+7 more)

### Community 17 - "jobMatch.js"
Cohesion: 0.25
Nodes (12): getVisibilityLabel(), JobProfiles(), calculateMatch(), clamp(), getCtcPreferenceScore(), getEligibility(), getJobSkills(), getJobText() (+4 more)

### Community 18 - "superAdminController.js"
Cohesion: 0.22
Nodes (9): buildSearchRegex(), escapeRegex(), getLatestPaymentByUser(), getLatestSubscriptionByOwner(), listAccounts(), normalizePackagePayload(), parseLimit(), parsePage() (+1 more)

### Community 19 - "Interviews.jsx"
Cohesion: 0.26
Nodes (8): buildCalendarUrl(), formatCountdown(), formatDateTime(), formatPanelType(), getScheduleMeta(), InterviewCard(), Interviews(), toGoogleDate()

### Community 20 - "studentAccessHelper.js"
Cohesion: 0.45
Nodes (9): checkStudentLimit(), getCurrentMonthKey(), getOrCreateStudentUsage(), getStudentAccessSummary(), getStudentAccessType(), getUserId(), hasFullStudentAccess(), incrementStudentUsage() (+1 more)

### Community 21 - "requireJobLimit.js"
Cohesion: 0.29
Nodes (8): startScheduledTasks(), getMonthWindow(), isUnlimited(), parseNonUnlimitedLimit(), removeUploadedFile(), requireApplicantMonthlyLimit(), requireJobLimit(), expireJobsByDeadline()

### Community 22 - "ProtectedUploadLink()"
Cohesion: 0.31
Nodes (7): ProtectedUploadLink(), buildServerAssetUrl(), fetchProtectedUploadBlob(), isProtectedUploadPath(), mapUploadPathToApiRelative(), normalizeToUploadRelative(), openProtectedUploadInNewTab()

### Community 23 - "exportController.js"
Cohesion: 0.36
Nodes (6): buildWorkbookXml(), escapeXml(), excelCell(), excelRow(), sanitizeForSpreadsheet(), sendWorkbook()

### Community 24 - "fileDownloadController.js"
Cohesion: 0.39
Nodes (8): canAccessOnboardingDoc(), canAccessRootUpload(), isReferencedAnywhere(), mimeForPath(), oid(), onboardingPublicUrl(), rootPublicUrl(), sendLocalFile()

### Community 25 - "Assessments.jsx"
Cohesion: 0.33
Nodes (6): Assessments(), CountdownBanner(), formatCountdown(), formatDateTime(), getAssessmentDateValue(), getAssessmentUiStatus()

### Community 26 - "StudentSettings.jsx"
Cohesion: 0.25
Nodes (2): getPasswordStrength(), PasswordStrengthBar()

### Community 27 - "companyController.js"
Cohesion: 0.39
Nodes (4): buildLogoDevUrl(), normalizeCompanyLogoUrl(), normalizeDomain(), sanitizeAndValidateJobInput()

### Community 28 - "migratePhase7.js"
Cohesion: 0.75
Nodes (7): log(), logError(), migrate(), migrateJobs(), migrateRecruiters(), migrateStudents(), normalizeCollegeDomains()

### Community 29 - "testDb.js"
Cohesion: 0.48
Nodes (5): assertSafeTestDbName(), assertSafeTestDbUri(), connectTestDb(), disconnectTestDb(), getDbNameFromUri()

### Community 30 - "smoke-http.js"
Cohesion: 0.47
Nodes (3): buildRoleChecks(), main(), resolveRoleToken()

### Community 31 - "jobVisibilityHelper.js"
Cohesion: 0.7
Nodes (4): canStudentViewJob(), getObjectIdString(), getTargetCollegeIds(), isVerifiedCollegeStudent()

### Community 32 - "secureFilePath.js"
Cohesion: 0.8
Nodes (4): assertSafeUploadBasename(), isInsideDirectory(), resolveOnboardingDocumentFile(), resolveRootUploadFile()

### Community 33 - "resumeParserService.js"
Cohesion: 0.7
Nodes (4): normalizeBranch(), normalizeResumeData(), parseJsonFromModelText(), parseResumePdf()

### Community 34 - "animations.js"
Cohesion: 0.5
Nodes (2): formatIndianCount(), CountUpStat()

### Community 35 - "TrustSection.jsx"
Cohesion: 0.6
Nodes (3): buildLogoDevUrl(), CollegeLogoCard(), createInitials()

### Community 36 - "RecruiterInterviewers.jsx"
Cohesion: 0.5
Nodes (2): getInitialForm(), RecruiterInterviewers()

### Community 38 - "MyProfile.jsx"
Cohesion: 0.5
Nodes (2): buildFormFromProfile(), MyProfile()

### Community 39 - "buildApp()"
Cohesion: 0.67
Nodes (2): isAllowedOrigin(), normalizeOrigin()

### Community 42 - "recruiterApprovalController.js"
Cohesion: 0.67
Nodes (2): buildRecruiterQuery(), listRecruitersByStatus()

### Community 44 - "migratePhase8.js"
Cohesion: 0.83
Nodes (3): log(), logError(), run()

### Community 45 - "DarkModeToggle()"
Cohesion: 0.67
Nodes (2): DarkModeToggle(), useTheme()

### Community 46 - "DashboardCards.jsx"
Cohesion: 0.67
Nodes (2): buildDashboardCards(), DashboardCards()

### Community 47 - "LearnMoreSectionView.jsx"
Cohesion: 0.67
Nodes (2): formatGeneratedAt(), LearnMoreSectionView()

### Community 54 - "studentController.js"
Cohesion: 1.0
Nodes (2): normalizeList(), normalizePreferences()

### Community 55 - "onboardingAuth.js"
Cohesion: 1.0
Nodes (2): extractRequestToken(), readBearerToken()

### Community 57 - "createSuperAdmin.js"
Cohesion: 1.0
Nodes (2): getEnv(), run()

### Community 58 - "emailService.test.js"
Cohesion: 1.0
Nodes (2): clearEmailEnv(), loadEmailService()

### Community 60 - "DocumentUploadCard.jsx"
Cohesion: 1.0
Nodes (2): DocumentUploadCard(), getDocumentStatus()

## Knowledge Gaps
- **Thin community `StudentSettings.jsx`** (9 nodes): `StudentSettings.jsx`, `ChangeEmailSection()`, `ChangePasswordSection()`, `getPasswordStrength()`, `PasswordField()`, `PasswordStrengthBar()`, `SettingsSection()`, `StudentSettings()`, `ThemeSection()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `animations.js`** (5 nodes): `animations.js`, `StatsBar.jsx`, `formatIndianCount()`, `CountUpStat()`, `StatsBar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `RecruiterInterviewers.jsx`** (5 nodes): `RecruiterInterviewers.jsx`, `getInitialForm()`, `Input()`, `RecruiterInterviewers()`, `Stat()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `MyProfile.jsx`** (5 nodes): `MyProfile.jsx`, `buildFormFromProfile()`, `Field()`, `MyProfile()`, `Value()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `buildApp()`** (4 nodes): `buildApp()`, `isAllowedOrigin()`, `app.js`, `normalizeOrigin()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `recruiterApprovalController.js`** (4 nodes): `recruiterApprovalController.js`, `buildRecruiterQuery()`, `emailWarningFor()`, `listRecruitersByStatus()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `DarkModeToggle()`** (4 nodes): `DarkModeToggle()`, `DarkModeToggle.jsx`, `useTheme.js`, `useTheme()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `DashboardCards.jsx`** (4 nodes): `DashboardCards.jsx`, `buildDashboardCards()`, `CardHeroIcon()`, `DashboardCards()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `LearnMoreSectionView.jsx`** (4 nodes): `LearnMoreSectionView.jsx`, `formatGeneratedAt()`, `LearnMoreSectionView()`, `timelineBadgeClass()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `studentController.js`** (3 nodes): `studentController.js`, `normalizeList()`, `normalizePreferences()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `onboardingAuth.js`** (3 nodes): `onboardingAuth.js`, `extractRequestToken()`, `readBearerToken()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `createSuperAdmin.js`** (3 nodes): `createSuperAdmin.js`, `getEnv()`, `run()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `emailService.test.js`** (3 nodes): `emailService.test.js`, `clearEmailEnv()`, `loadEmailService()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `DocumentUploadCard.jsx`** (3 nodes): `DocumentUploadCard.jsx`, `DocumentUploadCard()`, `getDocumentStatus()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toObjectIdString()` connect `defaultTemplate.js` to `emailService.js`, `documentVerificationService.js`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `sendEmail()` connect `emailService.js` to `server.js`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `notify()` connect `server.js` to `emailService.js`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `useConfirmDialog()` (e.g. with `AdminDashboard()` and `SubscriptionPage()`) actually correct?**
  _`useConfirmDialog()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `useSubscription()` (e.g. with `Login()` and `FeatureGate()`) actually correct?**
  _`useSubscription()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `readStoredSession()` (e.g. with `PackageQuotaExceededModal()` and `ProtectedRoute()`) actually correct?**
  _`readStoredSession()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `validateInterviewRoomAccess()` (e.g. with `isOnlineInterview()` and `buildInterviewAccess()`) actually correct?**
  _`validateInterviewRoomAccess()` has 3 INFERRED edges - model-reasoned connections that need verification._