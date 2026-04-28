import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  RoundedBox, 
  Html, 
  Environment, 
  Float, 
  ContactShadows,
  MeshReflectorMaterial,
  PerspectiveCamera,
  Decal,
  useTexture
} from '@react-three/drei';
import * as THREE from 'three';
import { Screen } from './Screen';
import { usePlayer } from '../hooks/usePlayer';
import { Play, Pause, SkipBack, SkipForward, Lock, Unlock, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { cn } from '../lib/utils';

function ControlledOrbit({ isLocked, zoom }: { isLocked: boolean, zoom: number }) {
  const controlsRef = useRef<any>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  useFrame((state) => {
    if (!isLocked && controlsRef.current) {
        const camera = state.camera;
        
        // Always try to match the external zoom distance
        const currentDistance = camera.position.length();
        if (Math.abs(currentDistance - zoom) > 0.01) {
            const direction = camera.position.clone().normalize();
            camera.position.copy(direction.multiplyScalar(THREE.MathUtils.lerp(currentDistance, zoom, 0.1)));
        }

        if (!isInteracting) {
            // Keep centered rotation
            const targetDir = new THREE.Vector3(0, 0, 1);
            const currentDir = camera.position.clone().normalize();
            
            if (currentDir.distanceTo(targetDir) > 0.005) {
                const distance = camera.position.length();
                const lerpedDir = currentDir.lerp(targetDir, 0.1).normalize();
                camera.position.copy(lerpedDir.multiplyScalar(distance));
                controlsRef.current.update();
            }
        }
    }
  });

  return (
    <OrbitControls 
        ref={controlsRef}
        enablePan={false} 
        enableZoom={false} // BLOQUED default zoom
        enabled={!isLocked}
        minAzimuthAngle={-Math.PI / 4}
        maxAzimuthAngle={Math.PI / 4}
        minPolarAngle={Math.PI / 2 - 0.3}
        maxPolarAngle={Math.PI / 2 + 0.3}
        onStart={() => setIsInteracting(true)}
        onEnd={() => setIsInteracting(false)}
        makeDefault
    />
  );
}

export default function IpodScene() {
  const player = usePlayer();
  const [isLocked, setIsLocked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isBackgroundExpanded, setIsBackgroundExpanded] = useState(false);

  return (
    <div 
      className="w-full h-screen flex flex-col items-center justify-center p-4 overflow-hidden relative selection:bg-none transition-colors duration-500"
      style={{ backgroundColor: player.voidColor }}
    >
      
      {/* Zoom Bar & Lock Button Container - Desktop Bottom */}
      <AnimatePresence>
        {player.showHud && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center z-50">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ 
                y: 0,
                opacity: 1,
                width: (isExpanded || isBackgroundExpanded) ? 'auto' : '120px',
              }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex items-center p-3 bg-[#d1d1d1] rounded-2xl shadow-[inset_0_-2px_4px_rgba(0,0,0,0.3),0_10px_20px_rgba(0,0,0,0.4)] border-2 border-[#b0b0b0] overflow-hidden"
            >
              {/* Left Collapsible Area (Background Color) */}
              <AnimatePresence>
                {isBackgroundExpanded && (
                  <motion.div 
                    initial={{ width: 0, opacity: 0, x: 10 }}
                    animate={{ width: 140, opacity: 1, x: 0 }}
                    exit={{ width: 0, opacity: 0, x: 10 }}
                    className="flex items-center gap-4 pl-1"
                  >
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => player.setVoidColor('#000000')}
                            className={cn(
                                "w-10 h-10 rounded-full border-2 border-white/20 shadow-lg transition-transform active:scale-90",
                                player.voidColor === '#000000' ? "scale-110 border-white ring-2 ring-black/20" : "opacity-80"
                            )}
                            style={{ backgroundColor: '#000000' }}
                            title="Black Void"
                        />
                        <button 
                            onClick={() => player.setVoidColor('#ffffff')}
                            className={cn(
                                "w-10 h-10 rounded-full border-2 border-black/20 shadow-lg transition-transform active:scale-90",
                                player.voidColor === '#ffffff' ? "scale-110 border-black ring-2 ring-white/20" : "opacity-80"
                            )}
                            style={{ backgroundColor: '#ffffff' }}
                            title="White Void"
                        />
                    </div>
                    {/* Separator */}
                    <div className="w-[2px] h-10 bg-[#a0a0a0] shadow-[1px_0_0_white] flex-shrink-0" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Left Toggle Button */}
              {!isExpanded && (
                  <button 
                    onClick={() => setIsBackgroundExpanded(!isBackgroundExpanded)}
                    className="w-8 h-12 flex items-center justify-center text-[#666] hover:text-black transition-colors"
                  >
                    <motion.div
                       animate={{ rotate: isBackgroundExpanded ? 180 : 0 }}
                    >
                      <ChevronLeft size={16} />
                    </motion.div>
                  </button>
              )}

              {/* Retro Lock Switch */}
              <button 
                  onClick={() => setIsLocked(!isLocked)}
                  className={cn(
                      "w-12 h-12 flex-shrink-0 rounded-xl border-2 flex items-center justify-center transition-all duration-200 active:scale-95 z-10",
                      isLocked 
                          ? "bg-[#ff6b6b] border-[#d14b4b] shadow-[0_4px_0_#9c3434,0_6px_10px_rgba(0,0,0,0.3)] text-white" 
                          : "bg-[#e8e8e8] border-[#b0b0b0] shadow-[0_4px_0_#888,0_6px_10px_rgba(0,0,0,0.3)] text-[#666]"
                  )}
                  title={isLocked ? "Unlock View" : "Lock View"}
              >
                  {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
              </button>
    
              {/* Right Toggle Button */}
              {!isBackgroundExpanded && (
                  <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-8 h-12 flex items-center justify-center text-[#666] hover:text-black transition-colors"
                  >
                    <motion.div
                       animate={{ rotate: isExpanded ? 180 : 0 }}
                    >
                      <ChevronRight size={16} />
                    </motion.div>
                  </button>
              )}
    
              {/* Right Collapsible Area (Zoom) */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    initial={{ width: 0, opacity: 0, x: -10 }}
                    animate={{ width: 180, opacity: 1, x: 0 }}
                    exit={{ width: 0, opacity: 0, x: -10 }}
                    className="flex items-center gap-4 pr-2"
                  >
                    {/* Separator */}
                    <div className="w-[2px] h-10 bg-[#a0a0a0] shadow-[1px_0_0_white] flex-shrink-0" />
                    
                    {/* Retro Zoom Slider */}
                    <input 
                        type="range" 
                        min="4" 
                        max="12" 
                        step="0.1" 
                        value={player.zoom} 
                        onChange={(e) => player.setZoom(parseFloat(e.target.value))}
                        className="w-full h-8 appearance-none bg-[#e8e8e8] rounded-lg border border-[#a0a0a0] shadow-inner cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-7 
                            [&::-webkit-slider-thumb]:bg-[#f0f0f0] [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:border-2 
                            [&::-webkit-slider-thumb]:border-[#999] [&::-webkit-slider-thumb]:shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_1px_white]"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="w-full h-full">
        <Canvas shadows camera={{ position: [0, 0, player.zoom], fov: 40 }}>
          <color attach="background" args={[player.voidColor]} />
          <PerspectiveCamera makeDefault position={[0, 0, player.zoom]} />
          
          <ambientLight intensity={0.6} />
          <pointLight position={[10, 10, 10]} intensity={60} />
          <pointLight position={[-10, 5, 5]} intensity={30} color="#ffffff" />
          <pointLight position={[0, -10, 5]} intensity={20} color="#ffffff" />
          
          <Float speed={isLocked ? 0 : 1} rotationIntensity={isLocked ? 0 : 0.2} floatIntensity={isLocked ? 0 : 0.15}>
            <Suspense fallback={null}>
              <IpodModel player={player} />
            </Suspense>
          </Float>
  
          <Environment preset="city" />
          <ControlledOrbit isLocked={isLocked} zoom={player.zoom} />
        </Canvas>
      </div>
    </div>
  );
}

function IpodModel({ player }: { player: any }) {
  const bodyRef = useRef<THREE.Group>(null);
  const stickers = player.stickers || [];

  return (
    <group ref={bodyRef}>
      {/* Chassis */}
      <RoundedBox args={[4, 6.2, 0.45]} radius={0.3} smoothness={12} castShadow receiveShadow>
        <meshPhysicalMaterial 
            color={player.deviceColor} 
            roughness={0.25} 
            metalness={0.05}
            reflectivity={0.2}
            clearcoat={1}
            clearcoatRoughness={0.1}
            envMapIntensity={1.2}
            side={THREE.DoubleSide}
        />
        {stickers[0] && <Sticker url={stickers[0]} position={[-1.4, -0.8, 0.23]} />}
        {stickers[1] && <Sticker url={stickers[1]} position={[1.4, -0.8, 0.23]} />}
        {stickers[2] && <Sticker url={stickers[2]} position={[-1.4, -2.4, 0.23]} />}
        {stickers[3] && <Sticker url={stickers[3]} position={[1.4, -2.4, 0.23]} />}
      </RoundedBox>

      {/* Screen Area */}
      <group position={[0, 1.45, 0.23]}>
        <mesh>
          <planeGeometry args={[3.6, 2.75]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        
        <Html transform distanceFactor={4.5} zIndexRange={[0, 10]}>
          <div style={{ width: '320px', height: '240px' }}>
            <Screen 
              view={player.currentView} 
              menuIndex={player.menuIndex} 
              currentSong={player.currentSong}
              isPlaying={player.isPlaying}
              progress={player.progress}
              duration={player.duration}
              sensitivity={player.sensitivity}
              haptics={player.haptics}
              showBatteryPercentage={player.showBatteryPercentage}
              setUserSongs={player.setUserSongs}
              userSongs={player.userSongs}
              filter={player.filter}
              playingMode={player.playingMode}
              isRatingEditing={player.isRatingEditing}
              volume={player.volume}
              playlists={player.playlists}
              selectedPlaylistId={player.selectedPlaylistId}
              shuffle={player.shuffle}
              showHud={player.showHud}
              displayMode={player.displayMode}
              deviceColor={player.deviceColor}
              wheelColor={player.wheelColor}
              centerButtonColor={player.centerButtonColor}
              outerRingColor={player.outerRingColor}
              wheelIconsColor={player.wheelIconsColor}
              stickers={player.stickers}
              fontType={player.fontType}
              fontColor={player.fontColor}
              selectorColor={player.selectorColor}
            />
          </div>
        </Html>
      </group>

      {/* Click Wheel */}
      <ClickWheelComponent player={player} />
    </group>
  );
}

function Sticker({ url, position }: { url: string, position: [number, number, number] }) {
  const texture = useTexture(url);
  return (
    <Decal 
        position={position} 
        rotation={[0, 0, 0]} 
        scale={[1.2, 1.2, 1.2]} 
    >
      <meshBasicMaterial 
        map={texture} 
        transparent 
        polygonOffset 
        polygonOffsetFactor={-1}
        side={THREE.DoubleSide}
      />
    </Decal>
  );
}

function ClickWheelComponent({ player }: { player: any }) {
    const { gl } = useThree();
    const [isRotating, setIsRotating] = useState(false);
    const lastAngle = useRef<number | null>(null);

    const handlePointerDown = (e: any) => {
        e.stopPropagation();
        const { x, y } = getPointOnWheel(e);
        lastAngle.current = Math.atan2(y, x);
        setIsRotating(true);
        gl.domElement.setPointerCapture(e.pointerId);
    };

    const handlePointerUp = (e: any) => {
        setIsRotating(false);
        lastAngle.current = null;
        gl.domElement.releasePointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: any) => {
        if (!isRotating || lastAngle.current === null) return;
        
        const { x, y } = getPointOnWheel(e);
        const currentAngle = Math.atan2(y, x);
        
        let delta = currentAngle - lastAngle.current;
        
        if (delta > Math.PI) delta -= 2 * Math.PI;
        if (delta < -Math.PI) delta += 2 * Math.PI;

        const threshold = 0.25 / player.sensitivity; 
        if (Math.abs(delta) > threshold) {
            player.handleMenuScroll(delta > 0 ? -1 : 1);
            lastAngle.current = currentAngle;
        }
    };

    const getPointOnWheel = (e: any) => {
        const localPoint = e.object.worldToLocal(e.point.clone());
        return { x: localPoint.x, y: localPoint.y };
    };

    const timerRef = useRef<any>(null);
    const longPressTriggered = useRef(false);
    const playPauseLongPressTriggered = useRef(false);
    const playPauseTimerRef = useRef<any>(null);

    const handleCenterDown = (e: any) => {
        e.stopPropagation();
        longPressTriggered.current = false;
        timerRef.current = setTimeout(() => {
            player.longPressCenter();
            longPressTriggered.current = true;
            if (player.haptics && window.navigator.vibrate) {
                window.navigator.vibrate([30, 50, 30]); // Distinct vibrate for long press
            }
        }, 2000);
    };

    const handlePlayPauseDown = (e: any) => {
        e.stopPropagation();
        playPauseLongPressTriggered.current = false;
        playPauseTimerRef.current = setTimeout(() => {
            player.setCurrentView('NOW_PLAYING');
            playPauseLongPressTriggered.current = true;
            if (player.haptics && window.navigator.vibrate) {
                window.navigator.vibrate([30, 50, 30]);
            }
        }, 2000);
    };

    const handlePlayPauseUp = (e: any) => {
        e.stopPropagation();
        if (playPauseTimerRef.current) {
            clearTimeout(playPauseTimerRef.current);
            playPauseTimerRef.current = null;
        }
        if (!playPauseLongPressTriggered.current) {
            player.togglePlay();
        }
    };

    const handleCenterUp = (e: any) => {
        e.stopPropagation();
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (!longPressTriggered.current) {
            player.selectItem();
        }
    };

    return (
        <group position={[0, -1.6, 0.26]}>
            {/* Outer Wheel Base (The indentation/rim) */}
            <mesh position={[0, 0, -0.01]}>
                <circleGeometry args={[1.2, 64]} />
                <meshPhysicalMaterial 
                    color={player.outerRingColor} 
                    roughness={0.6} 
                    metalness={0}
                />
            </mesh>

            {/* Main Wheel Disk - Subtle Retro Gray */}
            <mesh 
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerMove={handlePointerMove}
                position={[0, 0, 0]}
            >
                <circleGeometry args={[1.15, 64]} />
                <meshPhysicalMaterial 
                    color={player.wheelColor} 
                    roughness={0.4} 
                    metalness={0.05}
                    envMapIntensity={0.8}
                />
            </mesh>

        <group position={[0, 0, 0.05]}>
            <Html transform distanceFactor={4.5} pointerEvents="none">
                 <div 
                    className="w-[180px] h-[180px] rounded-full relative flex items-center justify-center font-black select-none"
                    style={{ color: player.wheelIconsColor }}
                 >
                    {/* Menu Text */}
                    <div className="absolute top-[8px] text-[12px] tracking-[0.2em] opacity-80 uppercase">
                        MENU
                    </div>
                    
                    {/* Play/Pause Icon */}
                    <div className="absolute bottom-[8px] opacity-70">
                        <svg width="20" height="18" viewBox="0 0 14 12" fill="currentColor">
                            <path d="M0 0.5L6 6L0 11.5V0.5Z" />
                            <rect x="8" y="1" width="2" height="10" />
                            <rect x="12" y="1" width="2" height="10" />
                        </svg>
                    </div>

                    {/* Skip Back Icon */}
                    <div className="absolute left-[8px] opacity-70">
                        <svg width="22" height="16" viewBox="0 0 16 12" fill="currentColor">
                            <path d="M16 0.5L10 6L16 11.5V0.5Z" />
                            <path d="M9 0.5L3 6L9 11.5V0.5Z" />
                            <rect x="0" y="1" width="2" height="10" />
                        </svg>
                    </div>

                    {/* Skip Forward Icon */}
                    <div className="absolute right-[8px] opacity-70">
                        <svg width="22" height="16" viewBox="0 0 16 12" fill="currentColor">
                            <path d="M0 0.5L6 6L0 11.5V0.5Z" />
                            <path d="M7 0.5L13 6L7 11.5V0.5Z" />
                            <rect x="14" y="1" width="2" height="10" />
                        </svg>
                    </div>
                 </div>
            </Html>
        </group>

            {/* Center Button - Deep Glossy Plastic */}
            <mesh 
                position={[0, 0, 0.04]} 
                onPointerDown={handleCenterDown}
                onPointerUp={handleCenterUp}
            >
                <circleGeometry args={[0.38, 64]} />
                <meshPhysicalMaterial 
                    color={player.centerButtonColor} 
                    roughness={0.1} 
                    metalness={0}
                    reflectivity={0.2}
                    clearcoat={1}
                    clearcoatRoughness={0}
                />
            </mesh>

            {/* Button Border/Inset Shadow */}
            <mesh position={[0, 0, 0.03]}>
                <ringGeometry args={[0.38, 0.4, 64]} />
                <meshBasicMaterial color="#000000" transparent opacity={0.1} />
            </mesh>

            {/* Invisible Hit Area for Menu Button */}
            <mesh position={[0, 0.8, 0.1]} onClick={(e) => { e.stopPropagation(); player.goMenu(); }}>
                <circleGeometry args={[0.4, 32]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
            {/* Invisible Hit Area for Play/Pause Button */}
            <mesh 
                position={[0, -0.8, 0.1]} 
                onPointerDown={handlePlayPauseDown}
                onPointerUp={handlePlayPauseUp}
            >
                <circleGeometry args={[0.4, 32]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
            {/* Invisible Hit Area for Skip Back */}
            <mesh position={[-0.8, 0, 0.1]} onClick={(e) => { e.stopPropagation(); player.prevSong(); }}>
                <circleGeometry args={[0.4, 32]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
            {/* Invisible Hit Area for Skip Forward */}
            <mesh position={[0.8, 0, 0.1]} onClick={(e) => { e.stopPropagation(); player.nextSong(); }}>
                <circleGeometry args={[0.4, 32]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
        </group>
    );
}
