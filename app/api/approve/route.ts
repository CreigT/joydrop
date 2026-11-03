import { databaseUnavailableResponse, hasDatabaseUrl } from "@/lib/database";
import { seeOther } from "@/lib/http";
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

    return seeOther(request, "/dashboard");
  }

  return Response.json({ error: "Missing contribution_id." }, { status: 400 });
}
