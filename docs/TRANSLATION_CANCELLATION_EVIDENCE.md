# Translation cancellation and background privacy: evidence register

Branch: `fix/cancel-stale-translation-requests` (pull request to be linked after opening).

## Failure in the original application

The previous controller discarded translations after a new conversation began, but did not abort their outgoing MyMemory network requests. A user leaving the app while translation was pending could also allow a late translation to complete and initiate automatic speech. The former matters for wasted mobile network activity; the latter for background privacy and confusing playback.

## Scoped change

- Assign an abort controller to each active translation; cancel it on a newer conversation or explicit cancellation.
- On background, page hide, or microphone-safety background stop, abort unfinished translation requests and stop output speech without deleting a *completed* translation.
- Distinguish user-initiated cancellation from ordinary request timeouts: a timeout can still retry once, but a cancelled conversation must never retry.
- Keep existing bilingual status, local Pashto eSpeak, recognition routing, and translation provider unchanged.

## Regression assertions

- Two overlapping conversations: first network request receives abort, first conversation does not retry, second result alone is shown and spoken.
- Background during pending translation: abort occurs, no second request, no speech, Replay disabled, and a bilingual status reports interruption.
- Existing network-error retry and stale-translation browser tests remain in the full suite.
- Automated Chromium/WebKit tests cannot prove that an external service did not *already receive* a cancelled request or that every physical iPhone releases connections identically.

## Verification

Await exact workflow results on the pull-request head. Do not claim any browser checks passed until the GitHub Actions run completes. No production deployment is intended in this pull request.
