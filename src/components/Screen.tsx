import React from 'react';
import { View, Song, PlayingMode } from '../types';
import { SONGLIST, THEMES, getMenuItems, COLOR_MAP } from '../hooks/usePlayer';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Music, Play, Pause, Settings, Gamepad2, Battery, Star, Volume2, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { Playlist } from '../types';

import * as mm from 'music-metadata-browser';

interface ScreenProps {
  view: View;
  menuIndex: number;
  currentSong: Song;
  isPlaying: boolean;
  progress: number;
  duration: number;
  sensitivity: number;
  haptics: boolean;
  showBatteryPercentage: boolean;
  setUserSongs: (songs: Song[]) => void;
  userSongs: Song[];
  filter: any;
  playingMode: PlayingMode;
  isRatingEditing: boolean;
  volume: number;
  playlists: Playlist[];
  selectedPlaylistId: string | null;
  shuffle: boolean;
  showHud: boolean;
}

const RetroEqualizer: React.FC<{ isPlaying: boolean }> = ({ isPlaying }) => {
  return (
    <div className="flex items-end gap-[2px] h-[12px] px-1 bg-black/5 rounded-sm py-[1px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          initial={{ height: "30%" }}
          animate={isPlaying ? {
            height: [
              "20%", "80%", "40%", "100%", "30%", "70%", "50%", "20%"
            ]
          } : { height: "20%" }}
          transition={{
            duration: 0.8 + (i * 0.1),
            repeat: Infinity,
            delay: i * 0.1,
            ease: "linear"
          }}
          className="w-[3px] bg-black"
          style={{
            backgroundImage: 'linear-gradient(to bottom, transparent 1px, #b3bfa3 1px)',
            backgroundSize: '100% 3px'
          }}
        />
      ))}
    </div>
  );
};

export const Screen: React.FC<ScreenProps> = ({ 
  view, 
  menuIndex, 
  currentSong, 
  isPlaying, 
  progress, 
  duration, 
  sensitivity, 
  haptics, 
  showBatteryPercentage,
  setUserSongs,
  userSongs,
  filter,
  playingMode,
  isRatingEditing,
  volume,
  playlists,
  selectedPlaylistId,
  shuffle,
  showHud
}) => {
  const curPlaylist = playlists.find(p => p.id === filter.value);
  const isDeleting = curPlaylist?.isDeleting || false;
  const menuItems = getMenuItems(view, sensitivity, haptics, userSongs, filter, showBatteryPercentage, playlists, shuffle, showHud, isDeleting);
  const [batteryLevel, setBatteryLevel] = React.useState(100);

  React.useEffect(() => {
    const getBattery = async () => {
      try {
        const battery = await (navigator as any).getBattery();
        setBatteryLevel(Math.round(battery.level * 100));
        
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      } catch (e) {
        console.warn("Battery API not supported");
      }
    };
    getBattery();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const audioFiles = Array.from(files).filter(file => 
      file.type.startsWith('audio/') || 
      file.name.endsWith('.m4a') || 
      file.name.endsWith('.mp3') || 
      file.name.endsWith('.wav') ||
      file.name.endsWith('.opus')
    );
    const parsedSongs: Song[] = [];

    for (const file of audioFiles) {
      try {
        const metadata = await mm.parseBlob(file);
        const { common } = metadata;
        
        let cover = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80';
        if (common.picture && common.picture.length > 0) {
          const pic = common.picture[0];
          const blob = new Blob([pic.data], { type: pic.format });
          cover = URL.createObjectURL(blob);
        }

        parsedSongs.push({
          id: `imported-${Math.random().toString(36).substr(2, 9)}`,
          title: common.title || file.name.replace(/\.[^/.]+$/, ""),
          artist: common.artist || 'Unknown Artist',
          album: common.album || 'Unknown Album',
          cover: cover,
          url: URL.createObjectURL(file)
        });
      } catch (err) {
        console.error("Error parsing metadata for", file.name, err);
        parsedSongs.push({
          id: `imported-${Math.random().toString(36).substr(2, 9)}`,
          title: file.name.replace(/\.[^/.]+$/, ""),
          artist: 'Unknown Artist',
          album: 'Unknown Album',
          cover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80',
          url: URL.createObjectURL(file)
        });
      }
    }

    if (parsedSongs.length > 0) {
      setUserSongs(parsedSongs);
    }
  };

  const formatTime = (time: number) => {
      const mins = Math.floor(time / 60);
      const secs = Math.floor(time % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={cn(
        "w-full h-full overflow-hidden select-none flex flex-col font-sans relative",
        "bg-[#b3bfa3] text-black border-2 border-black"
      )}
    >
      <input 
        id="folder-input" 
        type="file" 
        multiple 
        {...({ webkitdirectory: "", directory: "" } as any)}
        className="hidden" 
        onChange={handleFileChange} 
      />
      {/* Status Bar */}
      <div className="h-8 flex items-center justify-between px-4 text-[10px] font-black tracking-widest border-b border-black/20 relative z-20">
        <div className="flex items-center gap-2">
            <RetroEqualizer isPlaying={isPlaying} />
        </div>
        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <div className="flex items-center gap-1.5 min-w-[30px] justify-end">
            {showBatteryPercentage && <span>{batteryLevel}%</span>}
            <div className="w-5 h-2.5 border border-black p-[0.5px] items-center flex">
                <div 
                  className="h-full bg-black transition-all duration-500" 
                  style={{ width: `${batteryLevel}%` }}
                />
            </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          {view !== 'NOW_PLAYING' ? (
            <motion.div
              key={view}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full"
            >
              <div className="px-3 py-1 bg-black text-[#b3bfa3] text-[12px] font-black uppercase tracking-widest">
                {view === 'MENU' ? 'MENU' : 
                 view === 'THEME_SETTINGS' ? 'Theme' :
                 view === 'DEVICE_COLOR_SETTINGS' ? 'Device Color' :
                 view === 'WHEEL_COLOR_SETTINGS' ? 'Wheel Color' :
                 view === 'MUSIC_MENU' ? 'Music' :
                 view === 'COVER_FLOW' ? 'Cover Flow' :
                 view === 'ARTISTS_VIEW' ? 'ARTISTS' :
                 view === 'ALBUMS_VIEW' ? 'ALBUMS' :
                 view === 'PLAYLISTS_VIEW' ? 'PLAYLISTS' :
                 view === 'PLAYLIST_SONGS_VIEW' ? 'PLAYLIST' :
                 view === 'PLAYLIST_OPTIONS_VIEW' ? 'PLAYLIST OPTIONS' :
                 view === 'MANAGE_PLAYLIST_VIEW' ? 'MANAGE PLAYLIST' :
                 view === 'MUSIC' ? 'SONGS' :
                 view.replace('_SETTINGS', '').replace('_MENU', '').replace('MUSIC', 'Music')}
              </div>

              <div className="flex-1 overflow-hidden relative">
                {view === 'COVER_FLOW' ? (
                  <div className="h-full flex items-center justify-center bg-black/5 overflow-hidden">
                    <div className="relative w-full h-32 flex items-center justify-center">
                      {menuItems.map((albumName, idx) => {
                        const songWithCover = userSongs.find(s => s.album === albumName);
                        const cover = songWithCover?.cover || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80';
                        const offset = idx - menuIndex;
                        const isCenter = offset === 0;
                        return (
                          <motion.div
                            key={albumName}
                            animate={{
                              x: offset * 80,
                              scale: isCenter ? 1.2 : 0.8,
                              zIndex: 10 - Math.abs(offset),
                              rotateY: offset * 45,
                              opacity: Math.abs(offset) > 2 ? 0 : 1
                            }}
                            transition={{ duration: 0.3 }}
                            className="absolute w-24 h-24 bg-white border border-black/20 shadow-xl preserve-3d"
                            style={{ transformStyle: 'preserve-3d' }}
                          >
                            <img src={cover} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            {isCenter && (
                              <div className="absolute top-[105%] left-0 w-full text-center">
                                <div className="text-[10px] font-black uppercase truncate px-1">{albumName}</div>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div 
                    className="absolute w-full transition-transform duration-150 ease-out"
                    style={{ transform: `translateY(-${Math.max(0, menuIndex - 6) * 25}px)` }}
                  >
                    {menuItems.map((item, idx) => (
                      <div
                        key={item + idx}
                        className={cn(
                          "px-3 h-[25px] flex items-center justify-between text-[12px] font-black tracking-tight",
                          menuIndex === idx ? "bg-black text-[#b3bfa3]" : "text-black"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                            {(view === 'DEVICE_COLOR_SETTINGS' || view === 'WHEEL_COLOR_SETTINGS') && (
                                <div 
                                    className="w-3 h-3 flex-shrink-0 border border-black/20" 
                                    style={{ backgroundColor: item }} 
                                />
                            )}
                            <span className="truncate">{COLOR_MAP[item] || item}</span>
                        </div>
                        {view === 'MANAGE_PLAYLIST_VIEW' && idx > 0 && (() => {
                            const playlist = playlists.find(p => p.id === selectedPlaylistId);
                            const song = userSongs.find(s => s.title === item);
                            if (playlist && song && playlist.songs.includes(song.id)) {
                                return <Check size={12} className="flex-shrink-0" />;
                            }
                            return null;
                        })()}
                        {menuIndex === idx && <ChevronRight size={12} className="flex-shrink-0" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : view === 'NOW_PLAYING' ? (
            <motion.div
              key="now-playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col pt-2 px-4 items-center justify-start text-center gap-2"
            >
                <div className="w-24 h-24 bg-black/10 border border-black/20 overflow-hidden shadow-sm flex items-center justify-center">
                   {currentSong?.cover ? (
                    <img 
                      src={currentSong.cover} 
                      alt={currentSong.album} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                   ) : (
                    <Music size={32} className="text-black/20" />
                   )}
                </div>

                <div className="space-y-0 text-center w-full">
                    <h2 className="text-[12px] font-black uppercase leading-tight truncate px-2">{currentSong?.title}</h2>
                    <p className="text-[10px] font-bold opacity-60 truncate px-2">{currentSong?.artist}</p>
                    <p className="text-[9px] font-bold opacity-40 truncate px-2 capitalize">{currentSong?.album}</p>
                </div>

                <div className="w-full max-w-[150px] mt-1">
                    <AnimatePresence mode="wait">
                        {playingMode === 'PROGRESS' && (
                            <motion.div 
                                key="progress"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-1"
                            >
                                <div className="h-2.5 w-full border-2 border-black p-[1px] bg-black/5">
                                    <div 
                                        className="h-full bg-black transition-all duration-300" 
                                        style={{ width: `${(progress / (duration || 1)) * 100}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[8px] font-black">
                                    <span>{formatTime(progress)}</span>
                                    <span>-{formatTime(duration - progress)}</span>
                                </div>
                            </motion.div>
                        )}

                        {playingMode === 'VOLUME' && (
                            <motion.div 
                                key="volume"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-1"
                            >
                                <div className="flex items-center gap-2">
                                    <Volume2 size={10} className="flex-shrink-0" />
                                    <div className="h-2.5 flex-1 border-2 border-black p-[1px] bg-black/5">
                                        <div 
                                            className="h-full bg-black transition-all duration-300" 
                                            style={{ width: `${volume * 100}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="text-center text-[8px] font-black uppercase tracking-tighter">Volume</div>
                            </motion.div>
                        )}

                        {playingMode === 'RATING' && (
                            <motion.div 
                                key="rating"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-1"
                            >
                                <div className="flex justify-center gap-1">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <Star 
                                            key={star} 
                                            size={16} 
                                            className={cn(
                                                "transition-all duration-200",
                                                (currentSong?.rating || 0) >= star ? "fill-black text-black" : "text-black/20"
                                            )} 
                                        />
                                    ))}
                                </div>
                                <div className="text-center text-[8px] font-black uppercase tracking-tighter opacity-60">
                                    {isRatingEditing ? "SET RATING" : "Hold center to rate"}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};
