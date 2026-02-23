"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function Home() {
  return (
    <AuthGuard>
      <MainLayout />
    </AuthGuard>
  );
}
