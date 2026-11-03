import { databaseUnavailableResponse, hasDatabaseUrl } from "@/lib/database";
import { clientIp, seeOther } from "@/lib/http";
import { LIMITS, tooLong } from "@/lib/input";
import { findWritableBirthdayPage } from "@/lib/open-page";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  if (!hasDatabaseUrl()) {
    return databaseUnavailableResponse();
  }

  if (!checkRateLimit(`guestbook:${clientIp(request)}`)) {
    return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !message) {
    return Response.json({ error: "Name and message are required." }, { status: 400 });
  }

  if (tooLong(name, LIMITS.name) || tooLong(message, LIMITS.guestbookMessage)) {
    return Response.json(
      { error: `Keep the name under ${LIMITS.name} and the message under ${LIMITS.guestbookMessage} characters.` },
      { status: 400 }
    );
  }

  const page = await findWritableBirthdayPage(params.userId);
  if (!page) {
    return Response.json({ error: "This birthday page is not open for guestbook entries." }, { status: 404 });
  }

  await prisma.guestbookEntry.create({
    data: {
      user_id: page.userId,
      name,
      message,
      reactions: ["🎉", "💛", "✨"]
    }
  });

  return seeOther(request, `/birthday/${page.userId}`);
}
