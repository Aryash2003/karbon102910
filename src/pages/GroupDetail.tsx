import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useExpenses } from "@/hooks/useExpenses";
import { computeBalances } from "@/lib/balanceEngine";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Trash2, ArrowRight, DollarSign, TrendingUp, Users } from "lucide-react";
import { motion } from "framer-motion";
import type { Database } from "@/integrations/supabase/types";

type SplitMode = Database["public"]["Enums"]["split_mode"];

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const groupQuery = useQuery({
    queryKey: ["group", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("*, participants(*)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Group not found");
      return data;
    },
    enabled: !!user && !!id,
  });

  const { expenses, isLoading: expLoading, createExpense, deleteExpense } = useExpenses(id);

  const group = groupQuery.data;
  const participants = group?.participants ?? [];

  const participantNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of participants) map[p.id] = p.name;
    return map;
  }, [participants]);

  const balances = useMemo(() => {
    if (!expenses.length) return [];
    return computeBalances(
      expenses.map((e) => ({
        payer_id: e.payer_id,
        amount: e.amount,
        expense_splits: e.expense_splits.map((s) => ({ participant_id: s.participant_id, amount: s.amount })),
      })),
      participantNames
    );
  }, [expenses, participantNames]);

  const totalSpent = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  // Add expense dialog state
  const [expOpen, setExpOpen] = useState(false);
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [expPayer, setExpPayer] = useState("");
  const [expSplitMode, setExpSplitMode] = useState<SplitMode>("equal");
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

  const [searchTerm, setSearchTerm] = useState("");

  const filteredExpenses = useMemo(() => {
    if (!searchTerm.trim()) return expenses;
    const term = searchTerm.toLowerCase();
    return expenses.filter(
      (e) =>
        e.description.toLowerCase().includes(term) ||
        (e.participants as any)?.name?.toLowerCase().includes(term)
    );
  }, [expenses, searchTerm]);

  // Add participant
  const [newParticipantName, setNewParticipantName] = useState("");
  const addParticipant = useMutation({
    mutationFn: async (name: string) => {
      if (participants.length >= 4) throw new Error("Max 4 participants");
      const { error } = await supabase.from("participants").insert({ group_id: id!, name });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group", id] });
      setNewParticipantName("");
      toast({ title: "Participant added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleCreateExpense = () => {
    const amount = parseFloat(expAmount);
    if (!expDesc || !amount || !expPayer) return;

    let splits: { participant_id: string; amount: number }[] = [];

    if (expSplitMode === "equal") {
      const share = Math.floor((amount * 100) / participants.length) / 100;
      const remainder = Math.round((amount - share * participants.length) * 100) / 100;
      splits = participants.map((p, i) => ({
        participant_id: p.id,
        amount: i === 0 ? share + remainder : share,
      }));
    } else if (expSplitMode === "custom") {
      splits = participants.map((p) => ({
        participant_id: p.id,
        amount: parseFloat(customSplits[p.id] || "0"),
      }));
    } else if (expSplitMode === "percentage") {
      splits = participants.map((p) => ({
        participant_id: p.id,
        amount: Math.round(amount * (parseFloat(customSplits[p.id] || "0") / 100) * 100) / 100,
      }));
    }

    createExpense.mutate(
      { group_id: id!, description: expDesc, amount, date: expDate, payer_id: expPayer, split_mode: expSplitMode, splits },
      {
        onSuccess: () => {
          setExpOpen(false);
          setExpDesc("");
          setExpAmount("");
          setExpPayer("");
          setCustomSplits({});
        },
      }
    );
  };

  if (groupQuery.isLoading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!group) return <div className="text-center py-12 text-muted-foreground">Group not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/groups")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
          {group.description && <p className="text-sm text-muted-foreground">{group.description}</p>}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
              <DollarSign className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-xl font-bold text-foreground">₹{totalSpent.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-accent">
              <TrendingUp className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Settlements</p>
              <p className="text-xl font-bold text-foreground">{balances.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <Users className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Participants</p>
              <p className="text-xl font-bold text-foreground">{participants.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Dialog open={expOpen} onOpenChange={setExpOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 ml-auto">
                  <Plus className="h-4 w-4" /> Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Expense</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="Dinner at restaurant" />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (₹)</Label>
                    <Input type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Paid by</Label>
                    <Select value={expPayer} onValueChange={setExpPayer}>
                      <SelectTrigger><SelectValue placeholder="Select payer" /></SelectTrigger>
                      <SelectContent>
                        {participants.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Split Mode</Label>
                    <Select value={expSplitMode} onValueChange={(v) => setExpSplitMode(v as SplitMode)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equal">Equal</SelectItem>
                        <SelectItem value="custom">Custom Amount</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {expSplitMode !== "equal" && (
                    <div className="space-y-2">
                      <Label>{expSplitMode === "percentage" ? "Percentages" : "Custom Amounts"}</Label>
                      {participants.map((p) => (
                        <div key={p.id} className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground w-24 truncate">{p.name}</span>
                          <Input
                            type="number"
                            value={customSplits[p.id] || ""}
                            onChange={(e) => setCustomSplits({ ...customSplits, [p.id]: e.target.value })}
                            placeholder={expSplitMode === "percentage" ? "%" : "₹"}
                            min="0"
                            step="0.01"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <Button onClick={handleCreateExpense} disabled={createExpense.isPending} className="w-full">
                    {createExpense.isPending ? "Adding..." : "Add Expense"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {filteredExpenses.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-8 text-center text-muted-foreground">
                No expenses yet. Add your first one!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredExpenses.map((exp, i) => (
                <motion.div key={exp.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card className="glass-card">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{exp.description}</p>
                        <p className="text-sm text-muted-foreground">
                          Paid by {(exp.participants as any)?.name ?? "Unknown"} · {new Date(exp.date).toLocaleDateString()} · {exp.split_mode}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-foreground">₹{exp.amount.toFixed(2)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteExpense.mutate(exp.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="balances" className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Settlement Suggestions</h2>
          {balances.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-8 text-center text-muted-foreground">
                All settled up! No balances to show.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {balances.map((b, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="glass-card">
                    <CardContent className="flex items-center gap-3 p-4">
                      <span className="font-medium text-destructive">{b.fromName}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-primary">{b.toName}</span>
                      <span className="ml-auto font-bold text-foreground">₹{b.amount.toFixed(2)}</span>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="participants" className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="New participant name"
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              className="max-w-xs"
            />
            <Button
              onClick={() => newParticipantName.trim() && addParticipant.mutate(newParticipantName.trim())}
              disabled={addParticipant.isPending || participants.length >= 4}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          <div className="space-y-2">
            {participants.map((p) => (
              <Card key={p.id} className="glass-card">
                <CardContent className="flex items-center gap-3 p-4">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground"
                    style={{ backgroundColor: p.color || "hsl(160 84% 39%)" }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-foreground">{p.name}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
