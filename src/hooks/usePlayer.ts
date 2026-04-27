import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Song, View, PlayingMode, Playlist } from '../types';
import { Howl } from 'howler';

export const SONGLIST: Song[] = [
  {
    id: '1',
    title: 'Solar Drift',
    artist: 'Cosmic Echo',
    album: 'Stellar Voyager',
    cover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    rating: 0
  },
  {
    id: '2',
    title: 'Neon Nights',
    artist: 'Cyber Runner',
    album: 'Binary City',
    cover: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=300&q=80',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    rating: 0
  },
  {
    id: '3',
    title: 'Mountain Echo',
    artist: 'Terra',
    album: 'Earthbound',
    cover: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=300&q=80',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    rating: 0
  }
];

export const THEMES = [
  { name: 'Classic White', color: '#f3f4f6', menu: 'text-gray-900', bg: 'bg-white' },
  { name: 'Space Gray', color: '#374151', menu: 'text-white', bg: 'bg-gray-800' },
  { name: 'Gold', color: '#d4af37', menu: 'text-amber-900', bg: 'bg-amber-100' },
  { name: 'Deep Blue', color: '#1e3a8a', menu: 'text-blue-100', bg: 'bg-blue-900' },
];

export function usePlayer() {
  const [currentView, setCurrentView] = useState<View>('MENU');
  const [menuIndex, setMenuIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [userSongs, setUserSongs] = useState<Song[]>(SONGLIST);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [deviceColor, setDeviceColor] = useState('#e5e7eb'); // Default gray/white
  const [wheelColor, setWheelColor] = useState('#e1e1e1');
  const [sensitivity, setSensitivity] = useState(1);
  const [haptics, setHaptics] = useState(true);
  const [shuffle, setShuffle] = useState(false);
  const [showHud, setShowHud] = useState(true);
  const [isDeletingPlaylist, setIsDeletingPlaylist] = useState(false);
  const [showBatteryPercentage, setShowBatteryPercentage] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [filter, setFilter] = useState<{ type: 'artist' | 'album' | 'none' | 'playlist', value: string, source?: View }>({ type: 'none', value: '', source: undefined });
  const [playingMode, setPlayingMode] = useState<PlayingMode>('PROGRESS');
  const [isRatingEditing, setIsRatingEditing] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [lastViewBeforePlaylistOptions, setLastViewBeforePlaylistOptions] = useState<View | null>(null);

  const soundRef = useRef<Howl | null>(null);
  const currentSong = userSongs[currentSongIndex] || SONGLIST[0];

  const updateSongMetadata = (updatedSong: Song) => {
    setUserSongs(prev => prev.map(s => s.id === updatedSong.id ? updatedSong : s));
  };

  const updateSongRating = useCallback((rating: number) => {
    if (!currentSong) return;
    updateSongMetadata({ ...currentSong, rating });
  }, [currentSong]);

  const longPressCenter = useCallback(() => {
    if (currentView === 'NOW_PLAYING' && playingMode === 'RATING') {
      setIsRatingEditing(prev => !prev);
      if (haptics && window.navigator.vibrate) {
        window.navigator.vibrate([30, 50, 30]);
      }
    } else if (currentView === 'PLAYLISTS_VIEW') {
        const menuItems = getMenuItems(currentView, sensitivity, haptics, userSongs, filter, showBatteryPercentage, playlists, shuffle, showHud, false);
        const item = menuItems[menuIndex];
        if (item && item !== '+ Create New') {
            const playlist = playlists.find(p => p.name === item);
            if (playlist) {
                setSelectedPlaylistId(playlist.id);
                setLastViewBeforePlaylistOptions('PLAYLISTS_VIEW');
                setCurrentView('PLAYLIST_OPTIONS_VIEW');
                setMenuIndex(0);
                if (haptics && window.navigator.vibrate) {
                    window.navigator.vibrate([30, 50, 30]);
                }
            }
        }
    }
  }, [currentView, playingMode, haptics, menuIndex, playlists, sensitivity, userSongs, filter, showBatteryPercentage, shuffle, showHud]);

  useEffect(() => {
    if (soundRef.current) {
        soundRef.current.unload();
    }
    if (!currentSong) return;

    soundRef.current = new Howl({
      src: [currentSong.url],
      html5: true,
      volume: volume,
      onplay: () => setIsPlaying(true),
      onpause: () => setIsPlaying(false),
      onend: () => nextSong(),
      onload: () => setDuration(soundRef.current?.duration() || 0)
    });

    if (isPlaying) {
      soundRef.current.play();
    }

    return () => {
        soundRef.current?.unload();
    };
  }, [currentSongIndex, userSongs]);

  useEffect(() => {
     const interval = setInterval(() => {
         if (soundRef.current && isPlaying) {
             setProgress(soundRef.current.seek() as number || 0);
         }
     }, 1000);
     return () => clearInterval(interval);
  }, [isPlaying]);

  const ratingAccumulator = useRef(0);

  const handleMenuScroll = useCallback((delta: number) => {
    if (currentView === 'NOW_PLAYING') {
        if (playingMode === 'PROGRESS') {
            // Scrubbing logic
            if (soundRef.current) {
                const currentPos = soundRef.current.seek() as number;
                const newPos = Math.max(0, Math.min(duration, currentPos + delta * 5 * sensitivity));
                soundRef.current.seek(newPos);
                setProgress(newPos);
            }
        } else if (playingMode === 'VOLUME') {
            setVolume(prev => {
                const newVol = Math.max(0, Math.min(1, prev + delta * 0.05 * sensitivity));
                if (soundRef.current) soundRef.current.volume(newVol);
                return newVol;
            });
        } else if (playingMode === 'RATING' && isRatingEditing) {
            const currentRating = currentSong?.rating || 0;
            // Use an accumulator to make it feel like volume movement
            // sensitivity is typically 0.5 - 2.0. delta is ~1 per 'notch' or step.
            ratingAccumulator.current += delta * sensitivity;
            
            const threshold = 1.5; // Requires about 1.5 'volume steps' to change one star
            if (Math.abs(ratingAccumulator.current) >= threshold) {
                const steps = Math.floor(Math.abs(ratingAccumulator.current) / threshold);
                const direction = ratingAccumulator.current > 0 ? 1 : -1;
                const newRating = Math.max(0, Math.min(5, currentRating + (steps * direction)));
                
                if (newRating !== currentRating) {
                    updateSongRating(newRating);
                }
                // Reset accumulator but keep the remainder for smooth continuous scrolling
                ratingAccumulator.current = ratingAccumulator.current % threshold;
            }
        }
        return;
    }

    const menuItems = getMenuItems(currentView, sensitivity, haptics, userSongs, filter, showBatteryPercentage, playlists, shuffle, showHud, false);
    if (menuItems.length === 0) return;

    setMenuIndex((prev) => {
      const step = delta > 0 ? 1 : -1;
      let next = prev + step;
      if (next < 0) next = 0;
      if (next >= menuItems.length) next = menuItems.length - 1;
      return next;
    });
    
    if (haptics && window.navigator.vibrate) {
        window.navigator.vibrate(5);
    }
  }, [currentView, sensitivity, haptics, duration, playingMode, currentSong, updateSongRating, playlists, userSongs, filter, showBatteryPercentage, shuffle, showHud]);

  const selectItem = useCallback(() => {
    if (haptics && window.navigator.vibrate) {
      window.navigator.vibrate(20);
    }

    if (currentView === 'NOW_PLAYING') {
        setIsRatingEditing(false); // Auto-save and exit edit mode when switching
        setPlayingMode(prev => {
            if (prev === 'PROGRESS') return 'VOLUME';
            if (prev === 'VOLUME') return 'RATING';
            return 'PROGRESS';
        });
        return;
    }

    const curPlaylist = playlists.find(p => p.id === filter.value);
    const isDeleting = curPlaylist?.isDeleting || false;
    const menuItems = getMenuItems(currentView, sensitivity, haptics, userSongs, filter, showBatteryPercentage, playlists, shuffle, showHud, isDeleting);
    const item = menuItems[menuIndex];

    if (currentView === 'MENU') {
      if (item === 'Music') {
        setCurrentView('MUSIC_MENU');
        setMenuIndex(0);
      }
      if (item === 'Settings') {
        setCurrentView('SETTINGS');
        setMenuIndex(0);
      }
    } else if (currentView === 'MUSIC_MENU') {
        if (item === 'Songs') {
            setFilter({ type: 'none', value: '' });
            setCurrentView('MUSIC');
            setMenuIndex(0);
        } else if (item === 'Artists') {
            setCurrentView('ARTISTS_VIEW');
            setMenuIndex(0);
        } else if (item === 'Albums') {
            setCurrentView('ALBUMS_VIEW');
            setMenuIndex(0);
        } else if (item === 'Cover Flow') {
            setCurrentView('COVER_FLOW');
            setMenuIndex(0);
        } else if (item === 'Now Playing') {
            setCurrentView('NOW_PLAYING');
        } else if (item === 'Playlists') {
            setCurrentView('PLAYLISTS_VIEW');
            setMenuIndex(0);
        } else {
            console.log("Submenu selected:", item);
        }
    } else if (currentView === 'PLAYLISTS_VIEW') {
        if (item === '+ Create New') {
            const newPlaylist: Playlist = {
                id: Math.random().toString(36).substr(2, 9),
                name: '(Playlist)',
                songs: []
            };
            setPlaylists(prev => [...prev, newPlaylist]);
        } else {
            const playlist = playlists.find(p => p.name === item);
            if (playlist) {
                setSelectedPlaylistId(playlist.id);
                setFilter({ type: 'playlist', value: playlist.id });
                setCurrentView('PLAYLIST_SONGS_VIEW');
                setMenuIndex(0);
            }
        }
    } else if (currentView === 'PLAYLIST_SONGS_VIEW') {
        if (item === 'Manage Playlist') {
            setCurrentView('MANAGE_PLAYLIST_VIEW');
            setMenuIndex(0);
        } else {
            const currentPlaylist = playlists.find(p => p.id === selectedPlaylistId);
            if (currentPlaylist) {
                const song = userSongs.find(s => s.title === item);
                if (song) {
                    const indexInGlobal = userSongs.indexOf(song);
                    if (indexInGlobal !== -1) {
                        if (indexInGlobal === currentSongIndex) {
                            setCurrentView('NOW_PLAYING');
                            setFilter({ type: 'playlist', value: currentPlaylist.id });
                            return;
                        }
                        setCurrentSongIndex(indexInGlobal);
                        setCurrentView('NOW_PLAYING');
                        setIsPlaying(true);
                        setFilter({ type: 'playlist', value: currentPlaylist.id });
                    }
                }
            }
        }
    } else if (currentView === 'PLAYLIST_OPTIONS_VIEW') {
        if (item === 'Rename') {
            const newName = prompt('New Name:');
            if (newName && selectedPlaylistId) {
                setPlaylists(prev => prev.map(p => p.id === selectedPlaylistId ? { ...p, name: newName } : p));
            }
        } else if (item === 'Delete') {
            if (confirm('Are you sure you want to delete this playlist?')) {
                setPlaylists(prev => prev.filter(p => p.id !== selectedPlaylistId));
                setCurrentView('PLAYLISTS_VIEW');
                setMenuIndex(0);
            }
        } else if (item === 'Done') {
            setCurrentView('PLAYLISTS_VIEW');
            setMenuIndex(0);
        }
    } else if (currentView === 'MANAGE_PLAYLIST_VIEW') {
        if (item === 'Done') {
            setCurrentView('PLAYLIST_SONGS_VIEW');
            setMenuIndex(0);
        } else {
             const song = userSongs.find(s => s.title === item);
             if (song && selectedPlaylistId) {
                 setPlaylists(prev => prev.map(p => {
                     if (p.id === selectedPlaylistId) {
                         const hasSong = p.songs.includes(song.id);
                         const updatedSongs = hasSong 
                            ? p.songs.filter(id => id !== song.id)
                            : [...p.songs, song.id];
                         return { ...p, songs: updatedSongs };
                     }
                     return p;
                 }));
             }
        }
    } else if (currentView === 'ARTISTS_VIEW') {
        setFilter({ type: 'artist', value: item, source: 'ARTISTS_VIEW' });
        setCurrentView('MUSIC');
        setMenuIndex(0);
    } else if (currentView === 'COVER_FLOW') {
        const albums = Array.from(new Set(userSongs.map(s => s.album))).sort((a, b) => a.localeCompare(b));
        const album = albums[menuIndex];
        setFilter({ type: 'album', value: album, source: 'COVER_FLOW' });
        setCurrentView('MUSIC');
        setMenuIndex(0);
    } else if (currentView === 'ALBUMS_VIEW') {
        setFilter({ type: 'album', value: item, source: 'ALBUMS_VIEW' });
        setCurrentView('MUSIC');
        setMenuIndex(0);
    } else if (currentView === 'MUSIC') {
        const songIdx = userSongs.findIndex(s => s.title === item);
        if (songIdx !== -1) {
          if (songIdx === currentSongIndex) {
            setCurrentView('NOW_PLAYING');
            return;
          }
          setCurrentSongIndex(songIdx);
          setCurrentView('NOW_PLAYING');
          setIsPlaying(true);
          if (soundRef.current) {
              soundRef.current.stop(); // Stop current if any
          }
        }
    } else if (currentView === 'SETTINGS') {
      if (item === 'Source Folder') {
          // Trigger hidden input
          document.getElementById('folder-input')?.click();
      } else if (item === 'Theme') {
          setCurrentView('THEME_SETTINGS');
          setMenuIndex(0);
      } else if (item.startsWith('Sensitivity')) {
          setSensitivity(prev => (prev >= 3 ? 0.5 : prev + 0.5));
      } else if (item.startsWith('Shuffle')) {
          setShuffle(prev => !prev);
      } else if (item.startsWith('Hud')) {
          setShowHud(prev => !prev);
      }
    } else if (currentView === 'THEME_SETTINGS') {
        if (item === 'Device Color') {
            setCurrentView('DEVICE_COLOR_SETTINGS');
            setMenuIndex(0);
        } else if (item === 'Wheel Color') {
            setCurrentView('WHEEL_COLOR_SETTINGS');
            setMenuIndex(0);
        } else if (item.startsWith('Battery Percentage')) {
          setShowBatteryPercentage(prev => !prev);
        }
    } else if (currentView === 'DEVICE_COLOR_SETTINGS') {
        setDeviceColor(item);
    } else if (currentView === 'WHEEL_COLOR_SETTINGS') {
        setWheelColor(item);
    }
  }, [currentView, menuIndex, haptics, isPlaying, userSongs, filter, showBatteryPercentage, playlists, sensitivity, selectedPlaylistId, updateSongMetadata, shuffle]);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
    if (isPlaying) {
      soundRef.current?.pause();
    } else {
      soundRef.current?.play();
    }
  }, [isPlaying]);

  const nextSong = useCallback(() => {
     const songs = filter.type === 'artist' ? userSongs.filter(s => s.artist === filter.value)
                 : filter.type === 'album' ? userSongs.filter(s => s.album === filter.value)
                 : filter.type === 'playlist' ? userSongs.filter(s => {
                     const p = playlists.find(pl => pl.id === filter.value);
                     return p ? p.songs.includes(s.id) : false;
                 })
                 : userSongs;
     
     if (songs.length === 0) return;

     let nextIndex;
     if (shuffle) {
       nextIndex = Math.floor(Math.random() * songs.length);
       if (songs.length > 1 && songs[nextIndex].id === currentSong.id) {
           nextIndex = (nextIndex + 1) % songs.length;
       }
     } else {
       const currentIdxInSongs = songs.findIndex(s => s.id === currentSong.id);
       nextIndex = (currentIdxInSongs + 1) % songs.length;
     }
     
     const nextSongObj = songs[nextIndex];
     const globalIdx = userSongs.findIndex(s => s.id === nextSongObj.id);
     setCurrentSongIndex(globalIdx !== -1 ? globalIdx : 0);
     setIsPlaying(true);
  }, [userSongs, filter, playlists, shuffle, currentSong.id]);

  const prevSong = useCallback(() => {
     const songs = filter.type === 'artist' ? userSongs.filter(s => s.artist === filter.value)
                 : filter.type === 'album' ? userSongs.filter(s => s.album === filter.value)
                 : filter.type === 'playlist' ? userSongs.filter(s => {
                     const p = playlists.find(pl => pl.id === filter.value);
                     return p ? p.songs.includes(s.id) : false;
                 })
                 : userSongs;
     
     if (songs.length === 0) return;

     const currentIdxInSongs = songs.findIndex(s => s.id === currentSong.id);
     const prevIdxInSongs = (currentIdxInSongs - 1 + songs.length) % songs.length;
     const prevSongObj = songs[prevIdxInSongs];
     const globalIdx = userSongs.findIndex(s => s.id === prevSongObj.id);
     setCurrentSongIndex(globalIdx !== -1 ? globalIdx : 0);
     setIsPlaying(true);
  }, [userSongs, filter, playlists, currentSong.id]);

  const goMenu = useCallback(() => {
      if (currentView === 'NOW_PLAYING') {
          const songs = filter.type === 'artist' ? userSongs.filter(s => s.artist === filter.value)
                      : filter.type === 'album' ? userSongs.filter(s => s.album === filter.value)
                      : filter.type === 'playlist' ? userSongs.filter(s => {
                          const p = playlists.find(pl => pl.id === filter.value);
                          return p ? p.songs.includes(s.id) : false;
                      })
                      : userSongs;
          const indexInList = songs.findIndex(s => s.id === currentSong.id);
          setCurrentView(filter.type === 'playlist' ? 'PLAYLIST_SONGS_VIEW' : 'MUSIC');
          setMenuIndex(indexInList !== -1 ? indexInList + (filter.type === 'playlist' ? 1 : 0) : 0);
      } else if (currentView === 'MUSIC') {
          if (filter.type !== 'none') {
            const nextView = filter.source || (filter.type === 'artist' ? 'ARTISTS_VIEW' : 'ALBUMS_VIEW');
            setCurrentView(nextView);
            
            // Find index of previous filter value
            let list: string[] = [];
            if (nextView === 'COVER_FLOW' || nextView === 'ALBUMS_VIEW') {
                list = Array.from(new Set(userSongs.map(s => s.album))).sort((a, b) => a.localeCompare(b));
            } else {
                list = Array.from(new Set(userSongs.map(s => s.artist))).sort((a, b) => a.localeCompare(b));
            }
            const prevIndex = list.indexOf(filter.value);
            setMenuIndex(prevIndex !== -1 ? prevIndex : 0);
            setFilter({ type: 'none', value: '', source: undefined });
          } else {
            setCurrentView('MUSIC_MENU');
            setMenuIndex(4); // 'Songs' index (Now Playing: 0, Artists: 1, Cover Flow: 2, Albums: 3, Songs: 4, Playlists: 5)
          }
      } else if (currentView === 'ARTISTS_VIEW' || currentView === 'ALBUMS_VIEW' || currentView === 'COVER_FLOW') {
          setCurrentView('MUSIC_MENU');
          if (currentView === 'COVER_FLOW') setMenuIndex(2); // index of Cover Flow in new menu
          else setMenuIndex(currentView === 'ARTISTS_VIEW' ? 1 : 3);
      } else if (currentView === 'PLAYLISTS_VIEW') {
          setCurrentView('MUSIC_MENU');
          setMenuIndex(5);
      } else if (currentView === 'PLAYLIST_SONGS_VIEW') {
          setCurrentView('PLAYLISTS_VIEW');
          const idx = playlists.findIndex(p => p.id === selectedPlaylistId);
          setMenuIndex(idx !== -1 ? idx + 1 : 0);
          setFilter({ type: 'none', value: '' });
      } else if (currentView === 'PLAYLIST_OPTIONS_VIEW') {
          setCurrentView('PLAYLISTS_VIEW');
          const idx = playlists.findIndex(p => p.id === selectedPlaylistId);
          setMenuIndex(idx !== -1 ? idx + 1 : 0);
      } else if (currentView === 'MANAGE_PLAYLIST_VIEW') {
          setCurrentView('PLAYLIST_SONGS_VIEW');
          setMenuIndex(0);
      } else if (currentView === 'MUSIC_MENU') {
          setCurrentView('MENU');
          setMenuIndex(0);
      } else if (currentView === 'THEME_SETTINGS') {
          setCurrentView('SETTINGS');
          setMenuIndex(1); // Theme
      } else if (currentView === 'DEVICE_COLOR_SETTINGS' || currentView === 'WHEEL_COLOR_SETTINGS') {
          setCurrentView('THEME_SETTINGS');
          setMenuIndex(currentView === 'DEVICE_COLOR_SETTINGS' ? 0 : 1);
      } else if (currentView === 'SETTINGS') {
          setCurrentView('MENU');
          setMenuIndex(1); // Settings
      } else {
          setCurrentView('MENU');
          setMenuIndex(0);
      }
  }, [currentView, currentSongIndex]);

  return {
    currentView,
    menuIndex,
    isPlaying,
    currentSong,
    volume,
    sensitivity,
    haptics,
    progress,
    duration,
    handleMenuScroll,
    selectItem,
    togglePlay,
    nextSong,
    prevSong,
    goMenu,
    setIsPlaying,
    setCurrentView,
    setVolume,
    setMenuIndex,
    deviceColor,
    wheelColor,
    userSongs,
    setUserSongs,
    filter,
    showBatteryPercentage,
    setShowBatteryPercentage,
    updateSongMetadata,
    longPressCenter,
    playingMode,
    isRatingEditing,
    playlists,
    selectedPlaylistId,
    shuffle,
    showHud,
    setShowHud
  };
}

export const COLOR_MAP: Record<string, string> = {
  '#e5e7eb': 'Classic Grey',
  '#ffffff': 'White',
  '#374151': 'Space Grey',
  '#000000': 'Black',
  '#ff0000': 'Red',
  '#00ff00': 'Green',
  '#0000ff': 'Blue',
  '#ffa500': 'Orange',
  '#ffc0cb': 'Pink',
  '#a52a2a': 'Brown',
  '#800080': 'Purple',
  '#00ffff': 'Cyan',
  '#ffd700': 'Gold'
};

export const COLORS = Object.keys(COLOR_MAP);

export function getMenuItems(view: View, sensitivity: number = 1, haptics: boolean = true, userSongs: Song[] = [], filter: any = { type: 'none' }, showBatteryPercentage: boolean = false, playlists: Playlist[] = [], shuffle: boolean = false, showHud: boolean = false, isDeleting: boolean = false): string[] {
  switch (view) {
    case 'MENU': return ['Music', 'Settings'];
    case 'MUSIC_MENU': return ['Now Playing', 'Artists', 'Cover Flow', 'Albums', 'Songs', 'Playlists'];
    case 'MUSIC': {
        const songs = filter.type === 'artist' ? userSongs.filter(s => s.artist === filter.value)
                    : filter.type === 'album' ? userSongs.filter(s => s.album === filter.value)
                    : userSongs;
        return songs.map(s => s.title).sort((a, b) => a.localeCompare(b));
    }
    case 'PLAYLISTS_VIEW': return ['+ Create New', ...playlists.map(p => p.name).sort((a, b) => a.localeCompare(b))];
    case 'PLAYLIST_SONGS_VIEW': {
        const playlist = playlists.find(p => p.id === filter.value);
        if (!playlist) return ['Manage Playlist'];
        const songs = userSongs.filter(s => playlist.songs.includes(s.id));
        return ['Manage Playlist', ...songs.map(s => s.title)];
    }
    case 'PLAYLIST_OPTIONS_VIEW': {
      if (isDeleting) {
        return ['Confirm Delete?', 'Yes', 'No'];
      }
      return ['Rename', 'Delete', 'Done'];
    }
    case 'MANAGE_PLAYLIST_VIEW': return ['Done', ...userSongs.map(s => s.title)];
    case 'ARTISTS_VIEW': return Array.from(new Set(userSongs.map(s => s.artist))).sort((a, b) => a.localeCompare(b));
    case 'ALBUMS_VIEW': return Array.from(new Set(userSongs.map(s => s.album))).sort((a, b) => a.localeCompare(b));
    case 'SETTINGS': return [
      'Source Folder', 
      'Theme', 
      `Sensitivity: x${sensitivity}`, 
      `Shuffle: ${shuffle ? 'On' : 'Off'}`,
      `Hud: ${showHud ? 'On' : 'Off'}`
    ];
    case 'THEME_SETTINGS': return [
      'Device Color', 
      'Wheel Color', 
      `Battery Percentage: ${showBatteryPercentage ? 'On' : 'Off'}`
    ];
    case 'DEVICE_COLOR_SETTINGS': return COLORS;
    case 'WHEEL_COLOR_SETTINGS': return COLORS;
    case 'COVER_FLOW': {
      return Array.from(new Set(userSongs.map(s => s.album))).sort((a, b) => a.localeCompare(b));
    }
    default: return [];
  }
}
