export const formatDuration = (millis: number) => {
  const safeMillis = Number.isFinite(millis) ? Math.max(0, Math.floor(millis)) : 0;
  const minutes = Math.floor(safeMillis / 60000);
  const seconds = Math.floor((safeMillis % 60000) / 1000);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const formatSeconds = (seconds: number) => {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};