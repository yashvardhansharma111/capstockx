import { redirect } from "next/navigation";
import { getUserFromSession } from "@/lib/auth";
import { AppDataProvider, type Me } from "@/components/app/AppDataContext";
import { AppShell } from "@/components/app/AppShell";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const rawUser = await getUserFromSession();
  if (!rawUser) {
    redirect("/");
  }

  const u = rawUser as unknown as Record<string, unknown> & {
    _id?: unknown;
    passwordHash?: string;
    documents?: { photo?: { data?: unknown } };
  };

  const { passwordHash: _p, documents, _id, ...rest } = u;
  void _p;

  const user: Me = {
    ...(rest as Me),
    _id: _id ? String(_id) : undefined,
    tradingBalance: (rest.tradingBalance as number | undefined) ?? 0,
    margin: (rest.margin as number | undefined) ?? 0,
    hasProfilePhoto: Boolean(documents?.photo?.data),
  };

  return (
    <AppDataProvider initialUser={user}>
      <AppShell>{children}</AppShell>
    </AppDataProvider>
  );
}
