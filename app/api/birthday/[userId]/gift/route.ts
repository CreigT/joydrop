import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const formData = await request.formData();
  const fromName = String(formData.get("from_name") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const goal = Number(formData.get("goal") ?? 0);

  if (!fromName || !title) {
    return Response.json({ error: "From and gift are required." }, { status: 400 });
  }

  await prisma.gift.create({
    data: {
      user_id: params.userId,
      from_name: fromName,
      title,
      amount: Number.isFinite(amount) ? amount : 0,
      goal: Number.isFinite(goal) ? goal : 0
    }
  });

  redirect(`/birthday/${params.userId}`);
}
