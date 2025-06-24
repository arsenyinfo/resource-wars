
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
import { trpc } from '@/utils/trpc';
import { useState } from 'react';
// Using type-only import for better TypeScript compliance
import type { Player } from '../../../server/src/schema';

interface BuildBuildingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: number;
  playerResources?: Player;
  onSuccess: () => Promise<void>;
}

// Building costs and descriptions
const BUILDING_INFO = {
  SAWMILL: {
    name: '🪵 Sawmill',
    description: 'Produces wood resources each turn',
    costs: { wood: 50, stone: 25, food: 0, gold: 0 },
    icon: '🪵'
  },
  QUARRY: {
    name: '🪨 Quarry', 
    description: 'Produces stone resources each turn',
    costs: { wood: 75, stone: 30, food: 0, gold: 0 },
    icon: '🪨'
  },
  FARM: {
    name: '🌾 Farm',
    description: 'Produces food resources each turn',
    costs: { wood: 40, stone: 20, food: 0, gold: 10 },
    icon: '🌾'
  },
  BARRACKS: {
    name: '⚔️ Barracks',
    description: 'Required to train military units',
    costs: { wood: 100, stone: 50, food: 0, gold: 25 },
    icon: '⚔️'
  },
  WALLS: {
    name: '🏰 Walls',
    description: 'Provides defense for your settlement',
    costs: { wood: 150, stone: 100, food: 0, gold: 0 },
    icon: '🏰'
  },
  MARKET: {
    name: '🏪 Market',
    description: 'Produces gold resources each turn',
    costs: { wood: 80, stone: 40, food: 0, gold: 50 },
    icon: '🏪'
  }
} as const;

type BuildingType = keyof typeof BUILDING_INFO;

export function BuildBuildingDialog({ 
  open, 
  onOpenChange, 
  playerId, 
  playerResources,
  onSuccess 
}: BuildBuildingDialogProps) {
  const [selectedType, setSelectedType] = useState<BuildingType | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAfford = (buildingType: BuildingType): boolean => {
    if (!playerResources) return false;
    const costs = BUILDING_INFO[buildingType].costs;
    return (
      playerResources.wood >= costs.wood &&
      playerResources.stone >= costs.stone &&
      playerResources.food >= costs.food &&
      playerResources.gold >= costs.gold
    );
  };

  const handleBuild = async () => {
    if (!selectedType) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await trpc.buildBuilding.mutate({
        playerId,
        type: selectedType
      });
      
      await onSuccess();
      setSelectedType(''); // Reset form
    } catch (error) {
      console.error('Failed to build building:', error);
      setError('Failed to build building. Check if you have enough resources.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedBuilding = selectedType ? BUILDING_INFO[selectedType] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>🧱 Build New Building</DialogTitle>
          <DialogDescription>
            Choose a building type to construct in your settlement.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Building Type</Label>
            <Select 
              value={selectedType} 
              onValueChange={(value: BuildingType) => setSelectedType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a building to build" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BUILDING_INFO).map(([type, info]) => (
                  <SelectItem 
                    key={type} 
                    value={type}
                    disabled={!canAfford(type as BuildingType)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{info.name}</span>
                      {!canAfford(type as BuildingType) && (
                        <span className="text-red-500 text-xs ml-2">❌ Can't afford</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBuilding && (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{selectedBuilding.icon}</span>
                    <span className="font-medium">{selectedBuilding.name.replace(/^\S+\s/, '')}</span>
                  </div>
                  <p className="text-sm text-gray-600">{selectedBuilding.description}</p>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Construction Cost:</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {selectedBuilding.costs.wood > 0 && (
                        <div className={`flex items-center gap-1 ${
                          playerResources && playerResources.wood >= selectedBuilding.costs.wood 
                            ? 'text-green-600' : 'text-red-600'
                        }`}>
                          🌳 {selectedBuilding.costs.wood}
                        </div>
                      )}
                      {selectedBuilding.costs.stone > 0 && (
                        <div className={`flex items-center gap-1 ${
                          playerResources && playerResources.stone >= selectedBuilding.costs.stone 
                            ? 'text-green-600' : 'text-red-600'
                        }`}>
                          🪨 {selectedBuilding.costs.stone}
                        </div>
                      )}
                      {selectedBuilding.costs.food > 0 && (
                        <div className={`flex items-center gap-1 ${
                          playerResources && playerResources.food >= selectedBuilding.costs.food 
                            ? 'text-green-600' : 'text-red-600'
                        }`}>
                          🍞 {selectedBuilding.costs.food}
                        </div>
                      )}
                      {selectedBuilding.costs.gold > 0 && (
                        <div className={`flex items-center gap-1 ${
                          playerResources && playerResources.gold >= selectedBuilding.costs.gold 
                            ? 'text-green-600' : 'text-red-600'
                        }`}>
                          💰 {selectedBuilding.costs.gold}
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
            onClick={handleBuild}
            disabled={!selectedType || !canAfford(selectedType) || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? '🧱 Building...' : '🏗️ Build'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
