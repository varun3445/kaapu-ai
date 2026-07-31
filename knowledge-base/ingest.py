import json, os, re, sys, urllib.request
from pathlib import Path

OPENAI_KEY = os.environ["OPENAI_API_KEY"]
KB_ROOT = Path(__file__).parent

def chunk_markdown(text, source_file):
    """Split on ## headers, keep frontmatter context with each chunk."""
    fm_match = re.match(r'^---\n(.*?)\n---\n(.*)', text, re.DOTALL)
    frontmatter, body = (fm_match.group(1), fm_match.group(2)) if fm_match else ("", text)

    meta = {}
    for line in frontmatter.split("\n"):
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()

    sections = re.split(r'\n(?=## )', body.strip())
    chunks = []
    title_line = sections[0].split("\n")[0].replace("# ", "").strip() if sections else ""

    for section in sections:
        section = section.strip()
        if not section:
            continue
        chunks.append({
            "content": f"{title_line}\n\n{section}" if not section.startswith("#") else section,
            "source": meta.get("source", "unknown"),
            "source_url": meta.get("url", None),
        })
    return chunks

def get_embedding(text):
    data = json.dumps({"model": "text-embedding-3-small", "input": text}).encode()
    req = urllib.request.Request(
        "https://api.openai.com/v1/embeddings",
        data=data,
        headers={"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read())
    return result["data"][0]["embedding"]

def main():
    all_chunks = []
    for md_file in sorted(KB_ROOT.glob("**/*.md")):
        text = md_file.read_text()
        chunks = chunk_markdown(text, md_file.name)
        for c in chunks:
            c["file"] = str(md_file.relative_to(KB_ROOT))
        all_chunks.extend(chunks)

    print(f"Found {len(all_chunks)} chunks across markdown files", file=sys.stderr)

    output = []
    for i, chunk in enumerate(all_chunks):
        print(f"[{i+1}/{len(all_chunks)}] embedding chunk from {chunk['file']}...", file=sys.stderr)
        embedding = get_embedding(chunk["content"])
        output.append({**chunk, "embedding": embedding})

    out_path = KB_ROOT / "chunks_with_embeddings.json"
    with open(out_path, "w") as f:
        json.dump(output, f)
    print(f"Wrote {len(output)} embedded chunks to {out_path}", file=sys.stderr)

if __name__ == "__main__":
    main()
