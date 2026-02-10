import { useState } from "react";
import { Link } from "react-router-dom";
import { useGroups } from "@/hooks/useGroups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, Trash2, X } from "lucide-react";
import { motion } from "framer-motion";

export default function Groups() {
  const { groups, isLoading, createGroup, deleteGroup } = useGroups();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [participants, setParticipants] = useState<string[]>([""]);

  const handleCreate = () => {
    const validParticipants = participants.filter((p) => p.trim());
    if (!name.trim() || validParticipants.length === 0) return;
    createGroup.mutate(
      { name, description, participants: validParticipants },
      {
        onSuccess: () => {
          setOpen(false);
          setName("");
          setDescription("");
          setParticipants([""]);
        },
      }
    );
  };

  const addParticipantField = () => {
    if (participants.length < 4) setParticipants([...participants, ""]);
  };

  const updateParticipant = (i: number, v: string) => {
    const copy = [...participants];
    copy[i] = v;
    setParticipants(copy);
  };

  const removeParticipantField = (i: number) => {
    setParticipants(participants.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Groups</h1>
          <p className="text-muted-foreground">Manage your expense groups</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Group Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Trip to Paris" />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Summer vacation" />
              </div>
              <div className="space-y-2">
                <Label>Participants (max 4 including you)</Label>
                {participants.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={p} onChange={(e) => updateParticipant(i, e.target.value)} placeholder={`Participant ${i + 1}`} />
                    {participants.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeParticipantField(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {participants.length < 4 && (
                  <Button variant="outline" size="sm" onClick={addParticipantField} className="gap-1">
                    <Plus className="h-3 w-3" /> Add Participant
                  </Button>
                )}
              </div>
              <Button onClick={handleCreate} disabled={createGroup.isPending} className="w-full">
                {createGroup.isPending ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading groups...</div>
      ) : groups.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No groups yet. Create your first one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group, i) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/groups/${group.id}`}>
                <Card className="glass-card hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        deleteGroup.mutate(group.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {group.description && <p className="text-sm text-muted-foreground mb-2">{group.description}</p>}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {group.participants?.length ?? 0} participants
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
