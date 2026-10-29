import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-24 sm:px-8">
      <h1 className="font-display text-5xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-4 max-w-prose text-muted">
        This address doesn&apos;t match anything on the site. Check the URL, or head back to the home page.
      </p>
      <p className="mt-8">
        <Link className="text-link" href="/">
          Go to the home page
        </Link>
      </p>
    </div>
  );
}
