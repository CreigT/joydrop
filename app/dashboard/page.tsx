import { redirect } from "next/navigation";
import { hasDatabaseUrl } from "@/lib/database";
import { formatBirthday } from "@/lib/dates";

import { prisma } from "@/lib/prisma";
import { getCurrentFirebaseUser } from "@/lib/session";

export default async function DashboardPage() {
  const session = await getCurrentFirebaseUser();

  if (!session) {
    redirect("/login?next=/dashboard");
  }

  if (!hasDatabaseUrl()) {
    return (
      <main className="min-h-screen bg-bg px-5 py-8">
        <section className="mx-auto max-w-3xl rounded-2xl bg-white/90 p-7 shadow-xl ring-1 ring-white/80">
          <p className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-black text-[#30273A]">
            JoyDrop
          </p>
          <h1 className="mt-4 font-heading text-3xl font-black text-[#30273A]">
            Your Birthday
          </h1>
          <p className="mt-4 text-sm font-semibold leading-7 text-[#463B52]">
            JoyDrop data is temporarily unavailable.
          </p>
        </section>
      </main>
    );
  }

  const currentUser = await prisma.user.findFirst({
    where: {
      firebaseUid: session.uid,
      soft_delete: false
    },
    include: {
      contributions: {
        where: {
          soft_delete: false,
          consent_bool: true
        },
        orderBy: {
          created_at: "desc"
        }
      }
    }
  });

  const users = currentUser ? [currentUser] : [];

  return (
    <main className="min-h-screen bg-bg px-5 py-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-black text-[#30273A]">
            JoyDrop
          </p>
          <h1 className="mt-4 font-heading text-4xl font-black text-[#30273A]">
            Your Birthday
          </h1>
        </div>

        <div className="grid gap-5">
          {users.length === 0 ? (
            <p className="rounded-2xl bg-white/90 p-5 text-sm font-semibold text-[#463B52] shadow-xl ring-1 ring-white/80">
              You have not opted in yet.{" "}
              <a className="underline" href="/onboarding">
                Opt in here
              </a>
              .
            </p>
          ) : null}
          {users.map((user) => {
            return (
              <article
                className="rounded-2xl bg-white/90 p-5 shadow-xl ring-1 ring-white/80"
                key={user.id}
              >
                <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
                  <div>
                    <h2 className="font-heading text-2xl font-black text-[#30273A]">
                      {user.name}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-[#463B52]">
                      {formatBirthday(user.birthday_mm_dd)} - {user.email}
                    </p>
                    {user.paused_bool ? (
                      <p className="mt-3 rounded-2xl bg-accent/60 p-3 text-sm font-semibold text-[#30273A]">
                        JoyDrop is paused. Friends cannot send new messages and your
                        page will not unlock automatically.
                      </p>
                    ) : null}
                    <div className="mt-4 space-y-2 text-sm font-semibold text-[#463B52]">
                      <p>
                        Your invite link to share with friends:{" "}
                        <a className="break-all underline" href={`/invite/${user.id}`}>
                          /invite/{user.id}
                        </a>
                      </p>
                      <p>
                        Your Birthday Bridge page:{" "}
                        <a className="break-all underline" href={`/birthday/${user.id}`}>
                          /birthday/{user.id}
                        </a>
                      </p>
                      <p>
                        It unlocks at midnight Pacific Time on your birthday and shows
                        only the messages you approve below.
                      </p>
                    </div>
                    <form action="/api/pause" className="mt-4" method="post">
                      <input name="user_id" type="hidden" value={user.id} />
                      <input
                        name="action"
                        type="hidden"
                        value={user.paused_bool ? "resume" : "pause"}
                      />
                      <button
                        className="rounded-2xl bg-white px-5 py-3 font-heading font-black text-[#30273A] shadow"
                        type="submit"
                      >
                        {user.paused_bool ? "Resume JoyDrop" : "Pause JoyDrop"}
                      </button>
                    </form>
                    <div className="mt-6 space-y-3 rounded-2xl bg-bg/70 p-4 text-sm text-[#463B52]">
                      <p className="font-bold text-[#30273A]">Your data</p>
                      <a className="block underline" href="/api/me/export">
                        Download my data (JSON)
                      </a>
                      <form action="/api/me" className="space-y-2" method="post">
                        <label className="flex gap-2 text-xs font-semibold">
                          <input name="confirm" required type="checkbox" />
                          I understand this hides my account, messages, and page in JoyDrop.
                        </label>
                        <button
                          className="rounded-2xl bg-primary px-4 py-2 text-xs font-black text-white"
                          type="submit"
                        >
                          Erase my data
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-heading text-lg font-black text-[#30273A]">
                        Contributions
                      </h3>
                      <div className="mt-3 grid gap-3">
                        {user.contributions.map((contribution) => (
                          <div
                            className="rounded-2xl bg-bg/70 p-4 text-sm text-[#463B52]"
                            key={contribution.id}
                          >
                            <p className="font-bold">
                              {contribution.contributor_name}
                            </p>
                            <p>{contribution.message_text}</p>
                            <ContributionMedia
                              src={contribution.fileUrl ?? contribution.photo_url ?? contribution.voice_url}
                              type={contribution.type}
                            />
                            {!contribution.isApproved ? (
                              <form action="/api/approve" className="mt-3" method="post">
                                <input
                                  name="contribution_id"
                                  type="hidden"
                                  value={contribution.id}
                                />
                                <button
                                  className="rounded-2xl bg-accent px-4 py-2 text-xs font-black text-[#30273A]"
                                  type="submit"
                                >
                                  Approve
                                </button>
                              </form>
                            ) : (
                              <p className="mt-2 text-xs font-black text-[#30273A]">
                                Approved
                              </p>
                            )}
                          </div>
                        ))}
                        {user.contributions.length === 0 ? (
                          <p className="rounded-2xl bg-bg/70 p-4 text-sm font-semibold text-[#463B52]">
                            No contributions yet.
                          </p>
                        ) : null}
                      </div>
                    </div>

                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

/* eslint-disable @next/next/no-img-element */
function ContributionMedia({ src, type }: { src: string | null; type: string }) {
  if (!src) return null;
  if (type === "photo" || type === "gif") {
    return <img alt="Attached file" className="mt-2 max-h-48 rounded-xl" src={src} />;
  }
  if (type === "voice") {
    return <audio className="mt-2 w-full" controls src={src} />;
  }
  if (type === "video") {
    return <video className="mt-2 max-h-48 w-full rounded-xl" controls src={src} />;
  }
  return null;
}
