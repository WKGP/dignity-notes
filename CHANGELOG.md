# Changelog

## 1.1.0 - 2026-10-06

Cloud copy. Notes, flags, handovers, outings and recordings are copied to secure cloud storage (EU) and shared between the client's carers' phones; nothing is lost if a phone's data is cleared. Settings > About shows the cloud copy status. Privacy notice version 4. Also: "Latest note" and "Previous handover" on Today show real entries before the example ones; fix for the iPhone tab bar drifting up the screen after typing; smaller recordings.

## Since 1.0.0 (patch releases)

- 1.1.9: Security and code review fixes: future dates refused, removed usernames never reused, secondary administrators can't act on administrators, same answer for locked or wrong sign-ins, lockout per account and address, daily AI allowance, removed clients' records cleared from phones, appointments shared between carers, app code moved out of the page so injected scripts are refused, fonts hosted with the app (no Google), sign-ins from before the address change end once, privacy notice version 6 (states exactly what is kept and sent).
- 1.1.8: Care plan for each client: sections with urgency (Skin care, Nutrition and hydration…), written by administrators and read by carers, also without signal; key documents (an emergency care plan such as ReSPECT, DNACPR or an Advance Care Directive; risk assessments), with the emergency care plan linked from every incident; notes are tagged with the sections they cover and the handover lists urgent or important sections with no notes. Privacy notice version 5.
- 1.1.7: Adding a person puts them on the client you're in (tick "Cares for …"), and opening Handover picks up newly added carers without signing out (Sam).
- 1.1.6: Incident checklist: for an incident or a change in condition, Check before saving lists what a full record still needs (when, what you saw, what you did, who you told), with Add details. Every incident flag has "Who to tell" (999, GP or 111, council safeguarding, family and agency). Suspected infections such as a UTI are flagged "To note".
- 1.1.5: "What you said" and the care note grow to show all their words, so there's no scrolling inside the box (Sam). "Check these words" only lists words that would change the record, usually none.
- 1.1.4: The screen stays on while recording; if the phone locks or you switch app, the recording so far is kept and the app says when it stopped (Sam). "Check these words" lists just the words, so Show me finds them.
- 1.1.3: Security fixes: flags and outings can only be resolved or marked back, never rewritten; password resets, locks and removals end existing sign-ins; only the main administrator can create or reset administrators, and admin actions are logged; passwords need 12 characters; a carer's unsent notes stay on their phone if they're taken off a client; the page can only talk to the Dignity Notes relay; copied developer briefs are marked as untrusted.
- 1.1.2: Safety fixes before release: app updates, sign-in requests and other carers' new notes wait until nothing is open (no lost recordings); iPhone keeps words when speech recognition restarts and says if live words stopped; recordings retried until uploaded; storing a recording retries once and never drops it silently; example entries never go into handovers or family summaries, and new clients start empty; records carry the author's name; handover covers the time since the last handover and asks who it's for; stronger generated passwords and a per-account sign-in limit.
- 1.1.1: User manual search: matches as you type, and Ask for an AI answer written only from the manual, with links to the right sections (signed-in users).
- 1.0.10: iPhone banner: open links from WhatsApp in Safari first (compass button), because the WhatsApp browser keeps separate notes.
- 1.0.9: "Check these words" shows each word highlighted in what you said, with Show me to jump to it; Earlier notes today on the review screen; Record log "Show all words and recordings".
- 1.0.8: The private-tab warning now gives step-by-step fixes (iPhone: Tabs → leave Private → Add to Home Screen; Android: reopen in a normal tab → Install).
- 1.0.7: Storage warning. Asks the browser to keep notes permanently; red warning on private tabs; iPhone "Add to Home Screen" steps (hide for a week); Android Install button; Settings > About shows whether notes are kept.
- 1.0.6: "What you said" is editable; misheard-word fixes can be remembered (My words, confirmed by the carer, sound-alike fixes only) and applied to the next recordings with Undo; record log shows what the phone heard and the checked words.
- 1.0.4 and 1.0.5: "Check these words" suggests the accent setting, with the accent picker right there. User manual brought up to date (new screenshots; accent, About, To note, Points to note).
- 1.0.1 to 1.0.3: Settings > About shows the app, server and privacy notice versions; automatic version numbering.

## 1.0.0 - 2026-10-06

Versioning starts. Already in this release: voice notes with AI tidy and flags, handover, family page, clients with one-time agreement, carers assigned to clients with shifts, help and user manual, AI feedback reports, accent setting, iPhone recording fix, Sam's note rules (behaviour vs incident; facts not instructions).
