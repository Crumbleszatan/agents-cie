import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleSupabase } from "@/lib/supabase/server";

const TOKEN_URLS: Record<string, string> = {
  github: "https://github.com/login/oauth/access_token",
  gitlab: "https://gitlab.com/oauth/token",
  bitbucket: "https://bitbucket.org/site/oauth2/access_token",
  jira: "https://auth.atlassian.com/oauth/token",
};

function getEnvKeys(provider: string) {
  const prefix = provider.toUpperCase();
  return {
    clientId: process.env[`${prefix}_CLIENT_ID`] || "",
    clientSecret: process.env[`${prefix}_CLIENT_SECRET`] || "",
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const tokenUrl = TOKEN_URLS[provider];
  if (!tokenUrl) {
    return NextResponse.json({ error: "Provider non supporté" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json({ error: "Code ou state manquant" }, { status: 400 });
  }

  // Decode state
  let stateData: { orgId: string; projectId?: string };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    return NextResponse.json({ error: "State invalide" }, { status: 400 });
  }

  // Verify user auth
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/login`);
  }

  const { clientId, clientSecret } = getEnvKeys(provider);
  const origin = new URL(request.url).origin;
  const callbackUrl = `${origin}/api/integrations/${provider}/callback`;

  // Exchange code for token
  let tokenData: any;
  try {
    const body: Record<string, string> = {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl,
    };

    if (provider === "github") {
      body.grant_type = "authorization_code";
    } else if (provider === "gitlab" || provider === "jira") {
      body.grant_type = "authorization_code";
    } else if (provider === "bitbucket") {
      body.grant_type = "authorization_code";
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    if (provider === "github") {
      headers["Accept"] = "application/json";
    }
    if (provider === "bitbucket") {
      // Bitbucket uses Basic auth
      headers["Authorization"] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
      delete body.client_id;
      delete body.client_secret;
    }

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers,
      body: new URLSearchParams(body),
    });

    tokenData = await tokenRes.json();

    if (tokenData.error || (!tokenData.access_token && !tokenData.token)) {
      console.error("Token exchange failed:", tokenData);
      return NextResponse.redirect(
        `${origin}/dashboard/project/${stateData.projectId || ""}?error=oauth_failed&provider=${provider}`
      );
    }
  } catch (err) {
    console.error("Token exchange error:", err);
    return NextResponse.redirect(
      `${origin}/dashboard/project/${stateData.projectId || ""}?error=oauth_failed&provider=${provider}`
    );
  }

  const accessToken = tokenData.access_token || tokenData.token;
  const refreshToken = tokenData.refresh_token || null;
  const expiresIn = tokenData.expires_in;
  const tokenExpiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  // Get account info
  let accountName = "";
  let accountUrl = "";
  try {
    if (provider === "github") {
      const res = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      });
      const u = await res.json();
      accountName = u.login;
      accountUrl = u.html_url;
    } else if (provider === "gitlab") {
      const res = await fetch("https://gitlab.com/api/v4/user", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const u = await res.json();
      accountName = u.username;
      accountUrl = u.web_url;
    } else if (provider === "bitbucket") {
      const res = await fetch("https://api.bitbucket.org/2.0/user", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const u = await res.json();
      accountName = u.username || u.display_name;
      accountUrl = u.links?.html?.href || "";
    } else if (provider === "jira") {
      // Get accessible resources (sites)
      const res = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      });
      const sites = await res.json();
      if (sites.length > 0) {
        accountName = sites[0].name;
        accountUrl = sites[0].url;
      }
    }
  } catch {}

  // Store token in DB
  const serviceSupabase = await createServiceRoleSupabase();

  await serviceSupabase.from("integration_tokens").upsert(
    {
      organization_id: stateData.orgId,
      provider,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: tokenExpiresAt,
      account_name: accountName,
      account_url: accountUrl,
      scopes: tokenData.scope || "",
      created_by: user.id,
    },
    { onConflict: "organization_id,provider" }
  );

  // Redirect back to project settings
  const redirectPath = stateData.projectId
    ? `/dashboard/project/${stateData.projectId}?connected=${provider}`
    : `/dashboard?connected=${provider}`;

  return NextResponse.redirect(`${origin}${redirectPath}`);
}
