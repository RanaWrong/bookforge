import { Workspace } from "../../components/workspace";

export const runtime = "nodejs";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  return <Workspace initialLocale={lang === "en" ? "en" : "bn"} />;
}
