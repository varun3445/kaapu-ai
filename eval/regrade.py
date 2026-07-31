import json, os, re, sys
from run_healthbench_sample import call_messages_api

def grade_against_rubrics_v2(prompt_text, response, rubrics):
    rubric_lines = "\n".join(f"{i+1}. {r['criterion']}" for i, r in enumerate(rubrics))
    judge_prompt = f"""Grade this AI health assistant response against rubric criteria. For each numbered criterion, decide if the response satisfies it.

USER MESSAGE: {prompt_text}

RESPONSE:
{response}

CRITERIA:
{rubric_lines}

Output ONLY a JSON object on a single line, with no reasoning, no explanation, no markdown formatting, no code fences. Your entire reply must be exactly this and nothing else:
{{"met": [<one boolean per criterion in order>]}}"""
    result = call_messages_api("claude-sonnet-4-6", judge_prompt, max_tokens=800)

    match = re.search(r'\{[^{}]*"met"\s*:\s*\[[^\]]*\][^{}]*\}', result, re.DOTALL)
    if not match:
        return None, f"NO_JSON_FOUND: {result[:200]}"
    try:
        met = json.loads(match.group())["met"]
    except Exception as e:
        return None, f"PARSE_ERROR: {e} | raw: {result[:200]}"

    if len(met) != len(rubrics):
        n = min(len(met), len(rubrics))
        met = met[:n]
        rubrics_used = rubrics[:n]
    else:
        rubrics_used = rubrics

    earned = sum(r["points"] for r, m in zip(rubrics_used, met) if m)
    max_possible = sum(r["points"] for r in rubrics_used if r["points"] > 0)
    score_pct = max(0, earned) / max_possible * 100 if max_possible > 0 else None
    return score_pct, None

def main():
    sample = {s["prompt_id"]: s for s in json.load(open("healthbench_sample.json"))}
    old_results = json.load(open("healthbench_results.json"))

    new_results = []
    total = len(old_results)
    for i, r in enumerate(old_results):
        print(f"[{i+1}/{total}] regrading {r['prompt_id'][:8]} / {r['model']}...", file=sys.stderr)
        ex = sample[r["prompt_id"]]
        score_pct, err = grade_against_rubrics_v2(r["prompt"], r["response"], ex["rubrics"])
        new_results.append({**r, "score_pct": score_pct, "grade_error": err})
        with open("healthbench_results_v2.json", "w") as f:
            json.dump(new_results, f, indent=2)

    print("Done.", file=sys.stderr)

if __name__ == "__main__":
    main()
