import { useRef, useState, useEffect, useLayoutEffect, Suspense } from 'react';
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
import { Play, Pause, SkipBack, SkipForward, Lock, Unlock, ChevronRight, ChevronLeft, Image as ImageIcon } from 'lucide-react';
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

function CustomBackground({ url }: { url: string }) {
  const texture = useTexture(url);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return <Environment map={texture} />;
}

function ScreenReflex({ brightness }: { brightness: number }) {
  const reflexRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  
  useFrame(() => {
    if (reflexRef.current) {
        // Move the sunbeam across the screen based on camera rotation
        const polar = Math.atan2(camera.position.x, camera.position.z);
        reflexRef.current.position.x = -polar * 4;
        reflexRef.current.rotation.z = polar * 0.4;
        // Fade in/out based on position
        const material = reflexRef.current.material as THREE.MeshBasicMaterial;
        material.opacity = Math.max(0, 0.5 - Math.abs(reflexRef.current.position.x) * 0.15);
    }
  });

  if (brightness < 150) return null; // Show a bit more often

  return (
    <mesh ref={reflexRef} position={[0, 0, 0.05]}>
      <planeGeometry args={[1.2, 8]} />
      <meshBasicMaterial 
        color="#ffffff" 
        transparent 
        opacity={0.4} 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// SVG Data URI for shattered glass to avoid CORS issues
const SHATTER_TEXTURE_URL = `data:image/svg+xml;base64,${btoa(`
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <g stroke="black" stroke-width="2" stroke-linecap="round" opacity="0.8">
    <!-- Main impact cracks -->
    <path d="M256 200 L50 30 M256 200 L450 80 M256 200 L400 450 M256 200 L100 480 M256 200 L280 20 M256 200 L256 492 M256 200 L20 250 M256 200 L492 300 M256 200 L50 400 M256 200 L450 350 M256 200 L120 50" fill="none" stroke-width="2.5"/>
    <path d="M256 200 L350 250 M256 200 L200 150 M256 200 L300 100 M256 200 L150 250" fill="none"/>
    
    <!-- Shatter geometry - inner ring -->
    <path d="M180 120 L250 80 L350 140 L380 220 L300 300 L200 280 L120 200 Z" fill="none" stroke-width="1.2"/>
    <path d="M210 160 L280 140 L330 190 L290 240 L220 230 Z" fill="none" stroke-width="1" opacity="0.6"/>
    
    <!-- Micro cracks and fragments -->
    <path d="M220 200 L256 180 L300 220 L240 250 Z" fill="none" stroke-dasharray="2,2"/>
    <path d="M100 256 L200 220 M412 150 L350 200 M150 100 L200 120 M350 400 L300 380" stroke="black" opacity="0.4"/>
    
    <!-- Secondary cracks branching out -->
    <path d="M50 30 L80 150 M450 80 L380 50 M400 450 L350 380 M100 480 L150 400" opacity="0.5"/>
    <path d="M20 250 L100 240 M492 300 L420 320 M30 30 M480 480" opacity="0.5"/>
    <path d="M280 20 L300 80 M256 492 L230 400 M20 250 L80 280" opacity="0.4" stroke-width="1"/>
    
    <!-- Dense impact point -->
    <circle cx="256" cy="200" r="18" fill="black" fill-opacity="0.2"/>
    <path d="M240 184 L272 216 M272 184 L240 216" stroke-width="4" opacity="0.9"/>
    <path d="M256 180 L256 220 M236 200 L276 200" stroke-width="3" opacity="0.7"/>
  </g>
</svg>
`)}`;

const GLASS_SHINE_URL = `data:image/svg+xml;base64,${btoa(`
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="white" stop-opacity="0.2" />
      <stop offset="40%" stop-color="white" stop-opacity="0.02" />
      <stop offset="45%" stop-color="white" stop-opacity="0.15" />
      <stop offset="55%" stop-color="white" stop-opacity="0" />
      <stop offset="100%" stop-color="white" stop-opacity="0.05" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#shine)" />
</svg>
`)}`;

export default function IpodScene() {
  const player = usePlayer();
  const [isLocked, setIsLocked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isBackgroundExpanded, setIsBackgroundExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyTextureInputRef = useRef<HTMLInputElement>(null);

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (re) => {
              const dataUrl = re.target?.result as string;
              player.setCustomBackground(dataUrl);

              // Detect brightness
              const img = new Image();
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                      canvas.width = 100; // Small size for performance
                      canvas.height = 100;
                      ctx.drawImage(img, 0, 0, 100, 100);
                      const imageData = ctx.getImageData(0, 0, 100, 100);
                      const data = imageData.data;
                      let r = 0, g = 0, b = 0;
                      for (let i = 0; i < data.length; i += 4) {
                          r += data[i];
                          g += data[i+1];
                          b += data[i+2];
                      }
                      const count = data.length / 4;
                      const brightness = (r/count + g/count + b/count) / 3;
                      player.setBackgroundBrightness(brightness);
                  }
              };
              img.src = dataUrl;
          };
          reader.readAsDataURL(file);
      }
  };

  const handleBodyTextureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (re) => {
            const dataUrl = re.target?.result as string;
            player.setBodyTexture(dataUrl);
        };
        reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === 'l') {
            setIsLocked(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div 
      className="w-full h-screen flex flex-col items-center justify-center p-4 overflow-hidden relative selection:bg-none transition-colors duration-500"
      style={{ 
        backgroundColor: player.voidColor,
        backgroundImage: player.customBackground ? `url(${player.customBackground})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      
      {/* Zoom Bar & Lock Button Container - Desktop Bottom */}
      <AnimatePresence>
        {player.showHud && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center z-[100]">
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
                        animate={{ width: 180, opacity: 1, x: 0 }}
                        exit={{ width: 0, opacity: 0, x: 10 }}
                        className="flex items-center gap-4 pl-1"
                      >
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => {
                                    player.setVoidColor('#000000');
                                    player.setCustomBackground(null);
                                }}
                                className={cn(
                                    "w-10 h-10 rounded-full border-2 border-white/20 shadow-lg transition-transform active:scale-90",
                                    (player.voidColor === '#000000' && !player.customBackground) ? "scale-110 border-white ring-2 ring-black/20" : "opacity-80"
                                )}
                                style={{ backgroundColor: '#000000' }}
                                title="Black Void"
                            />
                            <button 
                                onClick={() => {
                                    player.setVoidColor('#ffffff');
                                    player.setCustomBackground(null);
                                }}
                                className={cn(
                                    "w-10 h-10 rounded-full border-2 border-black/20 shadow-lg transition-transform active:scale-90",
                                    (player.voidColor === '#ffffff' && !player.customBackground) ? "scale-110 border-black ring-2 ring-white/20" : "opacity-80"
                                )}
                                style={{ backgroundColor: '#ffffff' }}
                                title="White Void"
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "w-10 h-10 rounded-full border-2 border-black/20 shadow-lg transition-transform active:scale-90 flex items-center justify-center bg-white",
                                    player.customBackground ? "scale-110 border-black ring-2 ring-black/20" : "opacity-80"
                                )}
                                title="Custom Background"
                            >
                                <ImageIcon size={20} className={player.customBackground ? "text-black" : "text-gray-600"} />
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleBackgroundUpload}
                                />
                            </button>
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
                  onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsLocked(!isLocked);
                  }}
                  className={cn(
                      "w-12 h-12 flex-shrink-0 rounded-xl border-2 flex items-center justify-center transition-all duration-200 active:scale-95 z-10 touch-none",
                      isLocked 
                          ? "bg-[#ff6b6b] border-[#d14b4b] shadow-[0_4px_0_#9c3434,0_6px_10px_rgba(0,0,0,0.3)] text-white" 
                          : "bg-[#e8e8e8] border-[#b0b0b0] shadow-[0_4px_0_#888,0_6px_10px_rgba(0,0,0,0.3)] text-[#666]"
                  )}
                  title={isLocked ? "Unlock View (L)" : "Lock View (L)"}
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
          {!player.customBackground && <color attach="background" args={[player.voidColor]} />}
          {player.customBackground && (
            <Suspense fallback={null}>
              <CustomBackground url={player.customBackground} />
            </Suspense>
          )}
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
  
          {!player.customBackground && <Environment preset="city" />}
          <ControlledOrbit isLocked={isLocked} zoom={player.zoom} />
        </Canvas>
      </div>
    </div>
  );
}

function TexturedBodyMaterial({ player, textureUrl }: { player: any, textureUrl: string }) {
  const bodyTexture = useTexture(textureUrl);
  const stickers = player.stickers || [];
  
  useLayoutEffect(() => {
    if (bodyTexture) {
      bodyTexture.wrapS = bodyTexture.wrapT = THREE.RepeatWrapping;
      
      // Implement "cover" logic
      if (bodyTexture.image) {
        const img = bodyTexture.image as HTMLImageElement;
        const imageAspect = img.width / img.height;
        const bodyAspect = 4 / 6.2; // Width/Height of the iPod front
        
        bodyTexture.center.set(0.5, 0.5);
        if (imageAspect > bodyAspect) {
          // Image is wider than iPod - zoom in horizontally
          bodyTexture.repeat.set(bodyAspect / imageAspect, 1);
        } else {
          // Image is taller than iPod - zoom in vertically
          bodyTexture.repeat.set(1, imageAspect / bodyAspect);
        }
      }
    }
  }, [bodyTexture]);
  
  return (
    <group>
      {/* Base Color Mesh */}
      <RoundedBox args={[4, 6.2, 0.45]} radius={0.3} smoothness={12} castShadow receiveShadow>
          <meshPhysicalMaterial 
              color={player.deviceColor} 
              roughness={0.25} 
              metalness={0.05}
              reflectivity={0.4}
              clearcoat={1}
              clearcoatRoughness={0.1}
              envMapIntensity={player.backgroundBrightness > 160 ? 1.6 : 1.0}
              side={THREE.DoubleSide}
          />
      </RoundedBox>

      {/* Texture Overlay Mesh */}
      <RoundedBox args={[4, 6.2, 0.45]} radius={0.3} smoothness={12}>
          <meshPhysicalMaterial 
              map={bodyTexture}
              transparent={true}
              roughness={0.25} 
              metalness={0.05}
              reflectivity={0.4}
              clearcoat={1}
              clearcoatRoughness={0.1}
              envMapIntensity={player.backgroundBrightness > 160 ? 1.6 : 1.0}
              side={THREE.DoubleSide}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
              alphaTest={0.01}
          />
          {stickers[0] && <Sticker url={stickers[0]} position={[-1.4, -0.8, 0.23]} />}
          {stickers[1] && <Sticker url={stickers[1]} position={[1.4, -0.8, 0.23]} />}
          {stickers[2] && <Sticker url={stickers[2]} position={[-1.4, -2.4, 0.23]} />}
          {stickers[3] && <Sticker url={stickers[3]} position={[1.4, -2.4, 0.23]} />}
      </RoundedBox>
    </group>
  );
}

function IpodModel({ player }: { player: any }) {
  const bodyRef = useRef<THREE.Group>(null);
  const stickers = player.stickers || [];
  
  return (
    <group ref={bodyRef}>
      {/* Chassis */}
      {player.bodyTexture ? (
        <TexturedBodyMaterial player={player} textureUrl={player.bodyTexture} />
      ) : (
        <RoundedBox args={[4, 6.2, 0.45]} radius={0.3} smoothness={12} castShadow receiveShadow>
          <meshPhysicalMaterial 
              color={player.deviceColor} 
              roughness={0.25} 
              metalness={0.05}
              reflectivity={0.4}
              clearcoat={1}
              clearcoatRoughness={0.1}
              envMapIntensity={player.backgroundBrightness > 160 ? 1.6 : 1.0}
              side={THREE.DoubleSide}
          />
          {stickers[0] && <Sticker url={stickers[0]} position={[-1.4, -0.8, 0.23]} />}
          {stickers[1] && <Sticker url={stickers[1]} position={[1.4, -0.8, 0.23]} />}
          {stickers[2] && <Sticker url={stickers[2]} position={[-1.4, -2.4, 0.23]} />}
          {stickers[3] && <Sticker url={stickers[3]} position={[1.4, -2.4, 0.23]} />}
        </RoundedBox>
      )}

      {/* Screen Area */}
      <group position={[0, 1.45, 0.23]}>
        {/* Black screen border */}
        <mesh>
          <planeGeometry args={[3.6, 2.75]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        
        {/* Glass Screen Cover for Reflection */}
        <mesh position={[0, 0, 0.01]}>
           <planeGeometry args={[3.2, 2.4]} />
           <meshPhysicalMaterial 
             transparent 
             opacity={player.customBackground ? 0.25 : 0.15}
             roughness={0.02}
             metalness={0.1}
             reflectivity={1}
             clearcoat={1}
             envMapIntensity={player.customBackground ? 4 : 1.5}
           />
           {player.customBackground && <ScreenReflex brightness={player.backgroundBrightness} />}
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
              isSoundEnabled={player.isSoundEnabled}
              bodyTexture={player.bodyTexture}
              isShatteredScreen={player.isShatteredScreen}
              shatterTexture={player.shatterTexture}
              glassShineTextureUrl={GLASS_SHINE_URL}
              defaultShatterTextureUrl={SHATTER_TEXTURE_URL}
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
        
        const pt = getPointOnWheel(e);
        if (!pt) return; // Guard against missing point
        
        const { x, y } = pt;
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
        if (!e.point || !e.object) return null;
        try {
            const localPoint = e.object.worldToLocal(e.point.clone());
            return { x: localPoint.x, y: localPoint.y };
        } catch (err) {
            return null;
        }
    };

    // Global pointer up listener to ensure we stop rotating even if pointer up happens outside
    useEffect(() => {
        const handleGlobalUp = () => {
            if (isRotating) {
                setIsRotating(false);
                lastAngle.current = null;
            }
        };

        window.addEventListener('pointerup', handleGlobalUp);
        return () => window.removeEventListener('pointerup', handleGlobalUp);
    }, [isRotating]);

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
                    envMapIntensity={1.0}
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
                    reflectivity={0.4}
                    clearcoat={1}
                    clearcoatRoughness={0}
                    envMapIntensity={1.2}
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
