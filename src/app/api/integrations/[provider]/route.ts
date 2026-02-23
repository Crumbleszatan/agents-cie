import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleSupabase } from "@/lib/supabase/server";

// OAuth config per provider
const OAUTH_CONFIG: Record<string, { authUrl: string; tokenUrl: string; scopes: string }> = {
  github: {
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: "repo read:org read:user",
  },
  gitlab: {
    authUrl: "https://gitlab.com/oauth/authorize",
    tokenUrl: "https://gitlab.com/oauth/token",
    scopes: "read_api read_user read_repository",
  },
  bitbucket: {
    authUrl: "https://bitbucket.org/site/oauth2/authorize",
    tokenUrl: "https://bitbucket.org/site/oauth2/access_token",
    scopes: "repository account",
  },
  jira: {
    authUrl: "https://auth.atlassian.com/authorize",
    tokenUrl: "https://auth.atlassian.com/oauth/token",
    scopes: "read:jira-work read:jira-user offline_access",
  },
};

function getEnvKeys(provider: string) {
  const prefix = provider.toUpperCase();
  return {
    clientId: process.env[`${prefix}_CLIENT_ID`] || "",
    clientSecret: process.env[`${prefix}_CLIENT_SECRET`] || "",
  };
}

// GET: Redirect to OAuth provider
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const config = OAUTH_CONFIG[provider];
  if (!config) {
    return NextResponse.json({ error: "Provider non supporté" }, { status: 400 });
  }

  const { clientId } = getEnvKeys(provider);
  if (!clientId) {
    return NextResponse.json(
      { error: `${provider} OAuth non configuré (CLIENT_ID manquant)` },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  const projectId = searchParams.get("project_id");

  if (!orgId) {
    return NextResponse.json({ error: "org_id requis" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const callbackUrl = `${origin}/api/integrations/${provider}/callback`;
  const state = Buffer.from(JSON.stringify({ orgId, projectId })).toString("base64url");

  const authParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    state,
    response_type: "code",
    scope: config.scopes,
  });

  // Jira needs audience param
  if (provider === "jira") {
    authParams.set("audience", "api.atlassian.com");
    authParams.set("prompt", "consent");
  }

  return NextResponse.redirect(`${config.authUrl}?${authParams.toString()}`);
}

// DELETE: Disconnect integration
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

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

  const { error } = await serviceSupabase
    .from("integration_tokens")
    .delete()
    .eq("organization_id", orgId)
    .eq("provider", provider);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
