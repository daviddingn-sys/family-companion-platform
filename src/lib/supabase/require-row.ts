import { notFound } from "next/navigation";
import { isNoRowsError } from "@/lib/supabase/errors";

export function requireSupabaseRow<T>({
  data,
  error,
}: {
  data: T;
  error: unknown;
}): NonNullable<T> {
  if (isNoRowsError(error)) notFound();
  if (error) throw error;
  if (!data) notFound();

  return data as NonNullable<T>;
}
