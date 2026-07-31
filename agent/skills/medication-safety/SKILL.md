---
name: medication-safety
description: Use when a user asks about a medication's safety, side effects, dosage, or whether it's okay to combine with another drug, alcohol, food, or condition. This is a high-stakes category — be precise rather than reassuring.
---

# Medication Safety

## The core failure mode to avoid

Past evaluation of this assistant found a recurring pattern: giving a confident "this should be fine" or minimizing real risks (e.g. calling a genuine interaction "rare" without sufficient caveat) instead of clearly flagging uncertainty and directing to a pharmacist or prescriber. Default to **caution and verification**, not reassurance, whenever a real interaction risk exists — even a small one.

## Process

1. **Identify the substances involved** — if the user hasn't named the specific medication (e.g. "I'm on metformin, is X okay?" vs. "is this med okay?" with no name given), ask for the specific name/dose before answering. Don't guess what they're taking.
2. **State any known interaction plainly** — mechanism in plain language (e.g. "metformin + heavy alcohol use raises lactic acidosis risk because both affect how your liver processes lactate") — don't hedge the mechanism away as purely theoretical if it's a real, documented interaction.
3. **Give a clear, actionable bottom line** — not just "ask your pharmacist" with zero substance, but also not a flat "you're fine" when there's genuine risk. Something like: "Occasional moderate drinking is generally lower risk, but check with your prescriber given your specific kidney/liver function" is more accurate than either extreme.
4. **Always recommend pharmacist/prescriber verification when**:
   - The interaction has any documented risk, even if low-probability
   - Dosage is being asked about directly (never give a specific dose recommendation — that's a prescribing decision, not an assistant's call)
   - The user has any condition (kidney, liver, cardiac) that could change the risk calculus and you don't have that information

## Possible overdose / double-dose / accidental extra dose

If the user describes taking a medication twice, more than prescribed, or any accidental overdose scenario — **always include immediate safety-net advice in the same response**, even while asking clarifying questions about which medication/dose. Don't ask-and-wait with nothing else. Say something like: "While you get that info together, it's worth calling NHS 111 or your pharmacist now in case timing matters" — clarifying questions and the safety net both belong in one response, not sequenced across turns.

## Known interactions to actively check for, not just generally caution about

- **SSRIs/antidepressants + antihistamines**: the main, well-established concern is **additive sedation/CNS depression** when an SSRI is combined with a first-generation (sedating) antihistamine like diphenhydramine or chlorpheniramine (Piriton) — not serotonin syndrome. (Note: cyproheptadine is actually a serotonin *antagonist* and is sometimes used to *treat* serotonin syndrome — it is not a cause of it. Don't state otherwise.) Second-generation antihistamines (cetirizine, loratadine, fexofenadine) are non-sedating and carry meaningfully lower interaction concern with SSRIs generally. Don't say "no significant interaction" for the first-generation case without the sedation caveat — but also don't fabricate a serotonin-syndrome mechanism that isn't accurate for this drug class. **Every antihistamine + SSRI question still gets a "worth a quick pharmacist check" recommendation** regardless of generation, per the core rule — the degree of concern differs, but verification is always the right default when you're not certain of the patient's full picture.
- **Warfarin + NSAIDs (ibuprofen, etc.)**: bleeding risk, recommend paracetamol as the safer alternative
- **Metformin + alcohol**: lactic acidosis risk, more relevant with heavy/chronic use or kidney/liver impairment

## Hard Rules

- **Never state a specific dosage** the user should take — that is always a "ask your pharmacist or GP" answer, full stop
- **Don't minimize a real interaction risk with words like "very rare" or "shouldn't be an issue"** unless that's genuinely the well-established consensus — when uncertain, say "this can vary by individual, worth checking with your pharmacist" rather than guessing reassurance
- **If asked about over-the-counter combinations** (e.g. paracetamol + ibuprofen, antihistamines + other sedatives), give the real, specific interaction information — these are common, low-risk-to-answer-directly questions and over-hedging here isn't helpful
- **For prescription drug interactions**, lean more cautious — give the real mechanism, but consistently land on "verify with your pharmacist before combining" rather than a confident yes/no
