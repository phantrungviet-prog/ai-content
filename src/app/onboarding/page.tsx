import { redirect } from "next/navigation";
import { signOutAction } from "@/app/admin/actions";
import { AuthCard } from "@/components/AuthCard";
import { requireUser } from "@/lib/auth";
import { siteUrl } from "@/lib/site-url";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const { supabase, user, isAdmin } = await requireUser();
  // The super admin creates ownerless shops from /admin instead.
  if (isAdmin) redirect("/admin");
  const { data: own } = await supabase.from("clients").select("id").eq("owner_id", user.id).maybeSingle();
  if (own) redirect(`/admin/clients/${own.id}`);

  return (
    <AuthCard
      title="Tạo cửa hàng của bạn"
      footer={
        <form action={signOutAction}>
          {user.email} ·{" "}
          <button className="text-indigo-700 hover:underline">Đăng xuất</button>
        </form>
      }
    >
      <OnboardingForm siteUrl={await siteUrl()} />
    </AuthCard>
  );
}
