/**
 * End-to-end flow against a real Postgres database.
 * Runs only when TEST_DATABASE_URL is set (e.g. a throwaway local database);
 * skipped otherwise. Only sign-in is simulated.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const session = vi.hoisted(() => ({ current: null as null | { uid: string; email?: string } }));
vi.mock("@/lib/session", () => ({
  getCurrentFirebaseUser: async () => session.current,
  displayNameFromToken: () => "Friend"
}));

vi.mock("next/headers", () => ({
  headers: () => new Headers({ "x-forwarded-host": "joydrop-iota.vercel.app", "x-forwarded-proto": "https" }),
  cookies: () => ({ get: () => undefined })
}));

const run = TEST_DB ? describe : describe.skip;

function form(fields: Record<string, string>, accept = "text/html") {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.set(k, v);
  return new Request("http://localhost/x", {
    method: "POST",
    body,
    headers: { accept, "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` }
  });
}

/** next/navigation redirect() throws; return its target instead. */
async function followRedirect(fn: () => Promise<unknown>) {
  try {
    const res = await fn();
    return { res: res as Response, location: (res as Response).headers.get("location") };
  } catch (error) {
    const digest = (error as { digest?: string }).digest ?? "";
    if (!digest.startsWith("NEXT_REDIRECT")) throw error;
    return { res: null, location: digest.split(";")[2] };
  }
}

run("JoyDrop flow on a real database", () => {
  const OWNER = { uid: "test_owner_uid", email: "joydrop-test-owner@example.com" };
  const OTHER = { uid: "test_other_uid", email: "joydrop-test-other@example.com" };
  const SENDER = { uid: "test_sender_uid", email: "joydrop-test-sender@example.com" };
  let prisma: typeof import("@/lib/prisma").prisma;
  let userId = "";

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/prisma"));
    await prisma.user.deleteMany({ where: { firebaseUid: { in: [OWNER.uid, OTHER.uid, SENDER.uid] } } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { firebaseUid: { in: [OWNER.uid, OTHER.uid, SENDER.uid] } } });
    await prisma.card.deleteMany({ where: { senderName: "TEST DATA sender" } });
    await prisma.$disconnect();
  });

  it("opts in, collects a message, approves it, and unlocks on the birthday", async () => {
    const { POST: optin } = await import("@/app/api/optin/route");
    const { POST: contribute } = await import("@/app/api/contribute/route");
    const { POST: approve } = await import("@/app/api/approve/route");
    const { GET: publicPage } = await import("@/app/api/birthday/[userId]/route");
    const { GET: cron } = await import("@/app/api/cron/daily/route");
    const { POST: guestbook } = await import("@/app/api/birthday/[userId]/guestbook/route");
    const { POST: gift } = await import("@/app/api/birthday/[userId]/gift/route");

    // Opt in with a birthday far from today so the page starts locked.
    session.current = OWNER;
    const in3Months = new Date(Date.now() + 90 * 86400000);
    const mm = String(in3Months.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(Math.min(in3Months.getUTCDate(), 28)).padStart(2, "0");
    const opt = await followRedirect(() =>
      optin(form({ full_name: "Test Owner", email: "ignored@example.com", month: mm, day: dd, consent_checkbox_1: "on", consent_checkbox_2: "on" }))
    );
    expect(opt.location).toMatch(/^\/thanks\?user_id=/);
    const user = await prisma.user.findUniqueOrThrow({ where: { firebaseUid: OWNER.uid }, include: { birthday_page: true } });
    userId = user.id;
    expect(user.email).toBe(OWNER.email); // login email wins over the form field
    expect(user.birthday_page?.isLocked).toBe(true);

    // A friend (signed out) sends a message.
    session.current = null;
    const sent = await followRedirect(() =>
      contribute(form({ user_id: userId, contributor_name: "Test Friend", contributor_email: "friend@example.com", text_message_field: "Happy birthday from the test!", type: "text", permission_checkbox: "on" }))
    );
    expect(sent.location).toMatch(/^\/invite\/thanks/);
    const contribution = await prisma.contribution.findFirstOrThrow({ where: { user_id: userId } });

    // Another signed-in user cannot approve it; the owner can.
    session.current = OTHER;
    expect((await approve(form({ contribution_id: contribution.id }, "application/json"))).status).toBe(403);
    session.current = OWNER;
    expect((await approve(form({ contribution_id: contribution.id }))).status).toBe(303);

    // Locked: the public API returns nothing yet; guestbook is closed.
    session.current = null;
    let json = await (await publicPage(new Request("http://x"), { params: { userId } })).json();
    expect(json.page.unlocked).toBe(false);
    expect(json.contributions).toEqual([]);
    expect((await guestbook(form({ name: "Early", message: "too soon" }), { params: { userId } })).status).toBe(404);

    // Birthday arrives: move the unlock time into the past and run the cron.
    await prisma.birthdayPage.update({ where: { userId }, data: { unlockAt: new Date(Date.now() - 60000) } });
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    const cronRes = await cron(new Request("http://x", { headers: { authorization: "Bearer test-cron-secret" } }));
    vi.unstubAllEnvs();
    process.env.DATABASE_URL = TEST_DB;
    expect(cronRes.status).toBe(200);
    expect((await cronRes.json()).unlocked).toBeGreaterThanOrEqual(1);
    expect((await prisma.birthdayPage.findUniqueOrThrow({ where: { userId } })).isLocked).toBe(false);

    json = await (await publicPage(new Request("http://x"), { params: { userId } })).json();
    expect(json.page.unlocked).toBe(true);
    expect(json.contributions.map((c: { message_text: string }) => c.message_text)).toEqual(["Happy birthday from the test!"]);
    expect(JSON.stringify(json)).not.toContain(OWNER.email);
    expect(JSON.stringify(json)).not.toContain("friend@example.com");

    // Visitors can sign the guestbook and add a gift note once open.
    expect((await guestbook(form({ name: "Visitor", message: "Have a great day" }), { params: { userId } })).status).toBe(303);
    expect((await gift(form({ from_name: "Visitor", title: "Book", amount: "20", goal: "0" }), { params: { userId } })).status).toBe(303);
    json = await (await publicPage(new Request("http://x"), { params: { userId } })).json();
    expect(json.guestbook).toHaveLength(1);
    expect(json.gifts).toHaveLength(1);

    // Owner can download the keepsake PDF; the owner can hide the page from visitors.
    const { GET: pdf } = await import("@/app/api/birthday/[userId]/generate-pdf/route");
    const { POST: privacy } = await import("@/app/api/birthday/[userId]/privacy/route");
    session.current = OWNER;
    const pdfRes = await pdf(new Request("http://x"), { params: { userId } });
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers.get("content-type")).toContain("application/pdf");
    expect((await privacy(form({ action: "pause" }), { params: { userId } })).status).toBe(303);
    session.current = null;
    expect((await publicPage(new Request("http://x"), { params: { userId } })).status).toBe(404);
    session.current = OWNER;
    expect((await privacy(form({ action: "resume" }), { params: { userId } })).status).toBe(303);
  });

  it("pause blocks new messages; export and erase only touch the caller", async () => {
    const { POST: pause } = await import("@/app/api/pause/route");
    const { POST: contribute } = await import("@/app/api/contribute/route");
    const { GET: exportMe } = await import("@/app/api/me/export/route");
    const { POST: erase } = await import("@/app/api/me/route");
    const { GET: publicPage } = await import("@/app/api/birthday/[userId]/route");

    session.current = OTHER;
    expect((await pause(form({ user_id: userId }, "application/json"))).status).toBe(404); // the other login has no JoyDrop account, so nothing changes

    session.current = OWNER;
    expect((await pause(form({ user_id: userId, action: "pause" }))).status).toBe(303);
    session.current = null;
    const blocked = await contribute(
      form({ user_id: userId, contributor_name: "Late", contributor_email: "late@example.com", text_message_field: "hi", type: "text", permission_checkbox: "on" })
    );
    expect(blocked.status).toBe(403);

    session.current = OWNER;
    expect((await pause(form({ user_id: userId, action: "resume" }))).status).toBe(303);
    const exported = await (await exportMe()).json();
    expect(exported.id).toBe(userId);
    expect(exported.contributions).toHaveLength(1);

    session.current = OTHER;
    expect((await exportMe()).status).toBe(404);

    session.current = OWNER;
    expect((await erase(form({ confirm: "on" }))).status).toBe(303);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).soft_delete).toBe(true);
    session.current = null;
    expect((await publicPage(new Request("http://x"), { params: { userId } })).status).toBe(404);
  });

  it("sender-first card: create, share, claim, protect, export, erase, report, sender delete", async () => {
    const { POST: createCard } = await import("@/app/api/cards/route");
    const { POST: cardAction } = await import("@/app/api/cards/[token]/route");
    const { POST: manage } = await import("@/app/api/cards/manage/route");
    const { GET: exportMe } = await import("@/app/api/me/export/route");
    const { POST: erase } = await import("@/app/api/me/route");
    const { hashManageToken } = await import("@/lib/cards");

    async function make() {
      session.current = null;
      const res = await createCard(
        form({ recipient_name: "TEST DATA recipient", sender_name: "TEST DATA sender", message: "TEST DATA message", permission_checkbox: "on" })
      );
      expect(res.status).toBe(303);
      const manageToken = res.headers.get("location")!.split("/send/")[1];
      const card = await prisma.card.findUniqueOrThrow({ where: { manageTokenHash: hashManageToken(manageToken) } });
      return { manageToken, card };
    }
    const act = (token: string, action: string, accept = "application/json") =>
      cardAction(form({ action }, accept), { params: { token } });

    // Card 1: claimed by OTHER, protected, exported, then erased with OTHER's data.
    const one = await make();
    expect(one.card.status).toBe("active");
    expect(one.card.token).not.toBe(one.manageToken);
    expect((await act(one.card.token, "hide")).status).toBe(200);
    expect((await act(one.card.token, "show")).status).toBe(200);
    expect((await act(one.card.token, "claim")).status).toBe(401);
    session.current = OTHER;
    expect((await act(one.card.token, "claim")).status).toBe(200);
    session.current = null;
    expect((await act(one.card.token, "delete")).status).toBe(401);
    session.current = OWNER;
    expect((await act(one.card.token, "hide")).status).toBe(403);
    expect((await act(one.card.token, "claim")).status).toBe(409);
    session.current = OTHER;
    const exported = await (await exportMe()).json();
    expect(exported.received_cards).toHaveLength(1);
    expect(exported.received_cards[0].message).toBe("TEST DATA message");
    expect((await erase(form({ confirm: "on" }, "application/json"))).status).toBe(200);
    const erased = await prisma.card.findUniqueOrThrow({ where: { id: one.card.id } });
    expect(erased).toMatchObject({ status: "deleted", message: "" });
    expect((await act(one.card.token, "show")).status).toBe(404);

    // Card 2: reported by the link holder, content cleared, can't be undone.
    const two = await make();
    const reported = await act(two.card.token, "report", "text/html");
    expect(reported.headers.get("location")).toBe("http://localhost/card/removed");
    expect(await prisma.card.findUniqueOrThrow({ where: { id: two.card.id } })).toMatchObject({ status: "reported", message: "" });
    expect((await act(two.card.token, "show")).status).toBe(404);

    // Card 3: deleted by the sender with the private manage token.
    const three = await make();
    expect((await manage(form({ manage_token: "x".repeat(43), action: "delete" }, "application/json"))).status).toBe(404);
    expect((await manage(form({ manage_token: three.manageToken, action: "delete" }, "application/json"))).status).toBe(200);
    expect(await prisma.card.findUniqueOrThrow({ where: { id: three.card.id } })).toMatchObject({ status: "deleted", message: "" });
    expect((await manage(form({ manage_token: three.manageToken, action: "delete" }, "application/json"))).status).toBe(404);
  });
  it("personal dashboard: sent and received cards, attach, own-only delete, profile edit", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { POST: createCard } = await import("@/app/api/cards/route");
    const { POST: cardAction } = await import("@/app/api/cards/[token]/route");
    const { POST: manage } = await import("@/app/api/cards/manage/route");
    const { POST: mine } = await import("@/app/api/cards/mine/route");
    const { POST: profile } = await import("@/app/api/profile/route");
    const { POST: optin } = await import("@/app/api/optin/route");
    const { GET: exportMe } = await import("@/app/api/me/export/route");
    const { POST: erase } = await import("@/app/api/me/route");
    const { default: Dashboard } = await import("@/app/dashboard/page");
    const { hashManageToken } = await import("@/lib/cards");

    const cardFields = { recipient_name: "TEST DATA recipient", sender_name: "TEST DATA sender", message: "TEST DATA message", permission_checkbox: "on" };
    async function make(as: typeof SENDER | null) {
      session.current = as;
      const res = await createCard(form(cardFields));
      const manageToken = res.headers.get("location")!.split("/send/")[1];
      const card = await prisma.card.findUniqueOrThrow({ where: { manageTokenHash: hashManageToken(manageToken) } });
      return { manageToken, card };
    }
    const render = async (notice?: string) =>
      renderToStaticMarkup((await Dashboard({ searchParams: notice ? { notice } : {} })) as React.ReactElement);

    // Signed-in sender: the card is linked to them.
    const signedIn = await make(SENDER);
    expect(signedIn.card.senderUid).toBe(SENDER.uid);

    // Signed-out card: not linked; attach needs sign-in and the manage token.
    const earlier = await make(null);
    expect(earlier.card.senderUid).toBeNull();
    session.current = null;
    expect((await manage(form({ manage_token: earlier.manageToken, action: "attach" }, "application/json"))).status).toBe(401);
    session.current = SENDER;
    expect((await manage(form({ manage_token: "y".repeat(43), action: "attach" }, "application/json"))).status).toBe(404);
    const attached = await manage(form({ manage_token: earlier.manageToken, action: "attach" }));
    expect(attached.headers.get("location")).toBe("http://localhost/dashboard?notice=card_added");
    expect((await prisma.card.findUniqueOrThrow({ where: { id: earlier.card.id } })).senderUid).toBe(SENDER.uid);
    // Another login can't take it over.
    session.current = OTHER;
    expect((await manage(form({ manage_token: earlier.manageToken, action: "attach" }, "application/json"))).status).toBe(409);

    // OTHER claims the signed-in card, so SENDER sees "claimed" and OTHER sees it under received.
    expect((await cardAction(form({ action: "claim" }, "application/json"), { params: { token: signedIn.card.token } })).status).toBe(200);
    const otherView = await render();
    expect(otherView).toContain("Cards I received");
    expect(otherView).toContain("From TEST DATA sender");
    expect(otherView).not.toContain('data-testid="sent-card"');

    session.current = SENDER;
    let view = await render();
    expect((view.match(/data-testid="sent-card"/g) ?? []).length).toBe(2);
    expect(view).toContain("Claimed by the birthday person");
    expect(view).toContain("Sent (not claimed yet)");
    expect(view).toContain(`https://joydrop-iota.vercel.app/card/${signedIn.card.token}`);
    expect(view).toContain("Make a card");
    expect(view).toContain("You don&#x27;t have a birthday page yet");
    expect(view).not.toContain("Contributions");

    // Delete from the dashboard: confirm box required; only the sender's own cards.
    expect((await mine(form({ card_id: earlier.card.id, action: "delete" }, "application/json"))).status).toBe(400);
    session.current = OTHER;
    expect((await mine(form({ card_id: earlier.card.id, action: "delete", confirm: "on" }, "application/json"))).status).toBe(404);
    session.current = null;
    expect((await mine(form({ card_id: earlier.card.id, action: "delete", confirm: "on" }, "application/json"))).status).toBe(401);
    session.current = SENDER;
    const deleted = await mine(form({ card_id: earlier.card.id, action: "delete", confirm: "on" }));
    expect(deleted.headers.get("location")).toBe("http://localhost/dashboard?notice=card_deleted");
    expect(await prisma.card.findUniqueOrThrow({ where: { id: earlier.card.id } })).toMatchObject({ status: "deleted", message: "" });
    view = await render("card_deleted");
    expect((view.match(/data-testid="sent-card"/g) ?? []).length).toBe(1);
    expect(view).toContain("Card deleted.");

    // Profile: needs a birthday page first, then validates and saves.
    expect((await profile(form({ name: "New Name", month: "05", day: "10" }, "application/json"))).status).toBe(404);
    await followRedirect(() =>
      optin(form({ full_name: "Test Sender", month: "12", day: "20", consent_checkbox_1: "on", consent_checkbox_2: "on" }))
    );
    expect((await profile(form({ name: "", month: "05", day: "10" }))).headers.get("location")).toBe(
      "http://localhost/dashboard?notice=profile_name"
    );
    expect((await profile(form({ name: "<b>x</b>", month: "05", day: "10" }, "application/json"))).status).toBe(400);
    expect((await profile(form({ name: "Test Sender", month: "02", day: "30" }, "application/json"))).status).toBe(400);
    expect((await profile(form({ name: "Test Sender", month: "13", day: "01" }, "application/json"))).status).toBe(400);
    const saved = await profile(form({ name: "  Test   Sender Two ", month: "06", day: "15" }));
    expect(saved.headers.get("location")).toBe("http://localhost/dashboard?notice=profile_saved");
    const updated = await prisma.user.findUniqueOrThrow({ where: { firebaseUid: SENDER.uid }, include: { birthday_page: true } });
    expect(updated).toMatchObject({ name: "Test Sender Two", birthday_mm_dd: "06-15" });
    const { birthdayUnlockDate } = await import("@/lib/dates");
    expect(updated.birthday_page?.unlockAt.toISOString()).toBe(birthdayUnlockDate("06-15").toISOString());
    session.current = null;
    expect((await profile(form({ name: "X", month: "01", day: "01" }, "application/json"))).status).toBe(401);
    session.current = SENDER;
    view = await render("profile_saved");
    expect(view).toContain("Test Sender Two");
    expect(view).toContain("June 15");
    expect(view).toContain("Profile saved.");
    expect(view).toContain("Birthday messages from friends");
    expect(view).toContain(`https://joydrop-iota.vercel.app/invite/${updated.id}`);
    expect(await render("<script>")).not.toContain("<script>");

    // Export lists sent cards; erase takes them off the dashboard but leaves the card for its recipient.
    const exported = await (await exportMe()).json();
    expect(exported.sent_cards).toHaveLength(1);
    expect((await erase(form({ confirm: "on" }, "application/json"))).status).toBe(200);
    expect(await prisma.card.findUniqueOrThrow({ where: { id: signedIn.card.id } })).toMatchObject({
      senderUid: null,
      status: "active",
      claimedByUid: OTHER.uid
    });
    await prisma.card.deleteMany({ where: { senderName: "TEST DATA sender" } });
  });
});
