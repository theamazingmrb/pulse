"use client";
import { Suspense } from "react";
import { useParams } from "next/navigation";
import ReflectionView from "@/components/reflections/ReflectionView";
import AuthGuard from "@/components/auth-guard";

function ReflectionViewWrapper() {
  const params = useParams();
  const id = params.id as string;
  
  return <ReflectionView reflectionId={id} />;
}

export default function ReflectionPage() {
  return (
    <AuthGuard>
      <div className="container mx-auto p-6 max-w-4xl">
        <Suspense fallback={<div>Loading reflection...</div>}>
          <ReflectionViewWrapper />
        </Suspense>
      </div>
    </AuthGuard>
  );
}
