import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export function useGroups() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("*, participants(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createGroup = useMutation({
    mutationFn: async ({ name, description, participants }: { name: string; description?: string; participants: string[] }) => {
      const { data: group, error } = await supabase
        .from("groups")
        .insert({ name, description, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;

      if (participants.length > 0) {
        const { error: pError } = await supabase.from("participants").insert(
          participants.map((p) => ({ group_id: group.id, name: p }))
        );
        if (pError) throw pError;
      }
      return group;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      toast({ title: "Group created!" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      toast({ title: "Group deleted" });
    },
  });

  return { groups: groupsQuery.data ?? [], isLoading: groupsQuery.isLoading, createGroup, deleteGroup };
}
