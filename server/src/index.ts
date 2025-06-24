
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  initializePlayerInputSchema, 
  getPlayerStateInputSchema,
  endTurnInputSchema,
  buildBuildingInputSchema,
  upgradeBuildingInputSchema,
  trainUnitsInputSchema
} from './schema';

// Import handlers
import { initializePlayer } from './handlers/initialize_player';
import { getPlayerState } from './handlers/get_player_state';
import { endTurn } from './handlers/end_turn';
import { buildBuilding } from './handlers/build_building';
import { upgradeBuilding } from './handlers/upgrade_building';
import { trainUnits } from './handlers/train_units';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // Player Management
  initializePlayer: publicProcedure
    .input(initializePlayerInputSchema)
    .mutation(({ input }) => initializePlayer(input)),
  
  getPlayerState: publicProcedure
    .input(getPlayerStateInputSchema)
    .query(({ input }) => getPlayerState(input)),
  
  // Turn Management
  endTurn: publicProcedure
    .input(endTurnInputSchema)
    .mutation(({ input }) => endTurn(input)),
  
  // Building Actions
  buildBuilding: publicProcedure
    .input(buildBuildingInputSchema)
    .mutation(({ input }) => buildBuilding(input)),
  
  upgradeBuilding: publicProcedure
    .input(upgradeBuildingInputSchema)
    .mutation(({ input }) => upgradeBuilding(input)),
  
  // Unit Actions
  trainUnits: publicProcedure
    .input(trainUnitsInputSchema)
    .mutation(({ input }) => trainUnits(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Resource Wars TRPC server listening at port: ${port}`);
}

start();
