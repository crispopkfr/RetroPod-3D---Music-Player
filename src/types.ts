export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  url: string;
  rating?: number;
}

export type View = 'MENU' | 'MUSIC_MENU' | 'MUSIC' | 'GAMES' | 'SETTINGS' | 'NOW_PLAYING' | 'THEME_SETTINGS' | 'DEVICE_COLOR_SETTINGS' | 'WHEEL_COLOR_SETTINGS' | 'CENTER_BUTTON_COLOR_SETTINGS' | 'STICKER_SETTINGS' | 'ARTISTS_VIEW' | 'ALBUMS_VIEW' | 'COVER_FLOW' | 'PLAYLISTS_VIEW' | 'PLAYLIST_SONGS_VIEW' | 'PLAYLIST_OPTIONS_VIEW' | 'MANAGE_PLAYLIST_VIEW';

export interface Playlist {
  id: string;
  name: string;
  songs: string[]; // array of song IDs
  isDeleting?: boolean;
}

export type PlayingMode = 'PROGRESS' | 'VOLUME' | 'RATING';

export interface PlayerState {
  currentView: View;
  menuIndex: number;
  isPlaying: boolean;
  currentSong: Song | null;
  volume: number;
  theme: string;
  sensitivity: number;
  haptics: boolean;
  showBatteryPercentage: boolean;
}
