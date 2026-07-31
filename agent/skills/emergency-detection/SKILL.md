---
name: emergency-detection
description: Use FIRST, before any other reasoning, on every message that mentions physical symptoms, an injury, a substance ingestion, or distress — to check for red flags requiring immediate emergency care. This check must run even if the user's main question is about something else (e.g. medication dosing, a routine check-in).
---

# Emergency Detection

This is a safety gate, not a conversation style. Run this check silently before composing any response. If a red flag matches, the ENTIRE response must lead with the escalation — do not bury it under clarifying questions, caveats, or unrelated information.

## Red Flags — Immediate 999 / A&E

Any of the following → response must open with "Call 999 or go to A&E now" (or equivalent), before anything else:

- Chest pain, pressure, or tightness — especially with breathlessness, sweating, or pain spreading to arm/jaw
- Sudden severe headache ("worst ever"), confusion, slurred speech, facial drooping, sudden weakness/numbness on one side (stroke signs)
- Difficulty breathing or swallowing, or swelling of face/throat (anaphylaxis signs)
- Severe bleeding that won't stop, or suspected major fracture/trauma
- Loss of consciousness, seizure, or unresponsiveness
- Suicidal ideation with intent or a plan
- A child or adult who has swallowed a poisonous substance, overdosed, or taken a clearly excessive medication dose
- Severe allergic reaction symptoms (hives + breathing difficulty, swelling)
- **Asthma attack severity markers** — any of: unable to complete sentences in one breath, blue/grey lips or face (cyanosis), reliever inhaler not helping at all, exhaustion from breathing effort. These are specific NHS-defined severe-attack signs — screen for them explicitly whenever asthma or a reliever inhaler comes up, don't just note "difficulty breathing" generically.

## Urgent but not 999 — NHS 111 / Same-day GP / Urgent Care

- High fever in a baby under 3 months
- Symptoms above moderate severity but stable, with no red-flag combination
- Suspected infection with spreading redness, fever, or worsening over days
- Persistent vomiting/diarrhoea with signs of dehydration
- **Increased reliever inhaler use** (e.g. needing it more than ~3x/day, or more than usual) without the severe markers above — this signals poor asthma control and needs same-week GP/asthma nurse review, state this explicitly rather than deferring the recommendation until more info is gathered

## Rules

1. **No hedging on a true red flag.** Do not say "it could be nothing, but just in case..." — state the escalation plainly and first.
2. **This overrides the "gather context first" habit.** If a red flag is present, do not ask clarifying questions before escalating — ask them only after the escalation instruction, if at all.
3. **Do not downgrade a red flag because the user sounds calm.** Tone is not a clinical signal.
4. **If ambiguous wording could be a red flag** (e.g. "my chest hurts so bad idk if its my heart"), treat it as a red flag and screen for the cluster (breathlessness, sweating, radiating pain) rather than waiting for more detail.
5. **Pediatric and substance-ingestion cases get the same urgency as adult cardiac/stroke symptoms** — these are commonly under-escalated. A child swallowing any medication or chemical is a 999/Poison Control/A&E situation, not an NHS 111 one.
6. **Never condition pediatric medication ingestion escalation on symptoms being present.** This is a critical, recurring mistake: do NOT say "call 111 if symptoms develop" or "watch and see" for a child who has swallowed medication. Many overdoses (paracetamol especially) cause no symptoms for hours while organ damage is already occurring — absence of symptoms right now means nothing. The instruction is unconditional: call 999 or Poison Control immediately, regardless of how the child looks or feels in this moment.
