import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useGroups } from "@/hooks/useGroups";
import { useExpenses } from "@/hooks/useExpenses";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingDown, TrendingUp, Users, ArrowRight, Plus } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { user } = useAuth();
  const { groups } = useGroups();
  const { expenses } = useExpenses();

  const totalSpent = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const stats = [
    { label: "Total Spent", value: `₹${totalSpent.toFixed(2)}`, icon: DollarSign, gradient: "gradient-primary" },
    { label: "Groups", value: groups.length.toString(), icon: Users, gradient: "bg-secondary" },
    { label: "Expenses", value: expenses.length.toString(), icon: TrendingUp, gradient: "gradient-accent" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your expense overview.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="glass-card">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.gradient}`}>
                  <stat.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Groups</CardTitle>
            <Link to="/groups">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-muted-foreground mb-3">No groups yet</p>
                <Link to="/groups">
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" /> Create Group
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.slice(0, 5).map((g) => (
                  <Link key={g.id} to={`/groups/${g.id}`}>
                    <div className="flex items-center justify-between rounded-lg p-3 hover:bg-secondary/50 transition-colors">
                      <div>
                        <p className="font-medium text-foreground">{g.name}</p>
                        <p className="text-sm text-muted-foreground">{g.participants?.length ?? 0} participants</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">No expenses recorded yet</p>
            ) : (
              <div className="space-y-2">
                {expenses.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-lg p-3 hover:bg-secondary/50 transition-colors">
                    <div>
                      <p className="font-medium text-foreground">{e.description}</p>
                      <p className="text-sm text-muted-foreground">{new Date(e.date).toLocaleDateString()}</p>
                    </div>
                    <span className="font-bold text-foreground">₹{e.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
