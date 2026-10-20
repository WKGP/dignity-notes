/* Dignity Notes training course: the ten modules (Sam's outline, 2026-10-19). Loaded only when the
 * course is opened. Plain, static text written for the app (no user content), shown as HTML.
 * It explains how to use Dignity Notes and the tools it refers to; it is not a qualification in care.
 * Copyright Workgroup (WA) Pty Ltd. */
window.DN_COURSE = [
  {
    title: "Getting started", minutes: 6,
    sections: [
      ["What Dignity Notes is", `<p>Dignity Notes is a care record you speak into. You record a short voice note as things happen; the app keeps the recording, writes a clear note, and builds the handover, flags, medicines chart and reports from it. You record once; the app organises it.</p>`],
      ["Finding your way around", `<ul><li><strong>Today</strong>: the big <strong>Record a note</strong> button, Needs attention, tasks, medicines, the last handover and what's coming up.</li><li><strong>Log</strong>: every note, outing and handover, with a day-by-day diary view.</li><li><strong>Handover</strong>: the end-of-shift handover, written from your notes.</li><li><strong>Family</strong>: what's shared with the family.</li><li><strong>Find</strong> (magnifying glass): the emergency form, care plan, contacts, medicines, reports and search.</li><li><strong>?</strong>: the user manual, this course, and Report a problem.</li></ul>`],
      ["Who sees what", `<p>Each person has their own sign-in. <strong>Carers</strong> see only the clients they're linked to. <strong>Administrators</strong> add people, link them to clients and manage settings. <strong>Family members</strong> see only what carers share: daily updates, appointments, messages, and incidents if an administrator switched that on, as agreed with the client or their representative.</p><p>Never share your sign-in. If a phone is shared at the client's home, use <strong>Switch carer</strong> so each note carries the right name.</p>`],
      ["Keep it safe on the phone", `<p>Install the app (Add to Home Screen on an iPhone) and don't use a private browsing tab: browsers can delete the notes of websites that aren't installed. Notes are copied to the cloud as soon as there's signal.</p>`],
    ],
    check: { q: "A colleague asks to use your sign-in for one shift. What do you do?", options: ["Let them, just this once", "Say no: everyone has their own sign-in, so each note shows who wrote it", "Give them your password and change it afterwards"], answer: 1, why: "Every note, dose and change is recorded with the name of the person signed in. Sharing a sign-in makes the record wrong." },
  },
  {
    title: "Recording care notes", minutes: 8,
    sections: [
      ["Speak it as it happens", `<p>Tap <strong>Record a note</strong>, say what happened, then tap stop. Say it as you would to the next carer: what you saw, what you did, how the person responded, and anything said. The app writes the note and saves it straight away.</p>`],
      ["Accurate and person-centred", `<ul><li><strong>Facts, not opinions:</strong> "She ate about half her lunch and said she wasn't hungry" rather than "She was being difficult".</li><li><strong>The person's own words</strong> when they matter: "Said her knee hurt when she stood up".</li><li><strong>Times and amounts</strong>: "a full mug of tea at 10", "about a third of the porridge".</li><li><strong>Respectful language</strong>: describe what happened, never labels.</li><li><strong>What you did</strong> and <strong>who you told</strong>.</li></ul>`],
      ["Checking and correcting", `<p>After saving, the <strong>Saved</strong> screen shows the note, any words that may have been misheard, and what was picked out for the reports. Notes are never changed once saved: to fix something, <strong>Add to this note</strong> or <strong>Correct a misheard word</strong>. The correction is added underneath with your name and the time, so the record always shows what was said and what was changed.</p>`],
      ["Helping the app hear you", `<p>Choose your accent in Settings and do the <strong>voice set-up</strong> once: you read a few sentences and the app learns the words it mishears in your voice. Typed notes work too: use <strong>Type instead</strong>.</p>`],
    ],
    check: { q: "Which is the better note?", options: ["\"Nana was awkward at lunch.\"", "\"Nana ate about half her lunch and said she wasn't hungry. Offered a yoghurt, which she ate.\"", "\"Lunch fine.\""], answer: 1, why: "It says what happened, how much, in her words, and what you did. That's useful to the next carer and to anyone reviewing the record." },
  },
  {
    title: "How reports are made", minutes: 5,
    sections: [
      ["Record once", `<p>When a note is saved, the app picks out what it says about drinks, meals, bowels, passing urine, pain, sleep, behaviour, skin, mobility and weight. These become the reports, so nobody fills in a separate fluid chart or bowel chart. Check what was picked out on the Saved screen (<strong>For the reports</strong>) and correct anything wrong.</p>`],
      ["What a report can and can't tell you", `<ul><li>Reports show <strong>only what was written</strong>. A day with nothing written isn't evidence that nothing happened.</li><li>Counts and totals are added up by the app; amounts are estimates (using the client's own cup sizes).</li><li>Reports never diagnose, guess a cause, or give advice.</li></ul>`],
      ["Opening, printing and sharing", `<p>Find, then <strong>Reports</strong>. Choose 7, 14 or 30 days, or your own dates. Every entry links to the note it came from. <strong>Print or save as PDF</strong> to give to a GP, nurse or agency. Read a report before sharing it with the family.</p>`],
    ],
    check: { q: "The Bowels report shows nothing for Tuesday, but there are notes that day. What does that mean?", options: ["The bowels weren't opened on Tuesday", "Nobody wrote about bowels on Tuesday: it isn't evidence either way", "The report is broken"], answer: 1, why: "Only a carer saying so counts as \"not opened\". Nothing written means nothing written." },
  },
  {
    title: "The specialist reports", minutes: 10,
    sections: [
      ["Falls and mobility", `<p>Falls, near falls, unsteadiness, standing up, transfers, help needed and walking aids, in date order. It is <strong>not a falls risk assessment</strong>, which a trained professional does (NICE guideline NG249).</p>`],
      ["Fluid intake", `<p>Each day's drinks written down, in millilitres, with refusals. Totals include only drinks that were written down. If the care plan sets fluid monitoring, follow it.</p>`],
      ["Food and nutrition, and MUST", `<p>Meals eaten, partly eaten or refused, appetite, supplements, and weights. <strong>MUST</strong> (the Malnutrition Universal Screening Tool, from BAPEN) is a screening done by someone trained to use it, as the care provider's policy says (often a nurse, dietitian or trained care worker). The report gathers what they'll need (weights and dates, height, BMI from those measurements, weight change, what's missing) but <strong>never gives a MUST score</strong>.</p>`],
      ["Bowels and continence, and the Bristol Stool Chart", `<p>Bowel movements, accidents and days a carer said they weren't opened. The <strong>Bristol Stool Chart</strong> describes stools from type 1 (separate hard lumps) to type 7 (entirely watery); types 3 and 4 are usually thought of as typical. Say a type number only if you know it: the app never works one out from a description.</p>`],
      ["Urinary, pain, sleep and skin", `<ul><li><strong>Urinary and bladder</strong>: passing urine, pads, incontinence, catheter care, and anything said about colour, smell or discomfort.</li><li><strong>Pain and discomfort</strong>: what was said or seen, where, any score out of 10. For people who can't say, signs such as grimacing are kept in your words; <strong>PAINAD</strong> (Pain Assessment in Advanced Dementia) is completed by trained staff, never by the app.</li><li><strong>Sleep and rest</strong>: each night, waking, restlessness, sleeping in the day.</li><li><strong>Skin integrity</strong>: skin notes, skin forms and their follow-up checks.</li></ul>`],
      ["Behaviour and the ABC chart", `<p>An <strong>ABC chart</strong> records the <strong>A</strong>ntecedent (what was happening just before), the <strong>B</strong>ehaviour (what the person did or said) and the <strong>C</strong>onsequence (what happened after, including what you did and how they responded). Behaviour is often a way of communicating a need. Say in your note what happened before and what helped, and it appears in the chart. The report never says why.</p>`],
    ],
    check: { q: "Who works out a PAINAD score?", options: ["Dignity Notes, from the notes", "A trained member of staff using the PAINAD tool", "The family"], answer: 1, why: "Dignity Notes keeps what carers saw in their words. Formal assessments are done by trained people; you can record their completed result under Professional assessments." },
  },
  {
    title: "Guidance and the law", minutes: 8,
    sections: [
      ["Legal requirements and good practice", `<p>Some things are the law; others are recommended practice. Knowing the difference matters.</p><ul><li><strong>Data protection law</strong> (UK GDPR and the Data Protection Act 2018) applies to care providers and to anyone keeping care records as part of their work; records kept purely for personal or household reasons are treated differently.</li><li><strong>CQC regulations</strong> apply to <strong>registered providers</strong> (care agencies and homes in England). For example, under the Health and Social Care Act 2008 (Regulated Activities) Regulations 2014: Regulation 17 (accurate, complete and contemporaneous records), Regulation 12 (safe care and treatment) and Regulation 20 (duty of candour). Registered providers must also notify the CQC of certain events under the Care Quality Commission (Registration) Regulations 2009 (Regulations 16 and 18). Wales, Scotland and Northern Ireland have their own regulators and rules.</li><li>A carer employed directly by a family isn't regulated by the CQC, but the same standards are still good practice.</li></ul>`, "UK"],
      ["NICE guidance", `<p>NICE guidelines are recommended practice, for example NG67 (managing medicines for adults receiving social care in the community), NG97 (dementia), CG179 (pressure ulcers) and NG249 (falls). They're referred to in the app's reports and forms.</p>`, "UK"],
      ["Legal requirements and good practice", `<p>Some things are the law; others are recommended practice. Knowing the difference matters.</p><ul><li><strong>Privacy law</strong>: the Privacy Act 1988 and the Australian Privacy Principles apply to most organisations keeping health information, and state laws may apply too.</li><li><strong>Registered aged care providers</strong> must meet the aged care laws and the Aged Care Quality Standards, and report serious incidents under the Serious Incident Response Scheme (SIRS) to the Aged Care Quality and Safety Commission.</li><li>A carer employed directly by a family isn't covered by those provider rules, but the same standards are still good practice.</li></ul>`, "AU"],
      ["Guidance", `<p>Recommended practice comes from bodies such as the Australian Commission on Safety and Quality in Health Care and the Aged Care Quality and Safety Commission. The app's reports link to the relevant guidance.</p>`, "AU"],
      ["Incidents and safeguarding", `<p>For an incident (a fall, an injury, a medication error), get help first: {999} in an emergency, {111} or the GP for urgent advice. Then record it and, if asked, complete an <strong>incident report</strong>. An incident report in Dignity Notes is an <strong>internal record</strong>: it isn't a notification to a regulator, the police or anyone else, and the app never sends one. If you think an adult is being abused or neglected, tell your manager or contact {SAFE}.</p>`],
    ],
    check: { q: "An agency client has a serious injury. Does saving the incident report in Dignity Notes notify the regulator?", options: ["Yes, automatically", "No: the registered provider decides and notifies the regulator through the proper channels; the app records that decision", "Only if the family is told"], answer: 1, why: "The app keeps the record and, for agency clients, an administrator's review of whether a notification is needed. It never sends notifications." },
  },
  {
    title: "Professional boundaries", minutes: 5,
    sections: [
      ["What carers do", `<p>Carers <strong>observe, record, recognise changes and tell the right people</strong>. You know the person well and you're there every day, so your observations matter.</p>`],
      ["What professionals do", `<p>Diagnosis and treatment decisions are for qualified professionals: GPs, nurses, dietitians, therapists and pharmacists. Screening and assessment tools (such as MUST, PAINAD, Waterlow or a falls risk assessment) are used only by people trained to use them, as the care provider's policy says. Dignity Notes never diagnoses, never scores these tools, and never tells you what's wrong.</p>`],
      ["Recording a professional's assessment", `<p>When a professional completes an assessment, copy their result into Dignity Notes exactly as they wrote it (Reports, then <strong>Professional assessments</strong>), with what they advised and when it's due again. Upload their form to the care plan too.</p>`],
    ],
    check: { q: "Nana has been eating less for a week. What's your role?", options: ["Work out her MUST score", "Record what she eats, and tell the family, your manager or the GP, as the care plan says", "Change her diet yourself"], answer: 1, why: "You record and report the change; a trained person assesses it." },
  },
  {
    title: "Medicines records", minutes: 8,
    sections: [
      ["The medicines chart (MAR)", `<p>The chart lists each medicine, copied exactly from the pharmacy label or prescription. Record every dose: given, refused, not taken, or not given and why. When-required doses show their limits (how far apart, how many in 24 hours).</p>`],
      ["Within your role", `<p>For agency carers, only people signed off as trained and assessed to support with medicines can add, change, stop or check medicines (private carers employed by the family follow what the family and prescriber agree). Every change is checked against the label by someone else (or double-checked by you if you're alone, then by the next carer). Never change what's given because a note or the app suggests it: follow the prescription and ask the pharmacist or GP.</p>`],
      ["When something doesn't match", `<p>If a box or label doesn't match the chart, don't guess. Keep the box aside and ask the pharmacist or GP. Correct the chart only if it's the chart that's wrong. At the start of each month, check the new medicines against the list (the monthly check).</p>`],
    ],
    check: { q: "A dose was missed this morning. What do you do?", options: ["Give two doses at lunchtime", "Record it as not given, with the reason, and ask the pharmacist, GP or {111} what to do", "Leave it off the chart"], answer: 1, why: "Never double up without advice. The chart must show exactly what happened." },
  },
  {
    title: "Continuity of care", minutes: 6,
    sections: [
      ["Handover", `<p>At the end of a shift, the app writes the handover from your notes and open flags. Read it, change anything that's wrong, and hand over to the next carer. Anything not done (tasks, a dose) is listed.</p>`],
      ["Starting with a client, or coming back", `<p>A carer new to a client, or back after a week or more away, gets a <strong>catch-up</strong> card on Today: care plan changes, medicines added, changed or stopped, open flags, incident reports, skin concerns and notes since they were last here. Read it, check the skin, and tick <strong>I've read this</strong> and <strong>I've checked the skin</strong>.</p>`],
      ["Looking back", `<p>Use the Log's <strong>diary view</strong> to read one day at a time, and the reports to see patterns over weeks. Search finds any note, contact or care plan section.</p>`],
    ],
    check: { q: "You're back after two weeks' leave. What should you do first?", options: ["Start recording straight away", "Read the catch-up card, check the skin, and tick both", "Ask the family what happened"], answer: 1, why: "The catch-up card shows what changed while you were away, so nothing important is missed on your first shift." },
  },
  {
    title: "Confidentiality and sharing", minutes: 6,
    sections: [
      ["Keeping information private", `<p>Care notes are personal and health information. Keep your phone locked, never share your sign-in, and don't show notes to anyone who isn't involved in the person's care. Don't take screenshots of notes or send them by text or messaging apps.</p>`],
      ["What's shared, and with whom", `<ul><li>The client's carers and administrators see the care record.</li><li>The family see only what's shared: daily updates you check before sharing, appointments, messages, and incidents only if an administrator switched that on, as agreed with the client or their representative.</li><li>Reports are printed or saved as PDF to give to health professionals involved in the person's care.</li></ul>`],
      ["Consent and rights", `<p>Dignity Notes asks for the agreement of the client, or the person legally able to agree for them, when a client is added. People have rights to see the information kept about them. The privacy notice (Settings) explains what is kept, where, and for how long.</p>`],
    ],
    check: { q: "A neighbour asks how Nana's been. What do you share?", options: ["Show them today's notes", "Nothing from the care record: suggest they speak to the family", "Read them the handover"], answer: 1, why: "Only people involved in the person's care, or who the client has agreed to, should see their information." },
  },
  {
    title: "Practice: from a note to the reports", minutes: 8,
    practice: true,
    sections: [
      ["How to practise", `<p>These are made-up examples. Read each note and answer where its information goes. Don't practise in a real client's record: if you want to try recording, ask an administrator for a practice client.</p>`],
      ["Example 1", `<blockquote>"Arthur had a full mug of tea at ten and about half his lunch. He said his back was sore when he stood up, about 4 out of 10. Helped him to the chair with the frame."</blockquote><p>This one note adds a drink (a mug, using his mug size) to <strong>Fluid intake</strong>, half a meal to <strong>Food and nutrition</strong>, back pain scored 4 out of 10 to <strong>Pain and discomfort</strong>, and help to stand with the frame to <strong>Falls and mobility</strong>.</p>`],
      ["Example 2", `<blockquote>"When I started washing his hair he shouted and pushed my hand away. I stopped and put his radio on; he settled after five minutes."</blockquote><p>This goes into the <strong>Behaviour (ABC)</strong> chart: A, washing his hair; B, shouting and pushing a hand away; C, washing stopped, radio on, settled. If someone had been hurt, it would also be an incident.</p>`],
      ["Example 3", `<blockquote>"Found a red patch on his heel that didn't fade when I pressed it. Told the district nurse, who's coming tomorrow."</blockquote><p>This raises a skin flag. Open it and <strong>Complete skin integrity form</strong>: where (heel), what you saw (a red patch that doesn't fade when pressed), who you told, and when it should be checked next. The nurse decides the category. On darker skin, redness can be hard to see: look for colour changes, warmth, swelling or hardness too.</p>`],
    ],
    check: { q: "\"She had a glass of water and refused her tablets at 8.\" Where does this information go?", options: ["Only the Fluid intake report", "Fluid intake (a glass of water), and the refusal should also be recorded on the medicines chart", "Nowhere: it's just a note"], answer: 1, why: "The drink is counted in the fluid report. A refused dose must be recorded on the medicines chart too: the chart is the medicines record." },
  },
];
