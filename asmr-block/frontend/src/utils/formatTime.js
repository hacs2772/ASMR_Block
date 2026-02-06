/**
 * 초를 mm:ss 형식으로 변환
 * @param {number} seconds - 초
 * @returns {string} - 포맷된 시간 문자열
 */
export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 초를 "X분 Y초" 형식으로 변환
 * @param {number} seconds - 초
 * @returns {string} - 포맷된 시간 문자열
 */
export function formatDurationText(seconds) {
  if (!seconds || seconds < 0) return '0초';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  if (mins === 0) {
    return `${secs}초`;
  }
  if (secs === 0) {
    return `${mins}분`;
  }
  return `${mins}분 ${secs}초`;
}

/**
 * 초를 시:분:초 형식으로 변환 (1시간 이상일 때)
 * @param {number} seconds - 초
 * @returns {string} - 포맷된 시간 문자열
 */
export function formatDurationLong(seconds) {
  if (!seconds || seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
