import json, os, sys
from run_healthbench_sample import call_messages_api
from regrade import grade_against_rubrics_v2

def main():
    sample = json.load(open(os.path.join(os.path.dirname(__file__), "healthbench_sample.json")))
    results = []
    total = len(sample)

    for i, ex in enumerate(sample):
        prompt_text = ex["prompt"][0]["content"]
        print(f"[{i+1}/{total}] {ex['prompt_id'][:8]} / haiku-raw...", file=sys.stderr)
        response = call_messages_api("claude-haiku-4-5", prompt_text)
        score_pct, err = grade_against_rubrics_v2(prompt_text, response, ex["rubrics"])
        results.append({
            "prompt_id": ex["prompt_id"], "tags": ex.get("example_tags", []), "model": "haiku-raw",
            "prompt": prompt_text, "response": response, "score_pct": score_pct, "grade_error": err
        })
        with open(os.path.join(os.path.dirname(__file__), "haiku_raw_results.json"), "w") as f:
            json.dump(results, f, indent=2)

    print("Done.", file=sys.stderr)

if __name__ == "__main__":
    main()
