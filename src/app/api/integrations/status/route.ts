import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleSupabase } from "@/lib/supabase/server";

// GET: Get integration status for an org (which providers are connected)
export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  if (!orgId) {
    return NextResponse.json({ error: "org_id requis" }, { status: 400 });
  }

  const serviceSupabase = await createServiceRoleSupabase();

  const { data: tokens } = await serviceSupabase
    .from("integration_tokens")
    .select("provider, account_name, account_url, created_at")
    .eq("organization_id", orgId);

  const integrations: Record<string, { connected: boolean; account_name: string; account_url: string; connected_at: string }> = {};

  for (const provider of ["github", "gitlab", "bitbucket", "jira"]) {
    const token = tokens?.find((t: any) => t.provider === provider);
    integrations[provider] = token
      ? {
          connected: true,
          account_name: token.account_name || "",
          account_url: token.account_url || "",
          connected_at: token.created_at,
        }
      : { connected: false, account_name: "", account_url: "", connected_at: "" };
  }

  return NextResponse.json({ integrations });
}
