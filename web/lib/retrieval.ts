import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import MiniSearch from "minisearch";

export type Chunk = {
  id: number;
  docTitle: string;
  category: string;
  section: string;
  text: string;
  updated: string;
};

export function chunkDoc(raw: string, sourceName: string): Chunk[] {
  const { data, content } = matter(raw);
  const docTitle = String(data.title ?? sourceName);
  const category = String(data.category ?? "");
  // YAML parses an unquoted date like `2026-08-01` as a Date, not a string.
  const rawUpdated = data.updated;
  const updated = rawUpdated instanceof Date ? rawUpdated.toISOString().slice(0, 10) : String(rawUpdated ?? "");
  const parts = content.split(/^## +/m);
  const chunks: Chunk[] = [];
  const intro = parts[0].trim();
  if (intro) chunks.push({ id: 0, docTitle, category, section: "Overview", text: intro, updated });
  for (const part of parts.slice(1)) {
    const nl = part.indexOf("\n");
    const section = (nl === -1 ? part : part.slice(0, nl)).trim();
    const text = (nl === -1 ? "" : part.slice(nl + 1)).trim();
    if (text) chunks.push({ id: 0, docTitle, category, section, text, updated });
  }
  return chunks;
}

let cache: { chunks: Chunk[]; index: MiniSearch<Chunk> } | null = null;

function handbookDir(): string {
  return path.join(process.cwd(), "content", "handbook");
}

function buildIndex() {
  const files = fs.readdirSync(handbookDir()).filter((f) => f.endsWith(".md"));
  const chunks: Chunk[] = [];
  for (const f of files) {
    const raw = fs.readFileSync(path.join(handbookDir(), f), "utf8");
    for (const c of chunkDoc(raw, f)) chunks.push({ ...c, id: chunks.length });
  }
  const index = new MiniSearch<Chunk>({
    fields: ["docTitle", "section", "text"],
    storeFields: ["docTitle", "category", "section", "text", "updated"],
  });
  index.addAll(chunks);
  cache = { chunks, index };
  return cache;
}

export function searchHandbook(query: string, k = 3): Chunk[] {
  const { index } = cache ?? buildIndex();
  return index
    .search(query, { fuzzy: 0.2, prefix: true })
    .slice(0, k)
    .map((r) => ({
      id: r.id as number,
      docTitle: String(r.docTitle),
      category: String(r.category),
      section: String(r.section),
      text: String(r.text),
      updated: String(r.updated ?? ""),
    }));
}
