import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  subtitle: string | null;
  estimated_minutes: number | null;
  is_background?: boolean | null;
  content?: string | null;
  audio_url?: string | null;
  order_index?: number | null;
  published?: boolean | null;
}

/**
 * Cached list of all chapters. Chapters change only via Admin, so we cache
 * aggressively across the app. Stays in cache for the whole session.
 */
export function useChapters() {
  return useQuery({
    queryKey: ["book_chapters"],
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async (): Promise<Chapter[]> => {
      const { data, error } = await supabase
        .from("book_chapters")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as Chapter[];
    },
  });
}