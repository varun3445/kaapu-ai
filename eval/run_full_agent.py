import json, os, sys, time, urllib.request, urllib.error

API_KEY = os.environ["ANTHROPIC_API_KEY"]
BASE = "https://api.anthropic.com/v1"
AGENT_HEADERS = {
    "x-api-key": API_KEY, "anthropic-version": "2023-06-01",
    "anthropic-beta": "managed-agents-2026-04-01", "content-type": "application/json"
}
AGENT_ID = "agent_01PjYC4mhrVUbaQ6SS8a97R9"
ENV_ID = "env_01CAMjYFuh5uVY564nhKHjPh"
VAULT_ID = "vlt_011CcEcUcewr1FNhtabEL8up"

def http(method, url, headers, body=None, timeout=60):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def call_agent_with_rag(prompt, max_wait=150):
    status, session = http("POST", f"{BASE}/sessions", AGENT_HEADERS,
        {"agent": AGENT_ID, "environment_id": ENV_ID, "title": "full-agent-eval", "vault_ids": [VAULT_ID]})
    if status >= 300:
        return f"[ERROR creating session {status}: {json.dumps(session)[:200]}]"
    session_id = session["id"]

    status, _ = http("POST", f"{BASE}/sessions/{session_id}/events", AGENT_HEADERS,
        {"events": [{"type": "user.message", "content": [{"type": "text", "text": prompt}]}]})
    if status >= 300:
        return f"[ERROR sending message {status}]"

    waited = 0
    last_text = None
    while waited < max_wait:
        time.sleep(5)
        waited += 5
        req = urllib.request.Request(f"{BASE}/sessions/{session_id}/events", headers=AGENT_HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw = resp.read().decode()
            events = json.loads(raw, strict=False)
        except Exception:
            continue
        agent_messages = [e for e in events.get("data", []) if e.get("type") == "agent.message"]
        if agent_messages:
            last_text = agent_messages[-1]["content"][0]["text"]
        statuses = [e.get("type") for e in events.get("data", [])]
        if "session.status_idle" in statuses and last_text:
            break
    return last_text or "[ERROR: timeout, no response]"

def main():
    with open(os.path.join(os.path.dirname(__file__), "healthbench_sample.json")) as f:
        examples = json.load(f)

    results = []
    total = len(examples)
    for i, ex in enumerate(examples):
        prompt_text = ex["prompt"][0]["content"]
        print(f"[{i+1}/{total}] {ex['prompt_id'][:8]} / full-agent...", file=sys.stderr)
        response = call_agent_with_rag(prompt_text)
        results.append({
            "prompt_id": ex["prompt_id"], "tags": ex.get("example_tags", []), "model": "full-agent",
            "prompt": prompt_text, "response": response
        })
        out_path = os.path.join(os.path.dirname(__file__), "full_agent_results_raw.json")
        with open(out_path, "w") as f:
            json.dump(results, f, indent=2)

    print(f"Done. Wrote {len(results)} responses to {out_path}", file=sys.stderr)

if __name__ == "__main__":
    main()
