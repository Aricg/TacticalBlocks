import type { NetworkBattleEndedUpdate } from '../NetworkManager';

export function buildBattleEndedAnnouncement(
  battleEndedUpdate: NetworkBattleEndedUpdate,
): string {
  const reasonText =
    battleEndedUpdate.reason === 'NO_UNITS'
      ? 'enemy had no units'
      : battleEndedUpdate.reason === 'NO_CITIES'
        ? 'enemy had no cities'
        : 'tiebreaker';
  const summaryText =
    battleEndedUpdate.winner === 'DRAW'
      ? 'Battle ended in a draw.'
      : `Winner: ${battleEndedUpdate.winner} (${reasonText}).`;
  return (
    `${summaryText} ` +
    `Cities B:${battleEndedUpdate.blueCities} R:${battleEndedUpdate.redCities} | ` +
    `Units B:${battleEndedUpdate.blueUnits} R:${battleEndedUpdate.redUnits}`
  );
}
