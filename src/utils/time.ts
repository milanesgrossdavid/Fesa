export const formatDuration = (millis: number) => {
  const safeMillis = Number.isFinite(millis) ? Math.max(0, Math.floor(millis)) : 0;
  const minutes = Math.floor(safeMillis / 60000);
  const seconds = Math.floor((safeMillis % 60000) / 1000);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const formatSongDuration = (duration: number) => {
  const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const durationMillis = safeDuration < 1000 ? safeDuration * 1000 : safeDuration;

  if (durationMillis >= 60 * 60 * 1000) {
    const hours = Math.floor(durationMillis / (60 * 60 * 1000));
    const minutes = Math.floor((durationMillis % (60 * 60 * 1000)) / 60000);
    const seconds = Math.floor((durationMillis % 60000) / 1000);
    return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  return formatDuration(durationMillis);
};

export const formatSeconds = (seconds: number) => {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};