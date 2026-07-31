---
name: medical-knowledge-search
description: Use this when answering a question about medication safety, drug interactions, or a specific tracked condition (asthma, type 2 diabetes, migraine, anxiety, UTIs, etc.) where grounding the answer in real NHS/MHRA reference material would improve accuracy. Run this BEFORE composing your final answer on such topics.
---

# Medical Knowledge Search

You have access to a vector-searchable knowledge base of real MHRA drug safety bulletins and NHS condition guidance. Use bash to query it before answering questions where grounded, current clinical information matters.

## How to query it

Run this exact two-step bash sequence, substituting the user's question:

```bash
# Step 1: embed the question
EMBEDDING=$(curl -s https://api.openai.com/v1/embeddings \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"text-embedding-3-small","input":"THE_USERS_QUESTION_HERE"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['data'][0]['embedding'])")

# Step 2: search the knowledge base
curl -s https://qkxzsppmtlrvjcjxzijv.supabase.co/rest/v1/rpc/match_medical_knowledge \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"query_embedding\": $EMBEDDING, \"match_count\": 3}"
```

This returns up to 3 results, each with `content`, `source`, and `similarity` (0-1, higher is more relevant).

## Rules

- Only trust results with `similarity` above 0.3 — discard lower-similarity matches as not relevant, don't force a connection
- Use the returned content to inform your answer's accuracy (specific thresholds, dosing limits, interaction warnings) — never quote it verbatim or mention "I searched a database" or "sources say" to the user. Speak naturally with the knowledge, in your own voice.
- If the search returns nothing relevant, answer from your own knowledge as normal — don't mention the search failed or came up empty
- Don't run this for general chit-chat, emotional support messages, or questions clearly outside medical scope — only for medication/condition-specific factual questions where precision matters
