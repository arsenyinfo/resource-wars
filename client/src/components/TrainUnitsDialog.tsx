
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';
import { useState } from 'react';
// Using type-only import for better TypeScript compliance
import type { Player } from '../../../server/src/schema';

interface TrainUnitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: number;
  playerResources?: Player;
  hasBarracks: boolean;
  onSuccess: () => Promise<void>;
}

// Unit costs and descriptions
const UNIT_INFO = {
  WARRIOR: {
    name: '⚔️ Warrior',
    description: 'Strong melee fighters for close combat',
    costs: { wood: 0, stone: 0, food: 15, gold: 10 },
    icon: '⚔️'
  },
  ARCHER: {
    name: '🏹 Archer',
    description: 'Ranged fighters with bow and arrows',
    costs: { wood: 5, stone: 0, food: 20, gold: 15 },
    icon: '🏹'
  },
  SCOUT: {
    name: '🕵️ Scout',
    description: 'Fast units for reconnaissance and exploration',
    costs: { wood: 0, stone: 0, food: 10, gold: 5 },
    icon: '🕵️'
  }
} as const;

type UnitType = keyof typeof UNIT_INFO;

export function TrainUnitsDialog({ 
  open, 
  onOpenChange, 
  playerId, 
  playerResources,
  hasBarracks,
  onSuccess 
}: TrainUnitsDialogProps) {
  const [selectedType, setSelectedType] = useState<UnitType | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateTotalCost = (unitType: UnitType, qty: number) => {
    const unitCosts = UNIT_INFO[unitType].costs;
    return {
      wood: unitCosts.wood * qty,
      stone: unitCosts.stone * qty,
      food: unitCosts.food * qty,
      gold: unitCosts.gold * qty
    };
  };

  const canAfford = (unitType: UnitType, qty: number): boolean => {
    if (!playerResources) return false;
    const totalCosts = calculateTotalCost(unitType, qty);
    return (
      playerResources.wood >= totalCosts.wood &&
      playerResources.stone >= totalCosts.stone &&
      playerResources.food >= totalCosts.food &&
      playerResources.gold >= totalCosts.gold
    );
  };

  const getMaxAffordable = (unitType: UnitType): number => {
    if (!playerResources) return 0;
    const unitCosts = UNIT_INFO[unitType].costs;
    
    const maxByWood = unitCosts.wood > 0 ? Math.floor(playerResources.wood / unitCosts.wood) : Infinity;
    const maxByStone = unitCosts.stone > 0 ? Math.floor(playerResources.stone / unitCosts.stone) : Infinity;
    const maxByFood = unitCosts.food > 0 ? Math.floor(playerResources.food / unitCosts.food) : Infinity;
    const maxByGold = unitCosts.gold > 0 ? Math.floor(playerResources.gold / unitCosts.gold) : Infinity;
    
    return Math.min(maxByWood, maxByStone, maxByFood, maxByGold);
  };

  const handleTrain = async () => {
    if (!selectedType || quantity <= 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await trpc.trainUnits.mutate({
        playerId,
        type: selectedType,
        quantity
      });
      
      await onSuccess();
      setSelectedType(''); // Reset form
      setQuantity(1);
    } catch (error) {
      console.error('Failed to train units:', error);
      setError('Failed to train units. Check if you have enough resources and a Barracks.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedUnit = selectedType ? UNIT_INFO[selectedType] : null;
  const totalCosts = selectedUnit ? calculateTotalCost(selectedType as UnitType, quantity) : null;
  const maxAffordable = selectedType ? getMaxAffordable(selectedType as UnitType) : 0;

  if (!hasBarracks) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>🎯 Train Units</DialogTitle>
          </DialogHeader>
          
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🏗️</div>
            <p className="text-gray-600 mb-4">
              You need a <strong>Barracks</strong> to train military units!
            </p>
            <p className="text-sm text-amber-600">
              💡 Build a Barracks first, then return here to train your army.
            </p>
          </div>
          
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>🎯 Train Units</DialogTitle>
          <DialogDescription>
            Train military units to defend your settlement and expand your territory.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Unit Type</Label>
            <Select 
              value={selectedType} 
              onValueChange={(value: UnitType) => {
                setSelectedType(value);
                setQuantity(1); // Reset quantity when changing unit type
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a unit type to train" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(UNIT_INFO).map(([type, info]) => (
                  <SelectItem key={type} value={type}>
                    <span>{info.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedUnit && (
            <>
              <div className="space-y-2">
                <Label>Quantity (max: {maxAffordable})</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    max={maxAffordable}
                    value={quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const val = parseInt(e.target.value) || 1;
                      setQuantity(Math.min(Math.max(1, val), maxAffordable));
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(maxAffordable)}
                    disabled={maxAffordable === 0}
                  >
                    Max
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{selectedUnit.icon}</span>
                      <span className="font-medium">{selectedUnit.name.replace(/^\S+\s/, '')}</span>
                    </div>
                    <p className="text-sm text-gray-600">{selectedUnit.description}</p>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">
                        Total Cost ({quantity}x):
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {totalCosts && totalCosts.wood > 0 && (
                          <div className={`flex items-center gap-1 ${
                            playerResources && playerResources.wood >= totalCosts.wood 
                              ? 'text-green-600' : 'text-red-600'
                          }`}>
                            🪵 {totalCosts.wood}
                          </div>
                        )}
                        {totalCosts && totalCosts.stone > 0 && (
                          <div className={`flex items-center gap-1 ${
                            playerResources && playerResources.stone >= totalCosts.stone 
                              ? 'text-green-600' : 'text-red-600'
                          }`}>
                            🪨 {totalCosts.stone}
                          </div>
                        )}
                        {totalCosts && totalCosts.food > 0 && (
                          <div className={`flex items-center gap-1 ${
                            playerResources && playerResources.food >= totalCosts.food 
                              ? 'text-green-600' : 'text-red-600'
                          }`}>
                            🌾 {totalCosts.food}
                          </div>
                        )}
                        {totalCosts && totalCosts.gold > 0 && (
                          <div className={`flex items-center gap-1 ${
                            playerResources && playerResources.gold >= totalCosts.gold 
                              ? 'text-green-600' : 'text-red-600'
                          }`}>
                            🪙 {totalCosts.gold}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {error && (
            <div className="text-red-600 text-sm">⚠️ {error}</div>
          )}
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
            onClick={handleTrain}
            disabled={!selectedType || quantity <= 0 || (selectedType && !canAfford(selectedType as UnitType, quantity)) || isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? '🎯 Training...' : '⚔️ Train'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
