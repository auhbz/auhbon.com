import "server-only";
import { cacheLife } from "next/cache";

export type Repo = {
  name: string;
  description: string | null;
  url: string;
  homepage: string | null;
  language: string | null;
  stars: number;
  pushedAt: string;
};

type GitHubRepo = {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  pushed_at: string;
  fork: boolean;
  archived: boolean;
  private: boolean;
};

const USERNAME_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/**
 * Most recently pushed public, non-fork, non-archived repos.
 * Cached for hours so the page stays static and fast while still refreshing
 * on its own. Returns `null` (not throwing) when GitHub is unavailable so the
 * section can render a fallback instead of breaking the page.
 */
export async function getRecentRepos(username: string, limit = 6): Promise<Repo[] | null> {
  "use cache";
  cacheLife("hours");

  if (!USERNAME_RE.test(username)) return null;

  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "auhbon.com",
  };
  // Optional: raises the rate limit on shared hosting IPs. Read-only public
  // access is enough; never use a token with write scopes here.
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    // GITHUB_API_URL exists only so tests can point at a local fixture server.
    const apiBase = process.env.GITHUB_API_URL ?? "https://api.github.com";
    const res = await fetch(
      `${apiBase}/users/${encodeURIComponent(username)}/repos?sort=pushed&per_page=100&type=owner`,
      { headers, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as GitHubRepo[];
    if (!Array.isArray(data)) return null;

    return data
      .filter((r) => !r.fork && !r.archived && !r.private)
      .sort((a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at))
      .slice(0, limit)
      .map((r) => ({
        name: r.name,
        description: r.description,
        url: r.html_url,
        homepage: safeHttpUrl(r.homepage),
        language: r.language,
        stars: r.stargazers_count,
        pushedAt: r.pushed_at,
      }));
  } catch {
    return null;
  }
}

/** Only allow http(s) links from third-party data — blocks javascript: and data: URLs. */
function safeHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
