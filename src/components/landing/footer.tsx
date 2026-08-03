import { Link } from "@tanstack/react-router";

import { Reveal, Wordmark } from "./atoms";
import { WaitlistForm } from "./waitlist-form";

/** The close: the wordmark, one last invitation, and nothing else. */
export function LandingFooter() {
  return (
    <footer className="border-hairline border-t px-6 py-20 sm:px-10">
      <Reveal className="mx-auto max-w-6xl">
        <Wordmark className="h-7" />

        <p className="font-serif text-ink mt-10 max-w-[22ch] text-[26px] leading-[1.18] sm:text-[32px]">
          Understanding, before answers.
        </p>

        <WaitlistForm source="footer" className="mt-10" />

        <div className="text-ink-faint mt-16 flex flex-wrap items-center gap-x-8 gap-y-4 text-[12px]">
          <Link to="/privacy" className="transition-opacity duration-300 hover:opacity-70">
            Privacy
          </Link>
          <Link to="/terms" className="transition-opacity duration-300 hover:opacity-70">
            Terms
          </Link>
          <a
            href="mailto:hello@ciatta.io"
            className="transition-opacity duration-300 hover:opacity-70"
          >
            Contact
          </a>
          <span className="ml-auto">© {new Date().getFullYear()} Ciatta</span>
        </div>
      </Reveal>
    </footer>
  );
}
