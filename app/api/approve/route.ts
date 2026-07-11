import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentFirebaseUser } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getCurrentFirebaseUser();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const contributionId = String(formData.get("contribution_id") ?? "");
  const surpriseId = String(formData.get("surprise_id") ?? "");
  const scriptText = String(formData.get("script_text") ?? "").trim();

  if (contributionId) {
    const contribution = await prisma.contribution.update({
      where: {
        id: contributionId
      },
      data: {
        isApproved: true
      }
    });

    await prisma.auditLog.create({
      data: {
        action: "contribution_approved",
        user_id: contribution.user_id,
        meta_json: {
          contribution_id: contribution.id
        }
      }
    });

    redirect("/dashboard");
  }

  const surprise = await prisma.surprise.update({
    where: {
      id: surpriseId
    },
    data: {
      script_text: scriptText,
      status: "approved"
    }
  });

  await prisma.auditLog.create({
    data: {
      action: "surprise_approved",
      user_id: surprise.user_id,
      meta_json: {
        surprise_id: surprise.id
      }
    }
  });

  redirect("/dashboard");
}
