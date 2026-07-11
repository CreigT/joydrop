import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !message) {
    return Response.json({ error: "Name and message are required." }, { status: 400 });
  }

  await prisma.guestbookEntry.create({
    data: {
      user_id: params.userId,
      name,
      message,
      reactions: ["🎉", "💛", "✨"]
    }
  });

  redirect(`/birthday/${params.userId}`);
}
