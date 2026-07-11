import { notFound } from "next/navigation";
import { formatBirthday } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

const inputClass =
  "w-full rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/20";

export default async function InvitePage({
  params
}: {
  params: { user_id: string };
}) {
  const user = await prisma.user.findFirst({
    where: {
      id: params.user_id,
      soft_delete: false
    }
  });

  if (!user) {
    notFound();
  }

  return (
    <main className="confetti-dots min-h-screen bg-bg px-5 py-10">
      <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.8fr_1fr] lg:items-start">
        <div className="rounded-2xl bg-white/90 p-6 shadow-xl ring-1 ring-white/80">
          <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary via-accent to-secondary font-heading text-4xl font-black text-white shadow-lg">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <h1 className="font-heading text-3xl font-black text-[#30273A]">
            {user.name}
          </h1>
          <p className="mt-3 text-base font-semibold text-[#463B52]">
            Thanks! We&apos;ll beam this on {formatBirthday(user.birthday_mm_dd)}
          </p>
        </div>

        <form
          action="/api/contribute"
          encType="multipart/form-data"
          method="post"
          className="rounded-2xl bg-white/90 p-5 shadow-xl ring-1 ring-white/80 sm:p-7"
        >
          <input name="user_id" type="hidden" value={user.id} />
          <div className="space-y-4">
            <label className="block text-sm font-bold text-[#30273A]">
              Contributor name
              <input className={inputClass} name="contributor_name" required />
            </label>
            <label className="block text-sm font-bold text-[#30273A]">
              Contributor email
              <input
                className={inputClass}
                name="contributor_email"
                required
                type="email"
              />
            </label>
            <label className="block text-sm font-bold text-[#30273A]">
              Type
              <select className={inputClass} name="type" required>
                <option value="text">text</option>
                <option value="voice">voice</option>
                <option value="photo">photo</option>
                <option value="video">video</option>
                <option value="gif">gif</option>
              </select>
            </label>
            <label className="block text-sm font-bold text-[#30273A]">
              Voice record
              <input
                accept="audio/*"
                className={inputClass}
                name="voice_record_button"
                type="file"
              />
            </label>
            <label className="block text-sm font-bold text-[#30273A]">
              Upload video optional
              <input
                accept="video/*"
                className={inputClass}
                name="upload_video_optional"
                type="file"
              />
            </label>
            <label className="block text-sm font-bold text-[#30273A]">
              Upload gif optional
              <input
                accept="image/gif"
                className={inputClass}
                name="upload_gif_optional"
                type="file"
              />
            </label>
            <label className="block text-sm font-bold text-[#30273A]">
              Text message
              <textarea
                className={`${inputClass} min-h-36 resize-y`}
                name="text_message_field"
              />
            </label>
            <label className="block text-sm font-bold text-[#30273A]">
              Upload photo optional
              <input
                accept="image/*"
                className={inputClass}
                name="upload_photo_optional"
                type="file"
              />
            </label>
            <label className="flex gap-3 rounded-2xl bg-bg/70 p-4 text-sm font-semibold leading-relaxed text-[#463B52]">
              <input
                className="mt-1 h-4 w-4 accent-primary"
                name="permission_checkbox"
                required
                type="checkbox"
              />
              I give JoyDrop permission to use my voice/likeness to create a
              birthday surprise for {user.name}
            </label>
            <button
              className="w-full rounded-2xl bg-primary px-5 py-3 font-heading font-black text-white shadow-lg shadow-primary/30"
              type="submit"
            >
              Submit
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
