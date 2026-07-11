import { redirect } from "next/navigation";
import { birthdayInNext30Days, formatBirthday } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { getCurrentFirebaseUser } from "@/lib/session";

export default async function DashboardPage() {
  const session = await getCurrentFirebaseUser();

  if (!session) {
    redirect("/login?next=/dashboard");
  }

  const users = (
    await prisma.user.findMany({
      where: {
        paused_bool: false,
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
        },
        surprises: {
          where: {
            soft_delete: false
          },
          orderBy: {
            scheduled_for: "desc"
          }
        }
      },
      orderBy: {
        birthday_mm_dd: "asc"
      }
    })
  ).filter((user) => birthdayInNext30Days(user.birthday_mm_dd));

  return (
    <main className="min-h-screen bg-bg px-5 py-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-black text-[#30273A]">
            JoyDrop
          </p>
          <h1 className="mt-4 font-heading text-4xl font-black text-[#30273A]">
            Upcoming birthdays next 30 days
          </h1>
        </div>

        <div className="grid gap-5">
          {users.map((user) => {
            const latestDraft = user.surprises.find(
              (surprise) => surprise.status === "draft" || surprise.status === "approved"
            );
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
                      {formatBirthday(user.birthday_mm_dd)} · {user.email}
                    </p>
                    <form action="/api/generate" className="mt-5" method="post">
                      <input name="user_id" type="hidden" value={user.id} />
                      <button
                        className="rounded-2xl bg-primary px-5 py-3 font-heading font-black text-white shadow-lg shadow-primary/30"
                        type="submit"
                      >
                        Generate Speech
                      </button>
                    </form>
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
                            ) : null}
                          </div>
                        ))}
                        {user.contributions.length === 0 ? (
                          <p className="rounded-2xl bg-bg/70 p-4 text-sm font-semibold text-[#463B52]">
                            No contributions yet.
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {latestDraft ? (
                      <form
                        action="/api/approve"
                        className="space-y-3 rounded-2xl bg-secondary/20 p-4"
                        method="post"
                      >
                        <input
                          name="surprise_id"
                          type="hidden"
                          value={latestDraft.id}
                        />
                        <label className="block text-sm font-bold text-[#30273A]">
                          AI Draft
                          <textarea
                            className="mt-2 min-h-40 w-full resize-y rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/20"
                            name="script_text"
                            defaultValue={latestDraft.script_text}
                          />
                        </label>
                        <button
                          className="rounded-2xl bg-secondary px-5 py-3 font-heading font-black text-[#173B3A] shadow-lg shadow-secondary/30"
                          type="submit"
                        >
                          Approve
                        </button>
                      </form>
                    ) : null}
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
