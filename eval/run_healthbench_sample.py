import json, os, sys, time, urllib.request, urllib.error

API_KEY = os.environ["ANTHROPIC_API_KEY"]
BASE = "https://api.anthropic.com/v1"
AGENT_HEADERS = {
    "x-api-key": API_KEY, "anthropic-version": "2023-06-01",
    "anthropic-beta": "managed-agents-2026-04-01", "content-type": "application/json"
}
MSG_HEADERS = {"x-api-key": API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"}
AGENT_ID = "agent_01PjYC4mhrVUbaQ6SS8a97R9"
ENV_ID = "env_01CAMjYFuh5uVY564nhKHjPh"
JUDGE_MODEL = "claude-sonnet-4-6"

def http(method, url, headers, body=None, timeout=60):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def call_messages_api(model, user_msg, max_tokens=700):
    status, data = http("POST", f"{BASE}/messages", MSG_HEADERS, {
        "model": model, "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": user_msg}]
    })
    if status >= 300:
        return f"[ERROR {status}: {json.dumps(data)[:200]}]"
    return data["content"][0]["text"]

def call_agent(prompt, max_wait=90):
    status, session = http("POST", f"{BASE}/sessions", AGENT_HEADERS,
        {"agent": AGENT_ID, "environment_id": ENV_ID, "title": "healthbench-sample"})
    if status >= 300:
        return f"[ERROR creating session {status}]"
    session_id = session["id"]
    status, _ = http("POST", f"{BASE}/sessions/{session_id}/events", AGENT_HEADERS,
        {"events": [{"type": "user.message", "content": [{"type": "text", "text": prompt}]}]})
    if status >= 300:
        return f"[ERROR sending message {status}]"
    waited, last_text = 0, None
    while waited < max_wait:
        time.sleep(3)
        waited += 3
        status, events = http("GET", f"{BASE}/sessions/{session_id}/events", AGENT_HEADERS)
        if status >= 300:
            continue
        agent_messages = [e for e in events.get("data", []) if e.get("type") == "agent.message"]
        if agent_messages:
            last_text = agent_messages[-1]["content"][0]["text"]
        statuses = [e.get("type") for e in events.get("data", [])]
        if any("completed" in s or "idle" in s for s in statuses if s) and last_text:
            break
    return last_text or "[ERROR: timeout, no response]"

def grade_against_rubrics(prompt_text, response, rubrics):
    rubric_text = "\n".join(f"- ({r['points']:+d} pts) {r['criterion']}" for r in rubrics)
    judge_prompt = f"""You are grading an AI health assistant's response against physician-written rubric criteria from HealthBench.

USER MESSAGE: {prompt_text}

RESPONSE TO GRADE:
{response}

RUBRIC CRITERIA (each has a point value; negative points = penalize if present):
{rubric_text}

For EACH criterion, decide if the response satisfies it (true) or not (false).
Respond ONLY with valid JSON: {{"met": [true/false, true/false, ...]}} — one boolean per criterion, in the same order listed above. No other text."""
    result = call_messages_api(JUDGE_MODEL, judge_prompt, max_tokens=500)
    try:
        cleaned = result.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1].replace("json", "", 1).strip()
        met = json.loads(cleaned)["met"]
    except Exception:
        return None, f"PARSE_ERROR: {result[:200]}"

    earned = sum(r["points"] for r, m in zip(rubrics, met) if m)
    max_possible = sum(r["points"] for r in rubrics if r["points"] > 0)
    score_pct = max(0, earned) / max_possible * 100 if max_possible > 0 else None
    return score_pct, met

def main():
    with open(os.path.join(os.path.dirname(__file__), "healthbench_sample.json")) as f:
        examples = json.load(f)

    results = []
    total = len(examples) * 2
    done = 0

    for ex in examples:
        prompt_text = ex["prompt"][0]["content"]
        rubrics = ex["rubrics"]

        done += 1
        print(f"[{done}/{total}] {ex['prompt_id'][:8]} / kaapu-agent...", file=sys.stderr)
        agent_response = call_agent(prompt_text)
        agent_score, agent_met = grade_against_rubrics(prompt_text, agent_response, rubrics)
        results.append({
            "prompt_id": ex["prompt_id"], "tags": ex.get("example_tags", []), "model": "kaapu-agent",
            "prompt": prompt_text, "response": agent_response, "score_pct": agent_score
        })

        done += 1
        print(f"[{done}/{total}] {ex['prompt_id'][:8]} / opus-raw...", file=sys.stderr)
        opus_response = call_messages_api("claude-opus-4-8", prompt_text)
        opus_score, opus_met = grade_against_rubrics(prompt_text, opus_response, rubrics)
        results.append({
            "prompt_id": ex["prompt_id"], "tags": ex.get("example_tags", []), "model": "opus-raw",
            "prompt": prompt_text, "response": opus_response, "score_pct": opus_score
        })

        out_path = os.path.join(os.path.dirname(__file__), "healthbench_results.json")
        with open(out_path, "w") as f:
            json.dump(results, f, indent=2)

    print(f"\nDone. Wrote {len(results)} results to {out_path}", file=sys.stderr)

if __name__ == "__main__":
    main()
