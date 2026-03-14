"use client";
import { Suspense } from "react";
import ReflectionsList from "@/components/reflections/ReflectionsList";
import AuthGuard from "@/components/auth-guard";

export default function ReflectionsPage() {
  return (
    <AuthGuard>
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Reflections</h1>
          <p className="text-muted-foreground">
            Track your progress with daily, weekly, and monthly reflections
          </p>
        </div>
        
        <Suspense fallback={<div>Loading reflections...</div>}>
          <ReflectionsList />
        </Suspense>
      </div>
    </AuthGuard>
  );
}
