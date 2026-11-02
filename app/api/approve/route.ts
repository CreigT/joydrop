import { redirect } from "next/navigation";
import { databaseUnavailableResponse, hasDatabaseUrl } from "@/lib/database";
import { prisma } from "@/lib/prisma";
import { getCurrentFirebaseUser } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getCurrentFirebaseUser();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasDatabaseUrl()) {
    return databaseUnavailableResponse();
  }

  const formData = await request.formData();
  const contributionId = String(formData.get("contribution_id") ?? "");
  const surpriseId = String(formData.get("surprise_id") ?? "");
  const scriptText = String(formData.get("script_text") ?? "").trim();

  if (contributionId) {
    const contribution = await prisma.contribution.findFirst({
      where: {
        id: contributionId,
        user: {
          firebaseUid: session.uid,
          soft_delete: false
        }
      }
    });

    if (!contribution) {
      return Response.json({ error: "Contribution not found or access denied." }, { status: 403 });
    }

    const updated = await prisma.contribution.update({
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
        user_id: updated.user_id,
        meta_json: {
          contribution_id: updated.id
        }
      }
    });

    redirect("/dashboard");
  }

  if (!surpriseId) {
    return Response.json({ error: "Missing contribution_id or surprise_id." }, { status: 400 });
  }

  const surprise = await prisma.surprise.findFirst({
    where: {
      id: surpriseId,
      user: {
        firebaseUid: session.uid,
        soft_delete: false
      }
    }
  });

  if (!surprise) {
    return Response.json({ error: "Surprise not found or access denied." }, { status: 403 });
  }

  const updatedSurprise = await prisma.surprise.update({
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
      user_id: updatedSurprise.user_id,
      meta_json: {
        surprise_id: updatedSurprise.id
      }
    }
  });

  redirect("/dashboard");
}
