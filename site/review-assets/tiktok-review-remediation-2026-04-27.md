# TikTok Review Remediation - 2026-04-27

TikTok rejected the app for scope mismatch, insufficient Terms of Service, insufficient Privacy Policy, an incomplete demo video, and Share Kit being selected for a web app.

## Portal Cleanup

Use the product and scope set currently selected in the TikTok form, and make sure every scope is visible in the demo.

- Remove Share Kit. The current adoptan.ai flow is a web workspace, not a mobile app flow.
- Remove Data Portability API. It is not selected and must not be mentioned in the form note.
- Keep Login Kit because the demo shows OAuth plus connected creator identity, profile, and stats.
- Keep Content Posting API because the demo shows video review, TikTok creator_info settings, explicit consent, draft upload, direct post, status, and disconnect.
- Keep `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.list`, `video.upload`, and `video.publish`.
- Remove Display API, Data Portability API, Share Kit, or any extra scope unless the UI video demonstrates it clearly.

Recommended review set for the current public web demo:

- Product: Login Kit
- Scope: `user.info.basic`
- Scope: `user.info.profile`
- Scope: `user.info.stats`
- Scope: `video.list`
- Product: Content Posting API
- Scope: `video.upload`
- Scope: `video.publish`

## Legal Pages

Updated pages:

- `https://adoptan.ai/privacy`
- `https://adoptan.ai/terms`

The new Privacy Policy explicitly covers:

- TikTok OAuth tokens, open_id, union_id, basic profile data, profile details, stats, public video list data, avatar, creator_info, privacy options, interaction availability, draft upload state, publish_id, publish status, and disconnect.
- TikTok data usage limited to user-authorized connect, review, draft upload, direct publish, status, and disconnect workflows.
- No sale or advertising sharing of TikTok user data.
- Retention, deletion, token revocation, backups, subprocessors, international transfers, security, breach notification, GDPR, CCPA, and children's privacy.
- OAuth tokens encrypted at rest using AES-256 or equivalent managed encryption controls.
- TikTok disconnection cleanup within 30 days.
- Direct contact emails: `privacy@adoptan.ai` and `legal@adoptan.ai`.

The new Terms explicitly cover:

- SaaS acceptance and eligibility.
- TikTok Terms of Service and TikTok Developer Terms.
- User content ownership and publishing responsibility.
- User-approved draft upload and direct publishing only.
- AI-assisted captions/transcripts requiring user review.
- Acceptable use, fees, termination, disclaimers, liability, indemnification, Belgian law, and Brussels courts.
- TikTok Community Guidelines.
- Current free-of-charge beta status before any future paid plans.

## Exact Form Text

Use this in the TikTok field "Explain how each product and scope works within your app or website":

adoptan.ai is a web workspace for reviewing short-form content and running user-approved TikTok upload/publishing workflows. Login Kit lets a creator connect TikTok in the workspace. `user.info.basic` shows the connected identity and avatar. `user.info.profile` shows profile fields such as bio/profile link/verified status. `user.info.stats` shows account stats. `video.list` shows recent public videos so the creator can avoid duplicate uploads. For a selected clip, the creator previews the video, edits the caption, reviews TikTok creator_info privacy/interactions, and explicitly chooses either draft upload or direct post. Content Posting API uses `video.upload` for TikTok draft upload and `video.publish` for direct posting only after user confirmation.

This text is under 1000 characters.

## Demo Video Requirements

Record a new browser-only video. Do not show terminal, code, Postman, logs, or local files.

Target duration: 90 to 120 seconds.

Required storyboard:

1. Open `https://adoptan.ai/app`.
2. Show the demo sign-in page and click `Sign in to review workspace`.
3. Show the requested scopes: `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.list`, `video.upload`, `video.publish`.
4. Click `Connect TikTok`.
5. Show TikTok sandbox consent with `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.list`, `video.upload`, and `video.publish`.
6. Return to `https://adoptan.ai/web/callback/`.
7. Click `Continue to workspace`.
8. Show connected sandbox account: username/nickname/avatar. This demonstrates `user.info.basic`.
9. Show bio/profile/verified fields. This demonstrates `user.info.profile`.
10. Show follower/likes/video count fields. This demonstrates `user.info.stats`.
11. Show recent public videos and duplicate check. This demonstrates `video.list`.
12. Show creator_info response card: privacy options, max duration, comments, duet, stitch. This demonstrates Content Posting API UX.
13. Show 9:16 video preview.
14. Edit the caption field.
15. Select privacy manually and turn on comment/duet/stitch manually.
16. Check the explicit consent note before upload/publish.
17. Click `Upload as TikTok draft`. This demonstrates `video.upload`.
18. Show `draft_upload.completed`.
19. Click `Confirm and publish to TikTok`. This demonstrates `video.publish`.
20. Show activity log: `oauth.connected`, `profile.loaded`, `video_list.loaded`, `creator_info.loaded`, `draft_upload.completed`, `publish.started`, `publish.completed`.
21. Click or show `Disconnect TikTok`.

Add short English overlay labels in the video:

- "Login Kit: user.info.basic"
- "Login Kit: user.info.profile"
- "Login Kit: user.info.stats"
- "Video list: video.list"
- "Content Posting API: video.upload"
- "Content Posting API: video.publish"
- "creator_info settings loaded from TikTok"
- "User reviews caption and privacy before upload"
- "Explicit consent before upload/publish"
- "Status visible in workspace"
- "Disconnect account"

## Submission Note

Use this text in the reviewer note:

Dear reviewer,

Following your feedback, we made the following changes:

1. Products and scopes: removed Share Kit and Data Portability API. The current selected products are Login Kit and Content Posting API only. Current scopes are `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.list`, `video.upload`, and `video.publish`. All are demonstrated in the new demo video.

2. Privacy Policy: replaced the previous short policy with a detailed policy at `https://adoptan.ai/privacy`. It now includes explicit TikTok data collection, OAuth token handling, profile details, stats, public video list data, creator_info data, draft upload data, publishing status data, retention, deletion, disconnect, GDPR/CCPA rights, subprocessors, security, and breach notification.

3. Terms of Service: replaced the previous short terms with detailed Terms at `https://adoptan.ai/terms`. They now include TikTok Terms and TikTok Developer Terms references, user content ownership, publishing responsibility, user-approved draft upload/direct publishing, AI-assisted output review, acceptable use, disclaimers, limitation of liability, indemnification, and Belgian governing law.

4. Demo video: uploaded a new browser-only end-to-end sandbox demo recorded from `https://adoptan.ai/app`. It shows the actual web interface, demo sign-in, TikTok sandbox OAuth consent, connected creator account, profile fields, stats, recent public videos, creator_info-driven privacy and interaction settings, editable caption, explicit consent before draft upload/direct publish, status feedback, and disconnect. The video contains no terminal or code.

Available for any clarification.

## Do Not Submit

- Do not submit the old terminal/code video.
- Do not leave Share Kit selected.
- Do not mention Data Portability API unless it is selected and demonstrated.
- Do not request scopes that are not shown in the video.
- Do not keep `video.upload` unless the demo shows draft upload.
- Do not keep `video.publish` unless the demo shows direct post.
