
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';

interface InitializePlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInitialize: (userId: string) => Promise<void>;
  isLoading: boolean;
}

export function InitializePlayerDialog({ 
  open, 
  onOpenChange, 
  onInitialize, 
  isLoading 
}: InitializePlayerDialogProps) {
  const [userId, setUserId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;
    
    await onInitialize(userId.trim());
    setUserId(''); // Reset form
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>🏰 Initialize Your Settlement</DialogTitle>
            <DialogDescription>
              Enter a unique player ID to start your Resource Wars adventure. 
              You'll begin with basic resources and can start building your empire!
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userId">Player ID</Label>
              <Input
                id="userId"
                placeholder="Enter your unique player ID"
                value={userId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserId(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!userId.trim() || isLoading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isLoading ? '🏗️ Creating...' : '🚀 Start Game'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
