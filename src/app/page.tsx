"use client";

import { useStore } from "@/store/useStore";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function Home() {
  const isOnboarded = useStore((s) => s.isOnboarded);

  return (
    <AuthGuard>
      {!isOnboarded ? <OnboardingFlow /> : <MainLayout />}
    </AuthGuard>
  );
}
