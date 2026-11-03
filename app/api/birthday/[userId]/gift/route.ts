import { databaseUnavailableResponse, hasDatabaseUrl } from "@/lib/database";
import { clientIp, seeOther } from "@/lib/http";
import { LIMITS, parseAmount, tooLong } from "@/lib/input";
import { findWritableBirthdayPage } from "@/lib/open-page";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/validation";

/** Adds an entry to the gift tracker. No payment is processed. */
export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  if (!hasDatabaseUrl()) {
    return databaseUnavailableResponse();
  }

  if (!checkRateLimit(`gift:${clientIp(request)}`)) {
    return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const formData = await request.formData();
  const fromName = String(formData.get("from_name") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const amount = parseAmount(formData.get("amount"));
  const goal = parseAmount(formData.get("goal"));

  if (!fromName || !title) {
    return Response.json({ error: "From and gift are required." }, { status: 400 });
  }

  if (
    tooLong(fromName, LIMITS.name) ||
    tooLong(title, LIMITS.giftTitle) ||
    amount === null ||
    goal === null
  ) {
    return Response.json(
      { error: `Check the name, gift (max ${LIMITS.giftTitle} characters), and amounts (0 to ${LIMITS.giftAmountMax}).` },
      { status: 400 }
    );
  }

  const page = await findWritableBirthdayPage(params.userId);
  if (!page) {
    return Response.json({ error: "This birthday page is not open for gifts." }, { status: 404 });
  }

  await prisma.gift.create({
    data: {
      user_id: page.userId,
      from_name: fromName,
      title,
      amount,
      goal
    }
  });

  return seeOther(request, `/birthday/${page.userId}`);
}
