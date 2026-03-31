"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, Html } from "@react-three/drei";
import type * as THREE from "three";
import { 
  Box, Circle, Layers, Speaker, Lightbulb, Monitor, 
  Users, Move, RotateCcw, Plus, Trash2, Eye, EyeOff,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Maximize2, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export interface StageElement {
  id: string;
  type: "platform" | "speaker" | "light" | "screen" | "crowd";
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  config: Record<string, unknown>;
  isVisible: boolean;
}

interface StageElementProps {
  element: StageElement;
  isSelected: boolean;
  onSelect: () => void;
}

function StageElementMesh({ element, isSelected, onSelect }: StageElementProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current && element.isVisible) {
      // Animate lights
      if (element.type === "light") {
        const intensity = Math.sin(Date.now() * 0.005) * 0.5 + 1;
        (meshRef.current as any).intensity = intensity;
      }
    }
  });

  const getGeometry = () => {
    switch (element.type) {
      case "platform":
        return <boxGeometry args={[element.scale[0], 0.2, element.scale[2]]} />;
      case "speaker":
        return <boxGeometry args={[0.6, 1.2, 0.4]} />;
      case "light":
        return <coneGeometry args={[0.3, 0.6, 8]} />;
      case "screen":
        return <boxGeometry args={[element.scale[0], element.scale[1], 0.1]} />;
      case "crowd":
        return <cylinderGeometry args={[element.scale[0], element.scale[0], 0.1, 16]} />;
      default:
        return <boxGeometry args={[1, 1, 1]} />;
    }
  };

  const getMaterial = () => {
    const baseColor = element.color;
    const opacity = element.isVisible ? 1 : 0.3;

    if (element.type === "light") {
      return (
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={element.isVisible ? 2 : 0}
          transparent
          opacity={opacity}
        />
      );
    }

    return (
      <meshStandardMaterial
        color={baseColor}
        transparent
        opacity={opacity}
        metalness={0.3}
        roughness={0.7}
      />
    );
  };

  return (
    <group
      ref={meshRef}
      position={element.position}
      rotation={element.rotation}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <mesh>
        {getGeometry()}
        {getMaterial()}
      </mesh>
      {isSelected && (
        <lineSegments>
          <edgesGeometry args={[getGeometry() as any]} />
          <lineBasicMaterial color="#a855f7" linewidth={2} />
        </lineSegments>
      )}
    </group>
  );
}

function Scene({ elements, selectedId, onSelect }: { 
  elements: StageElement[]; 
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#7c3aed" />
      
      <Grid
        args={[50, 50]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#3f3f46"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#52525b"
        fadeDistance={50}
        infiniteGrid
      />

      <OrbitControls 
        makeDefault 
        maxPolarAngle={Math.PI / 2 - 0.1}
        minDistance={2}
        maxDistance={30}
      />

      {elements.map((element) => (
        <StageElementMesh
          key={element.id}
          element={element}
          isSelected={element.id === selectedId}
          onSelect={() => onSelect(element.id)}
        />
      ))}

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} onClick={() => onSelect(null)}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#18181b" transparent opacity={0.5} />
      </mesh>
    </>
  );
}

interface ARStageBuilderProps {
  elements: StageElement[];
  onElementsChange: (elements: StageElement[]) => void;
}

export function ARStageBuilder({ elements, onElementsChange }: ARStageBuilderProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedElement = elements.find(e => e.id === selectedId);

  const addElement = (type: StageElement["type"]) => {
    const config: Record<string, unknown> = {};
    let color = "#6b7280";

    switch (type) {
      case "platform":
        color = "#374151";
        break;
      case "speaker":
        color = "#1f2937";
        break;
      case "light":
        color = "#7c3aed";
        config.intensity = 2;
        break;
      case "screen":
        color = "#0891b2";
        break;
      case "crowd":
        color = "#4b5563";
        break;
    }

    const newElement: StageElement = {
      id: `el-${Date.now()}`,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${elements.length + 1}`,
      position: [0, type === "platform" || type === "crowd" ? 0 : 1, 0],
      rotation: [0, 0, 0],
      scale: type === "crowd" ? [3, 3, 3] : type === "platform" ? [4, 4, 4] : [1, 1, 1],
      color,
      config,
      isVisible: true,
    };

    onElementsChange([...elements, newElement]);
    setSelectedId(newElement.id);
    toast.success(`Added ${type}`);
  };

  const updateElement = (id: string, updates: Partial<StageElement>) => {
    onElementsChange(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const deleteElement = (id: string) => {
    onElementsChange(elements.filter(el => el.id !== id));
    if (selectedId === id) setSelectedId(null);
    toast.success("Element removed");
  };

  const duplicateElement = (id: string) => {
    const el = elements.find(e => e.id === id);
    if (!el) return;
    const newElement: StageElement = {
      ...el,
      id: `el-${Date.now()}`,
      name: `${el.name} (copy)`,
      position: [el.position[0] + 1, el.position[1], el.position[2] + 1],
    };
    onElementsChange([...elements, newElement]);
    setSelectedId(newElement.id);
  };

  return (
    <div className="flex h-full">
      {/* Element Palette */}
      <div className="w-48 border-r border-zinc-800 bg-zinc-950 p-3 space-y-2">
        <p className="text-xs text-zinc-400 uppercase tracking-wider mb-3">Add Elements</p>
        
        <button
          onClick={() => addElement("platform")}
          className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors text-left"
        >
          <Layers className="w-4 h-4 text-violet-400" />
          <span className="text-sm">Platform</span>
        </button>
        
        <button
          onClick={() => addElement("speaker")}
          className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors text-left"
        >
          <Speaker className="w-4 h-4 text-cyan-400" />
          <span className="text-sm">Speaker</span>
        </button>
        
        <button
          onClick={() => addElement("light")}
          className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors text-left"
        >
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          <span className="text-sm">Light</span>
        </button>
        
        <button
          onClick={() => addElement("screen")}
          className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors text-left"
        >
          <Monitor className="w-4 h-4 text-blue-400" />
          <span className="text-sm">Screen</span>
        </button>
        
        <button
          onClick={() => addElement("crowd")}
          className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors text-left"
        >
          <Users className="w-4 h-4 text-pink-400" />
          <span className="text-sm">Crowd Area</span>
        </button>

        {/* Element List */}
        {elements.length > 0 && (
          <>
            <div className="border-t border-zinc-800 my-3" />
            <p className="text-xs text-zinc-400 uppercase tracking-wider mb-2">Stage Elements</p>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {elements.map(el => (
                <button
                  key={el.id}
                  onClick={() => setSelectedId(el.id)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-colors ${
                    selectedId === el.id 
                      ? "bg-violet-600/20 text-violet-300" 
                      : "text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: el.color }}
                  />
                  <span className="truncate">{el.name}</span>
                  {!el.isVisible && <EyeOff className="w-3 h-3 ml-auto" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 relative">
        <Canvas camera={{ position: [8, 8, 8], fov: 50 }}>
          <Scene 
            elements={elements} 
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </Canvas>

        {/* Help overlay */}
        <div className="absolute bottom-4 left-4 bg-zinc-900/90 backdrop-blur rounded-lg p-3 text-xs text-zinc-400">
          <p>🖱️ Drag to rotate • Scroll to zoom • Click to select</p>
        </div>
      </div>

      {/* Properties Panel */}
      {selectedElement && (
        <div className="w-64 border-l border-zinc-800 bg-zinc-950 p-4 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">Properties</h3>
            <div className="flex gap-1">
              <button
                onClick={() => duplicateElement(selectedElement.id)}
                className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
                title="Duplicate"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => deleteElement(selectedElement.id)}
                className="p-1.5 rounded hover:bg-red-900/30 text-zinc-400 hover:text-red-400"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-zinc-500">Name</Label>
            <Input
              value={selectedElement.name}
              onChange={(e) => updateElement(selectedElement.id, { name: e.target.value })}
              className="h-8 bg-zinc-900 border-zinc-700 text-sm"
            />
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Visible</span>
            <button
              onClick={() => updateElement(selectedElement.id, { isVisible: !selectedElement.isVisible })}
              className={`p-1.5 rounded ${selectedElement.isVisible ? "bg-violet-600/20 text-violet-400" : "bg-zinc-800 text-zinc-500"}`}
            >
              {selectedElement.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Color picker */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-500">Color</Label>
            <div className="flex gap-2 flex-wrap">
              {["#6b7280", "#374151", "#7c3aed", "#0891b2", "#ec4899", "#eab308", "#22c55e", "#ef4444"].map(color => (
                <button
                  key={color}
                  onClick={() => updateElement(selectedElement.id, { color })}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    selectedElement.color === color ? "border-white" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Position controls */}
          <div className="space-y-3">
            <Label className="text-xs text-zinc-500">Position</Label>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ChevronRight className="w-3 h-3 text-zinc-500" />
                <span className="text-xs text-zinc-400 w-8">X</span>
                <Slider
                  value={[selectedElement.position[0]]}
                  onValueChange={([v]) => updateElement(selectedElement.id, { position: [v, selectedElement.position[1], selectedElement.position[2]] })}
                  min={-10}
                  max={10}
                  step={0.5}
                  className="flex-1"
                />
                <span className="text-xs text-violet-400 w-8 text-right">{selectedElement.position[0]}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <ChevronUp className="w-3 h-3 text-zinc-500" />
                <span className="text-xs text-zinc-400 w-8">Y</span>
                <Slider
                  value={[selectedElement.position[1]]}
                  onValueChange={([v]) => updateElement(selectedElement.id, { position: [selectedElement.position[0], v, selectedElement.position[2]] })}
                  min={0}
                  max={10}
                  step={0.5}
                  className="flex-1"
                />
                <span className="text-xs text-violet-400 w-8 text-right">{selectedElement.position[1]}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <ChevronDown className="w-3 h-3 text-zinc-500" />
                <span className="text-xs text-zinc-400 w-8">Z</span>
                <Slider
                  value={[selectedElement.position[2]]}
                  onValueChange={([v]) => updateElement(selectedElement.id, { position: [selectedElement.position[0], selectedElement.position[1], v] })}
                  min={-10}
                  max={10}
                  step={0.5}
                  className="flex-1"
                />
                <span className="text-xs text-violet-400 w-8 text-right">{selectedElement.position[2]}</span>
              </div>
            </div>
          </div>

          {/* Scale controls */}
          <div className="space-y-3">
            <Label className="text-xs text-zinc-500">Scale</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 w-8">Size</span>
              <Slider
                value={[selectedElement.scale[0]]}
                onValueChange={([v]) => updateElement(selectedElement.id, { scale: [v, v, v] })}
                min={0.5}
                max={8}
                step={0.5}
                className="flex-1"
              />
              <span className="text-xs text-violet-400 w-8 text-right">{selectedElement.scale[0]}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}