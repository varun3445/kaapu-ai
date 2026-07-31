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
VAULT_ID = "vlt_011CcEcUcewr1FNhtabEL8up"

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

def call_agent_v8(prompt, max_wait=150):
    status, session = http("POST", f"{BASE}/sessions", AGENT_HEADERS,
        {"agent": AGENT_ID, "environment_id": ENV_ID, "title": "fresh-holdout-eval", "vault_ids": [VAULT_ID]})
    if status >= 300:
        return f"[ERROR creating session {status}: {json.dumps(session)[:200]}]"
    session_id = session["id"]
    status, _ = http("POST", f"{BASE}/sessions/{session_id}/events", AGENT_HEADERS,
        {"events": [{"type": "user.message", "content": [{"type": "text", "text": prompt}]}]})
    if status >= 300:
        return f"[ERROR sending message {status}]"
    waited, last_text = 0, None
    while waited < max_wait:
        time.sleep(5)
        waited += 5
        req = urllib.request.Request(f"{BASE}/sessions/{session_id}/events", headers=AGENT_HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                events = json.loads(resp.read().decode(), strict=False)
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
    examples = json.load(open(os.path.join(os.path.dirname(__file__), "healthbench_fresh_sample.json")))
    results = []
    total = len(examples) * 3
    done = 0

    for ex in examples:
        prompt_text = ex["prompt"][0]["content"]

        done += 1
        print(f"[{done}/{total}] {ex['prompt_id'][:8]} / haiku-raw...", file=sys.stderr)
        results.append({"prompt_id": ex["prompt_id"], "tags": ex.get("example_tags", []), "model": "haiku-raw",
                         "prompt": prompt_text, "response": call_messages_api("claude-haiku-4-5", prompt_text)})

        done += 1
        print(f"[{done}/{total}] {ex['prompt_id'][:8]} / opus-raw...", file=sys.stderr)
        results.append({"prompt_id": ex["prompt_id"], "tags": ex.get("example_tags", []), "model": "opus-raw",
                         "prompt": prompt_text, "response": call_messages_api("claude-opus-4-8", prompt_text)})

        done += 1
        print(f"[{done}/{total}] {ex['prompt_id'][:8]} / kaapu-agent-v8...", file=sys.stderr)
        results.append({"prompt_id": ex["prompt_id"], "tags": ex.get("example_tags", []), "model": "kaapu-agent-v8",
                         "prompt": prompt_text, "response": call_agent_v8(prompt_text)})

        with open(os.path.join(os.path.dirname(__file__), "fresh_sample_results_raw.json"), "w") as f:
            json.dump(results, f, indent=2)

    print("Done.", file=sys.stderr)

if __name__ == "__main__":
    main()
