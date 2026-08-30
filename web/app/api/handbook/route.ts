import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// The handbook is static content shipped with the deploy, so cache hard.
const HEADERS = { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" };

function handbookDir(): string {
  return path.join(process.cwd(), "content", "handbook");
}

// YAML parses an unquoted date like `2026-08-01` as a Date, not a string.
function updatedString(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return v ? String(v) : "";
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("doc");
  let files: string[];
  try {
    files = fs.readdirSync(handbookDir()).filter((f) => f.endsWith(".md"));
  } catch (e) {
    console.error("handbook dir unavailable:", e);
    return NextResponse.json({ error: "handbook_unavailable" }, { status: 502 });
  }

  if (!slug) {
    const docs = files.map((f) => {
      const { data } = matter(fs.readFileSync(path.join(handbookDir(), f), "utf8"));
      return {
        slug: f.replace(/\.md$/, ""),
        title: String(data.title ?? f),
        category: String(data.category ?? ""),
        updated: updatedString(data.updated),
      };
    });
    docs.sort((a, b) => a.title.localeCompare(b.title));
    return NextResponse.json({ docs }, { headers: HEADERS });
  }

  // Resolve only against the directory listing — the slug never touches a
  // path directly, so traversal input simply fails to match.
  const file = files.find((f) => f === `${slug}.md`);
  if (!file) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data, content } = matter(fs.readFileSync(path.join(handbookDir(), file), "utf8"));
  return NextResponse.json(
    {
      slug,
      title: String(data.title ?? file),
      category: String(data.category ?? ""),
      updated: updatedString(data.updated),
      content: content.trim(),
    },
    { headers: HEADERS },
  );
}
