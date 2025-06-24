
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import { BuildBuildingDialog } from './components/BuildBuildingDialog';
import { UpgradeBuildingDialog } from './components/UpgradeBuildingDialog';
import { TrainUnitsDialog } from './components/TrainUnitsDialog';
import { InitializePlayerDialog } from './components/InitializePlayerDialog';
// Using type-only import for better TypeScript compliance
import type { PlayerState, Building, Unit } from '../../server/src/schema';

function App() {
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [showBuildDialog, setShowBuildDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showTrainDialog, setShowTrainDialog] = useState(false);
  const [showInitializeDialog, setShowInitializeDialog] = useState(false);

  // useCallback to memoize function used in useEffect
  const loadPlayerState = useCallback(async () => {
    if (!playerId) return;
    
    try {
      setError(null);
      const result = await trpc.getPlayerState.query({ playerId });
      setPlayerState(result);
    } catch (error) {
      console.error('Failed to load player state:', error);
      setError('Failed to load player state. Please try again.');
    }
  }, [playerId]);

  // useEffect with proper dependencies
  useEffect(() => {
    if (playerId) {
      loadPlayerState();
    }
  }, [playerId, loadPlayerState]);

  const handleInitializePlayer = async (userId: string) => {
    setIsLoading(true);
    try {
      setError(null);
      const player = await trpc.initializePlayer.mutate({ userId });
      setPlayerId(player.id);
      setShowInitializeDialog(false);
    } catch (error) {
      console.error('Failed to initialize player:', error);
      setError('Failed to initialize player. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndTurn = async () => {
    if (!playerId) return;
    
    setIsLoading(true);
    try {
      setError(null);
      await trpc.endTurn.mutate({ playerId });
      // Refresh the full player state to get updated resources
      await loadPlayerState();
    } catch (error) {
      console.error('Failed to end turn:', error);
      setError('Failed to end turn. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuildBuilding = async () => {
    await loadPlayerState(); // Refresh state after building
    setShowBuildDialog(false);
  };

  const handleUpgradeBuilding = async () => {
    await loadPlayerState(); // Refresh state after upgrade
    setShowUpgradeDialog(false);
  };

  const handleTrainUnits = async () => {
    await loadPlayerState(); // Refresh state after training
    setShowTrainDialog(false);
  };

  // Show initialization dialog if no player is set
  if (!playerId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-amber-900">⚔️ Resource Wars</CardTitle>
            <CardDescription>Welcome to your settlement management game!</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => setShowInitializeDialog(true)}
              className="w-full bg-amber-600 hover:bg-amber-700"
              size="lg"
            >
              🏰 Start New Game
            </Button>
          </CardContent>
        </Card>

        <InitializePlayerDialog
          open={showInitializeDialog}
          onOpenChange={setShowInitializeDialog}
          onInitialize={handleInitializePlayer}
          isLoading={isLoading}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100">
      <div className="container mx-auto p-4 max-w-6xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-2">⚔️ Resource Wars</h1>
          <p className="text-amber-700">Manage your settlement and build your empire!</p>
        </header>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">⚠️ {error}</p>
            </CardContent>
          </Card>
        )}

        {!playerState ? (
          <div className="text-center">
            <p className="text-amber-700">Loading your settlement...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Resources Dashboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  💰 Resources
                  <Button 
                    onClick={handleEndTurn} 
                    disabled={isLoading}
                    className="ml-auto bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? '⏳ Processing...' : '⏳ End Turn'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-amber-100 rounded-lg">
                    <div className="text-2xl mb-1">🌳</div>
                    <div className="text-2xl font-bold text-amber-800">{playerState.player.wood}</div>
                    <div className="text-sm text-amber-600">Wood</div>
                  </div>
                  <div className="text-center p-4 bg-gray-100 rounded-lg">
                    <div className="text-2xl mb-1">🪨</div>
                    <div className="text-2xl font-bold text-gray-800">{playerState.player.stone}</div>
                    <div className="text-sm text-gray-600">Stone</div>
                  </div>
                  <div className="text-center p-4 bg-green-100 rounded-lg">
                    <div className="text-2xl mb-1">🍞</div>
                    <div className="text-2xl font-bold text-green-800">{playerState.player.food}</div>
                    <div className="text-sm text-green-600">Food</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-100 rounded-lg">
                    <div className="text-2xl mb-1">💰</div>
                    <div className="text-2xl font-bold text-yellow-800">{playerState.player.gold}</div>
                    <div className="text-sm text-yellow-600">Gold</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Buildings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    🏗️ Buildings
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => setShowBuildDialog(true)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        🧱 Build
                      </Button>
                      <Button 
                        onClick={() => setShowUpgradeDialog(true)}
                        size="sm"
                        variant="outline"
                        disabled={playerState.buildings.length === 0}
                      >
                        ⬆️ Upgrade
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {playerState.buildings.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      🏘️ No buildings yet. Start building your settlement!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {playerState.buildings.map((building: Building) => (
                        <div key={building.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">
                              {building.type === 'SAWMILL' && '🪵'}
                              {building.type === 'QUARRY' && '🪨'}
                              {building.type === 'FARM' && '🌾'}
                              {building.type === 'BARRACKS' && '⚔️'}
                              {building.type === 'WALLS' && '🏰'}
                              {building.type === 'MARKET' && '🏪'}
                            </span>
                            <div>
                              <div className="font-medium">{building.type.toLowerCase().replace('_', ' ')}</div>
                              <div className="text-sm text-gray-500">Built {building.created_at.toLocaleDateString()}</div>
                            </div>
                          </div>
                          <Badge variant="secondary">Level {building.level}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Units */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    🛡️ Military Units
                    <Button 
                      onClick={() => setShowTrainDialog(true)}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      disabled={!playerState.buildings.some((b: Building) => b.type === 'BARRACKS')}
                    >
                      🏹 Train
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {playerState.units.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-gray-500 mb-2">🏴 No units trained yet.</p>
                      {!playerState.buildings.some((b: Building) => b.type === 'BARRACKS') && (
                        <p className="text-sm text-amber-600">⚠️ Build a Barracks to train units!</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {playerState.units.map((unit: Unit) => (
                        <div key={unit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">
                              {unit.type === 'WARRIOR' && '🤺'}
                              {unit.type === 'ARCHER' && '🎯'}
                              {unit.type === 'SCOUT' && '🏃'}
                            </span>
                            <div>
                              <div className="font-medium">{unit.type.toLowerCase()}s</div>
                              <div className="text-sm text-gray-500">Trained {unit.created_at.toLocaleDateString()}</div>
                            </div>
                          </div>
                          <Badge variant="default">{unit.quantity}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Game Info */}
            <Card>
              <CardHeader>
                <CardTitle>📊 Game Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>📅 Settlement founded: {playerState.player.created_at.toLocaleDateString()}</p>
                  <p>🏠 Buildings: {playerState.buildings.length}</p>
                  <p>👥 Total units: {playerState.units.reduce((total: number, unit: Unit) => total + unit.quantity, 0)}</p>
                  <Separator className="my-2" />
                  <p className="text-xs text-amber-600">
                    💡 <strong>Tip:</strong> End your turn to collect resources from your buildings!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Dialogs */}
        {playerId && (
          <>
            <BuildBuildingDialog
              open={showBuildDialog}
              onOpenChange={setShowBuildDialog}
              playerId={playerId}
              playerResources={playerState?.player}
              onSuccess={handleBuildBuilding}
            />

            <UpgradeBuildingDialog
              open={showUpgradeDialog}
              onOpenChange={setShowUpgradeDialog}
              playerId={playerId}
              buildings={playerState?.buildings || []}
              playerResources={playerState?.player}
              onSuccess={handleUpgradeBuilding}
            />

            <TrainUnitsDialog
              open={showTrainDialog}
              onOpenChange={setShowTrainDialog}
              playerId={playerId}
              playerResources={playerState?.player}
              hasBarracks={playerState?.buildings.some((b: Building) => b.type === 'BARRACKS') || false}
              onSuccess={handleTrainUnits}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
