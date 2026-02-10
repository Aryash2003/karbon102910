import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type SplitMode = Database["public"]["Enums"]["split_mode"];

interface CreateExpenseInput {
  group_id: string;
  description: string;
  amount: number;
  date: string;
  payer_id: string;
  split_mode: SplitMode;
  splits: { participant_id: string; amount: number }[];
}

export function useExpenses(groupId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const expensesQuery = useQuery({
    queryKey: ["expenses", groupId],
    queryFn: async () => {
      let query = supabase
        .from("expenses")
        .select("*, expense_splits(*, participants(name, color)), participants!expenses_payer_id_fkey(name, color)")
        .order("date", { ascending: false });
      if (groupId) query = query.eq("group_id", groupId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createExpense = useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      const { splits, ...expenseData } = input;
      const { data: expense, error } = await supabase
        .from("expenses")
        .insert(expenseData)
        .select()
        .single();
      if (error) throw error;

      const { error: sError } = await supabase.from("expense_splits").insert(
        splits.map((s) => ({ expense_id: expense.id, ...s }))
      );
      if (sError) throw sError;
      return expense;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Expense added!" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Expense deleted" });
    },
  });

  return { expenses: expensesQuery.data ?? [], isLoading: expensesQuery.isLoading, createExpense, deleteExpense };
}
