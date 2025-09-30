/**
 * DEPRECATED: This hook is no longer used.
 * The game_flow_queue table has been removed in the database reset.
 * Game flow is now handled directly through RPC functions and real-time subscriptions.
 */
export const useGameQueueProcessor = (_roomId: string | null) => {
  const processQueue = async () => {
    // No-op: Queue system removed
  };

  const processImmediately = async () => {
    // No-op: Queue system removed
  };

  return { processQueue, processImmediately };
};
