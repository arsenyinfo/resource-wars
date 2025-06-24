
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { useState } from 'react';
// Using type-only import for better TypeScript compliance
import type { Building, Player } from '../../../server/src/schema';

interface UpgradeBuildingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: number;
  buildings: Building[];
  playerResources?: Player;
  onSuccess: () => Promise<void>;
}

// Base building costs for upgrade calculation
const BASE_COSTS = {
  SAWMILL: { wood: 50, stone: 25, food: 0, gold: 0 },
  QUARRY: { wood: 75, stone: 30, food: 0, gold: 0 },
  FARM: { wood: 40, stone: 20, food: 0, gold: 10 },
  BARRACKS: { wood: 100, stone: 50, food: 0, gold: 25 },
  WALLS: { wood: 150, stone: 100, food: 0, gold: 0 },
  MARKET: { wood: 80, stone: 40, food: 0, gold: 50 }
} as const;

const BUILDING_ICONS = {
  SAWMILL: '🪵',
  QUARRY: '🪨',
  FARM: '🌾',
  BARRACKS: '⚔️',
  WALLS: '🏰',
  MARKET: '🏪'
} as const;

export function UpgradeBuildingDialog({ 
  open, 
  onOpenChange, 
  playerId, 
  buildings,
  playerResources,
  onSuccess 
}: UpgradeBuildingDialogProps) {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate upgrade cost based on building level (base cost * level * 1.5)
  const calculateUpgradeCost = (building: Building) => {
    const baseCosts = BASE_COSTS[building.type];
    const multiplier = building.level * 1.5;
    
    return {
      wood: Math.ceil(baseCosts.wood * multiplier),
      stone: Math.ceil(baseCosts.stone * multiplier),
      food: Math.ceil(baseCosts.food * multiplier),
      gold: Math.ceil(baseCosts.gold * multiplier)
    };
  };

  const canAffordUpgrade = (building: Building): boolean => {
    if (!playerResources) return false;
    const costs = calculateUpgradeCost(building);
    return (
      playerResources.wood >= costs.wood &&
      playerResources.stone >= costs.stone &&
      playerResources.food >= costs.food &&
      playerResources.gold >= costs.gold
    );
  };

  const handleUpgrade = async () => {
    if (!selectedBuildingId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await trpc.upgradeBuilding.mutate({
        playerId,
        buildingId: parseInt(selectedBuildingId)
      });
      
      await onSuccess();
      setSelectedBuildingId(''); // Reset form
    } catch (error) {
      console.error('Failed to upgrade building:', error);
      setError('Failed to upgrade building. Check if you have enough resources.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedBuilding = buildings.find((b: Building) => b.id.toString() === selectedBuildingId);
  const upgradeCosts = selectedBuilding ? calculateUpgradeCost(selectedBuilding) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>⬆️ Upgrade Building</DialogTitle>
          <DialogDescription>
            Select a building to upgrade. Higher level buildings produce more resources.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {buildings.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              🏗️ No buildings to upgrade. Build some first!
            </div>
          ) : (
            <>
              <div className="space-y-2">
                
                <Label>Building to Upgrade</Label>
                <Select 
                  value={selectedBuildingId} 
                  onValueChange={setSelectedBuildingId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a building to upgrade" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((building: Building) => (
                      <SelectItem 
                        key={building.id} 
                        value={building.id.toString()}
                        disabled={!canAffordUpgrade(building)}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="flex items-center gap-2">
                            {BUILDING_ICONS[building.type]} {building.type.toLowerCase()}
                            <Badge variant="secondary" className="ml-2">Lv.{building.level}</Badge>
                          </span>
                          {!canAffordUpgrade(building) && (
                            <span className="text-red-500 text-xs ml-2">❌ Can't afford</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBuilding && upgradeCosts && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{BUILDING_ICONS[selectedBuilding.type]}</span>
                          <span className="font-medium">{selectedBuilding.type.toLowerCase()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Level {selectedBuilding.level}</Badge>
                          <span className="text-sm text-gray-500">➡️</span>
                          <Badge variant="default">Level {selectedBuilding.level + 1}</Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Upgrade Cost:</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {upgradeCosts.wood > 0 && (
                            <div className={`flex items-center gap-1 ${
                              playerResources && playerResources.wood >= upgradeCosts.wood 
                                ? 'text-green-600' : 'text-red-600'
                            }`}>
                              🌳 {upgradeCosts.wood}
                            </div>
                          )}
                          {upgradeCosts.stone > 0 && (
                            <div className={`flex items-center gap-1 ${
                              playerResources && playerResources.stone >= upgradeCosts.stone 
                                ? 'text-green-600' : 'text-red-600'
                            }`}>
                              🪨 {upgradeCosts.stone}
                            </div>
                          )}
                          {upgradeCosts.food > 0 && (
                            <div className={`flex items-center gap-1 ${
                              playerResources && playerResources.food >= upgradeCosts.food 
                                ? 'text-green-600' : 'text-red-600'
                            }`}>
                              🍞 {upgradeCosts.food}
                            </div>
                          )}
                          {upgradeCosts.gold > 0 && (
                            <div className={`flex items-center gap-1 ${
                              playerResources && playerResources.gold >= upgradeCosts.gold 
                                ? 'text-green-600' : 'text-red-600'
                            }`}>
                              💰 {upgradeCosts.gold}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {error && (
                <div className="text-red-600 text-sm">⚠️ {error}</div>
              )}
            </>
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
            onClick={handleUpgrade}
            disabled={!selectedBuilding || !canAffordUpgrade(selectedBuilding) || isLoading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isLoading ? '⬆️ Upgrading...' : '✨ Upgrade'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
