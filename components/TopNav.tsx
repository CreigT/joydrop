import { cookies } from "next/headers";
import { sessionCookieName } from "@/lib/session-cookie";

/**
 * Simple top navigation on every page. It only checks whether a session cookie
 * is present to choose which links to show; pages still verify the session
 * before showing any account data.
 */
export function TopNav() {
  const signedIn = Boolean(cookies().get(sessionCookieName)?.value);
  const link = "rounded-xl px-3 py-2 text-sm font-black text-[#30273A] hover:bg-white/70";

  return (
    <nav aria-label="Main" className="bg-bg px-4 py-3">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <a className="rounded-full bg-accent px-3 py-1 text-sm font-black text-[#30273A]" href={signedIn ? "/dashboard" : "/"}>
          JoyDrop
        </a>
        <div className="flex flex-wrap items-center gap-1">
          {signedIn ? (
            <>
              <a className={link} href="/dashboard">
                Dashboard
              </a>
              <a className={link} href="/send">
                Make a card
              </a>
              <form action="/api/session/logout" method="post">
                <button className={link} type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <a className={link} href="/send">
                Make a card
              </a>
              <a className={link} href="/login">
                Sign in
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
