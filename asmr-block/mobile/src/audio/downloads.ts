import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * 완성본 오프라인 저장 (비행기 모드/와이파이 없이 자면서 듣기).
 * 파일: <앱 문서 폴더>/renders/<해시>.mp3, 목록: renders/index.json
 * 웹 미리보기에서는 지원하지 않음.
 */
export const canDownload = Platform.OS !== 'web';

export type SavedTrack = {
  playlistId: number;
  title: string;
  subtitle: string;
  colors: string[];
  duration: number;
  fileName: string;
  savedAt: string;
};

const dir = () => new Directory(Paths.document, 'renders');
const indexFile = () => new File(Paths.document, 'renders', 'index.json');
export const fileNameOf = (url: string) => url.split('?')[0].split('/').pop() ?? 'render.mp3';
const fileOf = (fileName: string) => new File(Paths.document, 'renders', fileName);

export async function listSaved(): Promise<SavedTrack[]> {
  if (!canDownload) return [];
  const index = indexFile();
  if (!index.exists) return [];
  try {
    const tracks = JSON.parse(await index.text()) as SavedTrack[];
    return tracks.filter((t) => fileOf(t.fileName).exists);
  } catch {
    return [];
  }
}

async function writeIndex(tracks: SavedTrack[]) {
  const index = indexFile();
  if (!index.exists) index.create();
  await index.write(JSON.stringify(tracks));
}

/** 저장되어 있으면 로컬 파일 주소 */
export function localUriOf(remoteUrl: string): string | null {
  if (!canDownload) return null;
  const file = fileOf(fileNameOf(remoteUrl));
  return file.exists ? file.uri : null;
}

export function localUriOfSaved(track: SavedTrack): string {
  return fileOf(track.fileName).uri;
}

export async function saveTrack(remoteUrl: string, info: Omit<SavedTrack, 'fileName' | 'savedAt'>): Promise<string> {
  const folder = dir();
  if (!folder.exists) folder.create({ intermediates: true });
  const fileName = fileNameOf(remoteUrl);
  const file = fileOf(fileName);
  if (!file.exists) await File.downloadFileAsync(remoteUrl, file);

  const others = (await listSaved()).filter((t) => t.playlistId !== info.playlistId);
  await writeIndex([{ ...info, fileName, savedAt: new Date().toISOString() }, ...others]);
  return file.uri;
}

export async function removeTrack(playlistId: number): Promise<void> {
  const tracks = await listSaved();
  const target = tracks.find((t) => t.playlistId === playlistId);
  const rest = tracks.filter((t) => t.playlistId !== playlistId);
  // 다른 플레이리스트가 같은 파일(같은 구성)을 쓰고 있으면 파일은 남김
  if (target && !rest.some((t) => t.fileName === target.fileName)) {
    const file = fileOf(target.fileName);
    if (file.exists) file.delete();
  }
  await writeIndex(rest);
}
