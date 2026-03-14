"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import ReflectionForm from "@/components/reflections/ReflectionForm";
import AuthGuard from "@/components/auth-guard";
import { useAuth } from "@/lib/auth-context";
import { getReflectionById } from "@/lib/reflections";
import { Reflection, ReflectionType } from "@/types";

function ReflectionFormWrapper() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const type = (searchParams.get("type") as ReflectionType) || "daily";
  const editId = searchParams.get("edit");
  const [existing, setExisting] = useState<Reflection | undefined>(undefined);
  const [loading, setLoading] = useState(!!editId);

  useEffect(() => {
    if (!editId || !user) {
      setLoading(false);
      return;
    }
    getReflectionById(editId).then((r) => {
      if (r && r.user_id === user.id) setExisting(r);
      setLoading(false);
    });
  }, [editId, user]);

  if (loading) return <div className="text-muted-foreground text-sm">Loading...</div>;

  return <ReflectionForm initialType={type} existingReflection={existing} />;
}

export default function NewReflectionPage() {
  return (
    <AuthGuard>
      <div className="container mx-auto p-6 max-w-4xl">
        <Suspense fallback={<div>Loading...</div>}>
          <ReflectionFormWrapper />
        </Suspense>
      </div>
    </AuthGuard>
  );
}
