import type { AnchorHTMLAttributes, ReactNode } from "react";

/**
 * Links that leave the portfolio open in a new tab, so visitors don't lose
 * their place. `noopener noreferrer` stops the new page from controlling this
 * one, and screen readers are told the link opens a new tab.
 */
export function ExternalLink({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) {
  const external = /^https?:\/\//.test(href);
  if (!external) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
