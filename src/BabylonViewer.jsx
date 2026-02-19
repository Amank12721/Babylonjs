import { useEffect, useRef, useState } from 'react';
import { 
  Engine, Scene, ArcRotateCamera, Vector3, SceneLoader, 
  HemisphericLight, DirectionalLight, Color3,
  MeshBuilder, StandardMaterial, Color4, ShaderMaterial, Vector2, RawTexture, Texture, ShadowGenerator,
  WebXRDefaultExperience, WebXRState
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF/2.0';

// Default settings (outside component to avoid recreation)
const defaultWaterParams = {
  timeSpeed: 0.4,
  intensity: 0.005,
  alpha: 0.4,
  uvScaleX: 1.4,
  uvScaleY: 1.2,
  uvScaleZ: 1.5,
  uvRotation: 0.6,
  useAlphaHashed: true,
  backfaceCulling: true,
  depthWrite: true,
  separateCullingPass: true,
  cullMode: 'none',
  renderingGroupId: 0,
  ditherScale: 2,
  useDepthPeeling: false,
  foamAmount: 0.7,
  foamThreshold: 0.2,
  foamSharpness: 1,
  useVertexGroup: true,
  // Beach/Ocean color gradient
  deepWaterR: 0.0,
  deepWaterG: 0.25,
  deepWaterB: 0.5,
  shallowWaterR: 0.0,
  shallowWaterG: 0.7,
  shallowWaterB: 0.8,
  foamR: 0.95,
  foamG: 0.98,
  foamB: 1.0,
  roughness: 0.5,
  // Wave parameters
  waveAmplitude: 0.3,
  waveFrequency: 1.0,
  // Texture noise parameters
  useTextureNoise: false,
  textureNoiseScale: 1.0,
  textureNoiseStrength: 0.5,
  textureNoiseSpeed: 0.2,
  // Shadow parameters
  shadowDarkness: 0.7,
  shadowBlur: 8,  // Reduced from 32 for better performance
  // Visualizer
  showVertexWeights: false
};

// Load saved settings from localStorage or use defaults
const loadSavedSettings = () => {
  try {
    const saved = localStorage.getItem('waterShaderSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      console.log('Loaded saved settings:', parsed);
      // Merge with defaults to ensure all properties exist
      return { ...defaultWaterParams, ...parsed };
    }
  } catch (err) {
    console.error('Failed to load saved settings:', err);
  }
  console.log('Using default settings');
  return defaultWaterParams;
};

export default function BabylonViewer() {
  const canvasRef = useRef(null);
  const [objectInfo, setObjectInfo] = useState([]);
  const [error, setError] = useState(null);
  const [waterParams, setWaterParams] = useState(loadSavedSettings);
  const [showControls, setShowControls] = useState(false); // Hidden by default
  const [fps, setFps] = useState(0);
  const [vrSupported, setVrSupported] = useState(false);
  const [inVR, setInVR] = useState(false);
  const waterMaterialRef = useRef(null);
  const sceneRef = useRef(null);
  const waterMeshRef = useRef(null);
  const shadowGeneratorRef = useRef(null);

  // Keyboard shortcut: Ctrl+Q to toggle controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'q') {
        e.preventDefault();
        setShowControls(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('waterShaderSettings', JSON.stringify(waterParams));
      console.log('Saved settings to localStorage:', waterParams);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }, [waterParams]);

  useEffect(() => {
    if (waterMaterialRef.current) {
      waterMaterialRef.current.setFloat('alphaValue', waterParams.alpha);
      waterMaterialRef.current.setVector3('uvScale', new Vector3(waterParams.uvScaleX, waterParams.uvScaleY, waterParams.uvScaleZ));
      waterMaterialRef.current.setFloat('uvRotation', waterParams.uvRotation);
      waterMaterialRef.current.setFloat('ditherScale', waterParams.ditherScale);
      waterMaterialRef.current.setFloat('foamAmount', waterParams.foamAmount);
      waterMaterialRef.current.setFloat('foamThreshold', waterParams.foamThreshold);
      waterMaterialRef.current.setFloat('foamSharpness', waterParams.foamSharpness);
      waterMaterialRef.current.setFloat('useVertexGroup', waterParams.useVertexGroup ? 1.0 : 0.0);
      waterMaterialRef.current.setVector3('deepWaterColor', new Vector3(waterParams.deepWaterR, waterParams.deepWaterG, waterParams.deepWaterB));
      waterMaterialRef.current.setVector3('shallowWaterColor', new Vector3(waterParams.shallowWaterR, waterParams.shallowWaterG, waterParams.shallowWaterB));
      waterMaterialRef.current.setVector3('foamColor', new Vector3(waterParams.foamR, waterParams.foamG, waterParams.foamB));
      waterMaterialRef.current.setFloat('roughness', waterParams.roughness);
      waterMaterialRef.current.setFloat('waveAmplitude', waterParams.waveAmplitude);
      waterMaterialRef.current.setFloat('waveFrequency', waterParams.waveFrequency);
      waterMaterialRef.current.setFloat('showVertexWeights', waterParams.showVertexWeights ? 1.0 : 0.0);
      waterMaterialRef.current.setFloat('useTextureNoise', waterParams.useTextureNoise ? 1.0 : 0.0);
      waterMaterialRef.current.setFloat('textureNoiseScale', waterParams.textureNoiseScale);
      waterMaterialRef.current.setFloat('textureNoiseStrength', waterParams.textureNoiseStrength);
      waterMaterialRef.current.setFloat('textureNoiseSpeed', waterParams.textureNoiseSpeed);
    }
  }, [waterParams.alpha, waterParams.uvScaleX, waterParams.uvScaleY, waterParams.uvScaleZ, waterParams.uvRotation, waterParams.ditherScale, waterParams.foamAmount, waterParams.foamThreshold, waterParams.foamSharpness, waterParams.useVertexGroup, waterParams.deepWaterR, waterParams.deepWaterG, waterParams.deepWaterB, waterParams.shallowWaterR, waterParams.shallowWaterG, waterParams.shallowWaterB, waterParams.foamR, waterParams.foamG, waterParams.foamB, waterParams.roughness, waterParams.waveAmplitude, waterParams.waveFrequency, waterParams.showVertexWeights, waterParams.useTextureNoise, waterParams.textureNoiseScale, waterParams.textureNoiseStrength, waterParams.textureNoiseSpeed]);

  // Update shadow settings
  useEffect(() => {
    if (shadowGeneratorRef.current) {
      shadowGeneratorRef.current.darkness = waterParams.shadowDarkness;
      shadowGeneratorRef.current.blurKernel = waterParams.shadowBlur;
    }
  }, [waterParams.shadowDarkness, waterParams.shadowBlur]);

  // Recreate material when alpha hashed mode changes
  useEffect(() => {
    if (sceneRef.current && waterMaterialRef.current) {
      const mesh = sceneRef.current.meshes.find(m => m.id === 'water' || m.name.toLowerCase().includes('water'));
      if (mesh) {
        createWaterMaterial(mesh, sceneRef.current);
      }
    }
  }, [waterParams.useAlphaHashed, waterParams.backfaceCulling, waterParams.depthWrite, waterParams.separateCullingPass, waterParams.cullMode, waterParams.renderingGroupId, waterParams.useDepthPeeling]);

  const createWaterMaterial = (mesh, scene) => {
    try {
      // Check if mesh has vertex group data in metadata
      let foamWeights = null;
      let waveWeights = null;
      
      if (mesh.metadata && mesh.metadata.gltf && mesh.metadata.gltf.extras) {
        const extras = mesh.metadata.gltf.extras;
        console.log('Found vertex group data:', extras);
        
        // Process foam vertex group
        if (extras.vertex_groups && extras.vertex_groups.foam && extras.vertices) {
          const weightMap = new Map();
          extras.vertices.forEach(vertex => {
            const foamGroup = vertex.groups?.find(g => g.name === 'foam');
            if (foamGroup) {
              weightMap.set(vertex.index, foamGroup.weight);
            }
          });
          
          const positions = mesh.getVerticesData('position');
          const vertexCount = positions.length / 3;
          
          foamWeights = new Float32Array(vertexCount);
          for (let i = 0; i < vertexCount; i++) {
            foamWeights[i] = weightMap.get(i) || 0.0;
          }
          
          console.log('Created foam weights array:', foamWeights.length, 'vertices');
        }
        
        // Process waves vertex group
        if (extras.vertex_groups && extras.vertex_groups.waves && extras.vertices) {
          const weightMap = new Map();
          extras.vertices.forEach(vertex => {
            const wavesGroup = vertex.groups?.find(g => g.name === 'waves');
            if (wavesGroup) {
              weightMap.set(vertex.index, wavesGroup.weight);
            }
          });
          
          const positions = mesh.getVerticesData('position');
          const vertexCount = positions.length / 3;
          
          waveWeights = new Float32Array(vertexCount);
          for (let i = 0; i < vertexCount; i++) {
            waveWeights[i] = weightMap.get(i) || 0.0; // Default to 0.0 (no waves if not painted)
          }
          
          console.log('Created wave weights array:', waveWeights.length, 'vertices');
          console.log('Sample wave weights:', waveWeights.slice(0, 20));
        }
        
        // Set vertex colors: R = foam, G = waves
        if (foamWeights || waveWeights) {
          const positions = mesh.getVerticesData('position');
          const vertexCount = positions.length / 3;
          const colors = new Float32Array(vertexCount * 4);
          
          for (let i = 0; i < vertexCount; i++) {
            colors[i * 4] = foamWeights ? foamWeights[i] : 0.0;      // R = foam weight
            colors[i * 4 + 1] = waveWeights ? waveWeights[i] : 0.0;  // G = wave weight (default 0 if no waves group)
            colors[i * 4 + 2] = 0.0;                                  // B
            colors[i * 4 + 3] = 1.0;                                  // A
          }
          
          mesh.setVerticesData('color', colors);
          console.log('Set vertex colors with foam and wave weights');
        }
      }
      
      const hasVertexColors = mesh.isVerticesDataPresent('color');
      console.log('Water mesh has vertex colors:', hasVertexColors);
    
    const shaderMaterial = new ShaderMaterial('waterShader', scene, {
      vertexSource: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        attribute vec4 color;
        uniform mat4 worldViewProjection;
        uniform mat4 world;
        uniform float iTime;
        uniform vec3 uvScale;
        uniform float waveAmplitude;
        uniform float waveFrequency;
        uniform float useTextureNoise;
        uniform float textureNoiseScale;
        uniform float textureNoiseStrength;
        uniform float textureNoiseSpeed;
        uniform sampler2D noiseTexture;
        varying vec2 vUV;
        varying vec4 vPosition;
        varying vec4 vColor;
        varying vec3 vWorldPos;
        
        // Smooth noise for waves
        vec2 SmoothNoise22(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
          float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);
          float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
          float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
          return vec2(
            mix(mix(a, b, f.x), mix(c, d, f.x), f.y),
            mix(mix(a, b, f.x), mix(c, d, f.x), f.y)
          );
        }
        
        // Water wave shape
        float Water_WaveShape(vec2 uv, float chop) {
          uv += SmoothNoise22(uv * 0.6) * 2.0;
          vec2 w = sin(uv * 2.0) * 0.5 + 0.5;
          w = 1.0 - pow(1.0 - w, vec2(chop));
          float h = (w.x + w.y) * 0.5;
          return h;
        }
        
        // Water waves
        float Water_GetWaves(vec2 mapPos, float time) {
          float a = 1.0;
          float h = 0.0;
          float tot = 0.0;
          float r = 2.5;
          mat2 rm = mat2(cos(r), -sin(r), sin(r), cos(r)) * 2.1;
          vec2 aPos = mapPos;
          float waveTime = time;
          float chopA = 0.7;
          float chopB = 0.9;
          int maxOctaveCount = 5;
          
          for (int octave = 0; octave < maxOctaveCount; octave++) {
            float chop = mix(chopA, chopB, float(octave) / float(maxOctaveCount - 1));
            h += Water_WaveShape(aPos + waveTime, chop) * a;
            tot += a;
            aPos = aPos * rm;
            a *= 0.3;
            waveTime *= 1.6;
          }
          return h / tot;
        }
        
        void main(void) {
          // Note: position already includes morph target deformations from Babylon.js
          // The mesh geometry is updated by Babylon before it reaches the shader
          vec2 mapPos = uv * uvScale.xy * 4.0 * waveFrequency;
          float waveHeight = Water_GetWaves(mapPos, iTime);
          
          // Get wave weight from vertex color green channel
          float waveWeight = color.g;
          
          // Add wave displacement on top of the morphed position
          vec3 finalPosition = position;
          finalPosition.y += (waveHeight - 0.5) * waveAmplitude * waveWeight;
          
          gl_Position = worldViewProjection * vec4(finalPosition, 1.0);
          vUV = uv;
          vPosition = gl_Position;
          vColor = color;
          vWorldPos = (world * vec4(finalPosition, 1.0)).xyz;
        }
      `,
      fragmentSource: `
        precision highp float;
        varying vec2 vUV;
        varying vec4 vPosition;
        varying vec4 vColor;
        uniform float iTime;
        uniform vec2 iResolution;
        uniform vec3 uvScale;
        uniform float uvRotation;
        uniform float alphaValue;
        uniform float useAlphaHashed;
        uniform float ditherScale;
        uniform float foamAmount;
        uniform float foamThreshold;
        uniform float foamSharpness;
        uniform float useVertexGroup;
        uniform vec3 deepWaterColor;
        uniform vec3 shallowWaterColor;
        uniform vec3 foamColor;
        uniform float roughness;
        uniform float showVertexWeights;
        uniform float useTextureNoise;
        uniform float textureNoiseScale;
        uniform float textureNoiseStrength;
        uniform float textureNoiseSpeed;
        uniform sampler2D noiseTexture;
        
        #define PI 3.14159265359
        
        vec2 rotateUV(vec2 uv, float rotation) {
          float mid = 0.5;
          return vec2(
            cos(rotation) * (uv.x - mid) + sin(rotation) * (uv.y - mid) + mid,
            cos(rotation) * (uv.y - mid) - sin(rotation) * (uv.x - mid) + mid
          );
        }
        
        float bayerDither8x8(vec2 screenPos) {
          int x = int(mod(screenPos.x, 8.0));
          int y = int(mod(screenPos.y, 8.0));
          int index = x + y * 8;
          float bayerValues[64];
          bayerValues[0] = 0.0; bayerValues[1] = 32.0; bayerValues[2] = 8.0; bayerValues[3] = 40.0;
          bayerValues[4] = 2.0; bayerValues[5] = 34.0; bayerValues[6] = 10.0; bayerValues[7] = 42.0;
          bayerValues[8] = 48.0; bayerValues[9] = 16.0; bayerValues[10] = 56.0; bayerValues[11] = 24.0;
          bayerValues[12] = 50.0; bayerValues[13] = 18.0; bayerValues[14] = 58.0; bayerValues[15] = 26.0;
          bayerValues[16] = 12.0; bayerValues[17] = 44.0; bayerValues[18] = 4.0; bayerValues[19] = 36.0;
          bayerValues[20] = 14.0; bayerValues[21] = 46.0; bayerValues[22] = 6.0; bayerValues[23] = 38.0;
          bayerValues[24] = 60.0; bayerValues[25] = 28.0; bayerValues[26] = 52.0; bayerValues[27] = 20.0;
          bayerValues[28] = 62.0; bayerValues[29] = 30.0; bayerValues[30] = 54.0; bayerValues[31] = 22.0;
          bayerValues[32] = 3.0; bayerValues[33] = 35.0; bayerValues[34] = 11.0; bayerValues[35] = 43.0;
          bayerValues[36] = 1.0; bayerValues[37] = 33.0; bayerValues[38] = 9.0; bayerValues[39] = 41.0;
          bayerValues[40] = 51.0; bayerValues[41] = 19.0; bayerValues[42] = 59.0; bayerValues[43] = 27.0;
          bayerValues[44] = 49.0; bayerValues[45] = 17.0; bayerValues[46] = 57.0; bayerValues[47] = 25.0;
          bayerValues[48] = 15.0; bayerValues[49] = 47.0; bayerValues[50] = 7.0; bayerValues[51] = 39.0;
          bayerValues[52] = 13.0; bayerValues[53] = 45.0; bayerValues[54] = 5.0; bayerValues[55] = 37.0;
          bayerValues[56] = 63.0; bayerValues[57] = 31.0; bayerValues[58] = 55.0; bayerValues[59] = 23.0;
          bayerValues[60] = 61.0; bayerValues[61] = 29.0; bayerValues[62] = 53.0; bayerValues[63] = 21.0;
          return (bayerValues[index] + 0.5) / 64.0;
        }
        
        // Smooth noise from Castaway
        vec2 SmoothNoise22(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
          float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);
          float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
          float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
          return vec2(
            mix(mix(a, b, f.x), mix(c, d, f.x), f.y),
            mix(mix(a, b, f.x), mix(c, d, f.x), f.y)
          );
        }
        
        // Noise for foam
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        
        // Water wave shape from Castaway
        float Water_WaveShape(vec2 uv, float chop) {
          uv += SmoothNoise22(uv * 0.6) * 2.0;
          vec2 w = sin(uv * 2.0) * 0.5 + 0.5;
          w = 1.0 - pow(1.0 - w, vec2(chop));
          float h = (w.x + w.y) * 0.5;
          return h;
        }
        
        // Water waves from Castaway
        float Water_GetWaves(vec2 mapPos, float time) {
          float a = 1.0;
          float h = 0.0;
          float tot = 0.0;
          float r = 2.5;
          mat2 rm = mat2(cos(r), -sin(r), sin(r), cos(r)) * 2.1;
          vec2 aPos = mapPos;
          float waveTime = time;
          float chopA = 0.7;
          float chopB = 0.9;
          int maxOctaveCount = 5;
          
          for (int octave = 0; octave < maxOctaveCount; octave++) {
            float chop = mix(chopA, chopB, float(octave) / float(maxOctaveCount - 1));
            h += Water_WaveShape(aPos + waveTime, chop) * a;
            tot += a;
            aPos = aPos * rm;
            a *= 0.3;
            waveTime *= 1.6;
          }
          return h / tot;
        }
        
        void main(void) {
          // Vertex weight visualizer mode
          if (showVertexWeights > 0.5) {
            // Show vertex weights as colors
            // Red = foam weight, Green = wave weight
            vec3 visualColor = vec3(vColor.r, vColor.g, 0.0);
            gl_FragColor = vec4(visualColor, 1.0);
            return;
          }
          
          vec2 uv = rotateUV(vUV, uvRotation);
          vec2 mapPos = uv * uvScale.xy * 4.0;
          
          float waves = Water_GetWaves(mapPos, iTime);
          
          // Apply roughness to waves
          float roughWaves = mix(waves, pow(waves, 1.0 + roughness * 2.0), roughness);
          
          // Get vertex group weight (stored in vertex color red channel)
          float vertexWeight = vColor.r;
          
          // Animated foam noise
          float foamNoise = noise(mapPos * 8.0 + iTime * 0.5);
          foamNoise += noise(mapPos * 16.0 - iTime * 0.3) * 0.5;
          foamNoise /= 1.5;
          
          // Add texture-based foam ripples if enabled
          if (useTextureNoise > 0.5) {
            vec2 noiseUV1 = vUV * textureNoiseScale;
            noiseUV1 += iTime * textureNoiseSpeed * 0.05;
            
            vec2 noiseUV2 = vUV * textureNoiseScale * 2.3;
            noiseUV2 -= iTime * textureNoiseSpeed * 0.03;
            
            float texNoise1 = texture2D(noiseTexture, noiseUV1).r;
            float texNoise2 = texture2D(noiseTexture, noiseUV2).r;
            float texNoise = texNoise1 * 0.6 + texNoise2 * 0.4;
            
            // Blend texture noise with procedural foam noise
            foamNoise = mix(foamNoise, texNoise, textureNoiseStrength);
          }
          
          // Shore foam based on vertex group or edge detection
          float foamMask = 0.0;
          
          if (useVertexGroup > 0.5) {
            // Use vertex group weight to control foam location
            foamMask = vertexWeight;
          } else {
            // Fallback to edge-based foam
            vec2 edgeDist = abs(vUV - 0.5) * 2.0;
            float distToEdge = max(edgeDist.x, edgeDist.y);
            foamMask = smoothstep(0.6, 1.0, distToEdge);
          }
          
          // Combine wave peaks with foam mask
          float waveFoam = smoothstep(foamThreshold, 1.0, roughWaves);
          float combinedFoam = waveFoam * 0.3 + foamMask * foamAmount;
          
          // Add noise to foam edges
          combinedFoam = smoothstep(0.3, 0.7, combinedFoam + foamNoise * 0.3);
          combinedFoam = pow(combinedFoam, foamSharpness);
          
          // Use custom colors with roughness affecting the gradient
          vec3 colour = mix(deepWaterColor, shallowWaterColor, roughWaves * 0.7);
          colour = mix(colour, foamColor, combinedFoam);
          
          if (useAlphaHashed > 0.5) {
            vec2 screenPos = gl_FragCoord.xy * ditherScale;
            float dither = bayerDither8x8(screenPos);
            if (alphaValue < dither) {
              discard;
            }
            gl_FragColor = vec4(colour, 1.0);
          } else {
            gl_FragColor = vec4(colour, alphaValue);
          }
        }
      `
    }, {
      attributes: ['position', 'uv', 'color'],
      uniforms: ['worldViewProjection', 'world', 'iTime', 'iResolution', 'uvScale', 'uvRotation', 'alphaValue', 'useAlphaHashed', 'ditherScale', 'foamAmount', 'foamThreshold', 'foamSharpness', 'useVertexGroup', 'deepWaterColor', 'shallowWaterColor', 'foamColor', 'roughness', 'waveAmplitude', 'waveFrequency', 'showVertexWeights', 'useTextureNoise', 'textureNoiseScale', 'textureNoiseStrength', 'textureNoiseSpeed'],
      samplers: ['noiseTexture']
    });
    
    // Note: ShaderMaterial doesn't automatically apply morph targets
    // We need to manually bake them into the mesh geometry each frame
    if (mesh.morphTargetManager) {
      console.log('Water mesh has morph targets - setting up manual geometry updates');
      const manager = mesh.morphTargetManager;
      
      // Make sure the mesh is updatable
      mesh.makeGeometryUnique();
      const geometry = mesh.geometry;
      if (geometry) {
        geometry.setVerticesData('position', mesh.getVerticesData('position'), true); // true = updatable
      }
      
      const basePositions = mesh.getVerticesData('position').slice(); // Copy original
      console.log('Base positions count:', basePositions.length / 3, 'vertices');
      
      let frameCount = 0;
      let currentFoamAmount = 0.4; // Track current foam for smooth transitions
      
      scene.registerBeforeRender(() => {
        frameCount++;
        
        // Debug every 60 frames
        if (frameCount % 60 === 0) {
          console.log('Morph target influences:');
          for (let i = 0; i < manager.numTargets; i++) {
            const target = manager.getTarget(i);
            console.log(`  ${target.name}: ${target.influence.toFixed(3)}`);
          }
        }
        
        // Start with base positions
        const positions = basePositions.slice();
        
        // Apply each morph target
        let anyInfluence = false;
        for (let i = 0; i < manager.numTargets; i++) {
          const target = manager.getTarget(i);
          const influence = target.influence;
          
          if (Math.abs(influence) > 0.001) {
            anyInfluence = true;
            const targetPositions = target.getPositions();
            if (targetPositions) {
              for (let v = 0; v < positions.length; v++) {
                // Blend: finalPos = basePos + (targetPos - basePos) * influence
                positions[v] += (targetPositions[v] - basePositions[v]) * influence;
              }
            }
          }
        }
        
        // Always update to ensure shader sees the changes
        mesh.updateVerticesData('position', positions, false, true); // true = no normals recalc
        
        // Smoothly animate foam amount based on Key 1 influence
        if (manager.numTargets > 0) {
          const key1Influence = manager.getTarget(0).influence;
          // Map influence to foam: 0.0 -> 0.8, 1.0 -> 0.0 (absorb/disappear)
          const targetFoamAmount = 0.8 * (1.0 - key1Influence);
          
          // Smooth interpolation to avoid flickering
          const lerpSpeed = 0.1; // Adjust for faster/slower transitions
          currentFoamAmount += (targetFoamAmount - currentFoamAmount) * lerpSpeed;
          
          if (waterMaterialRef.current) {
            waterMaterialRef.current.setFloat('foamAmount', currentFoamAmount);
          }
        }
      });
      
      console.log('Morph target geometry updates registered');
    }
    
    shaderMaterial.setFloat('iTime', 0);
    shaderMaterial.setVector2('iResolution', new Vector2(1024, 1024));
    shaderMaterial.setVector3('uvScale', new Vector3(waterParams.uvScaleX, waterParams.uvScaleY, waterParams.uvScaleZ));
    shaderMaterial.setFloat('uvRotation', waterParams.uvRotation);
    shaderMaterial.setFloat('alphaValue', waterParams.alpha);
    shaderMaterial.setFloat('useAlphaHashed', waterParams.useAlphaHashed ? 1.0 : 0.0);
    shaderMaterial.setFloat('ditherScale', waterParams.ditherScale);
    shaderMaterial.setFloat('foamAmount', waterParams.foamAmount);
    shaderMaterial.setFloat('foamThreshold', waterParams.foamThreshold);
    shaderMaterial.setFloat('foamSharpness', waterParams.foamSharpness);
    shaderMaterial.setFloat('useVertexGroup', waterParams.useVertexGroup ? 1.0 : 0.0);
    shaderMaterial.setVector3('deepWaterColor', new Vector3(waterParams.deepWaterR, waterParams.deepWaterG, waterParams.deepWaterB));
    shaderMaterial.setVector3('shallowWaterColor', new Vector3(waterParams.shallowWaterR, waterParams.shallowWaterG, waterParams.shallowWaterB));
    shaderMaterial.setVector3('foamColor', new Vector3(waterParams.foamR, waterParams.foamG, waterParams.foamB));
    shaderMaterial.setFloat('roughness', waterParams.roughness);
    shaderMaterial.setFloat('waveAmplitude', waterParams.waveAmplitude);
    shaderMaterial.setFloat('waveFrequency', waterParams.waveFrequency);
    shaderMaterial.setFloat('showVertexWeights', waterParams.showVertexWeights ? 1.0 : 0.0);
    shaderMaterial.setFloat('useTextureNoise', waterParams.useTextureNoise ? 1.0 : 0.0);
    shaderMaterial.setFloat('textureNoiseScale', waterParams.textureNoiseScale);
    shaderMaterial.setFloat('textureNoiseStrength', waterParams.textureNoiseStrength);
    shaderMaterial.setFloat('textureNoiseSpeed', waterParams.textureNoiseSpeed);
    
    // Get noise texture from sky (reuse it)
    const skyMaterial = scene.getMaterialByName('skyShader');
    if (skyMaterial && skyMaterial.getTexture) {
      const skyNoiseTexture = scene.textures.find(t => t.name === 'skyNoise');
      if (skyNoiseTexture) {
        shaderMaterial.setTexture('noiseTexture', skyNoiseTexture);
      }
    }
    
    // Bind world matrix for vertex displacement
    shaderMaterial.setMatrix('world', mesh.getWorldMatrix());
    
    // Set cull mode
    if (waterParams.cullMode === 'back') {
      shaderMaterial.backFaceCulling = true;
      shaderMaterial.sideOrientation = 0; // Front side
    } else if (waterParams.cullMode === 'front') {
      shaderMaterial.backFaceCulling = true;
      shaderMaterial.sideOrientation = 1; // Back side
    } else {
      shaderMaterial.backFaceCulling = false;
      shaderMaterial.sideOrientation = 2; // Double sided
    }
    
    if (waterParams.useAlphaHashed) {
      shaderMaterial.needAlphaTesting = () => true;
      shaderMaterial.needAlphaBlending = () => false;
      shaderMaterial.disableDepthWrite = !waterParams.depthWrite;
      shaderMaterial.forceDepthWrite = waterParams.depthWrite;
      shaderMaterial.transparencyMode = 1;
      shaderMaterial.separateCullingPass = waterParams.separateCullingPass;
    } else if (waterParams.useDepthPeeling) {
      // Depth peeling mode - render back faces first, then front faces
      shaderMaterial.needAlphaTesting = () => false;
      shaderMaterial.needAlphaBlending = () => true;
      shaderMaterial.disableDepthWrite = false;
      shaderMaterial.transparencyMode = 2;
      shaderMaterial.separateCullingPass = true;
      shaderMaterial.depthFunction = 515; // LEQUAL
    } else {
      shaderMaterial.needAlphaTesting = () => false;
      shaderMaterial.needAlphaBlending = () => true;
      shaderMaterial.disableDepthWrite = !waterParams.depthWrite;
      shaderMaterial.transparencyMode = 2;
      shaderMaterial.separateCullingPass = waterParams.separateCullingPass;
    }
    
    mesh.material = shaderMaterial;
    mesh.renderingGroupId = waterParams.renderingGroupId;
    mesh.alphaIndex = 1000;
    waterMaterialRef.current = shaderMaterial;
    console.log('Water shader mode:', waterParams.useAlphaHashed ? 'Alpha Hashed' : 'Alpha Blend');
    } catch (error) {
      console.error('Error creating water material:', error);
      throw error;
    }
  };


  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new Engine(canvasRef.current, true, {
      preserveDrawingBuffer: false,
      stencil: false,
      antialias: true,
      powerPreference: "high-performance"
    });
    const scene = new Scene(engine);
    sceneRef.current = scene;
    scene.clearColor = new Color4(0.5, 0.7, 0.9, 1);
    
    // Performance optimizations
    scene.autoClear = false;
    scene.autoClearDepthAndStencil = false;
    engine.enableOfflineSupport = false;
    
    // Enable depth pre-pass for better transparency sorting
    scene.setRenderingAutoClearDepthStencil(1, true, true, true);

    const camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 3, 10, Vector3.Zero(), scene);
    camera.attachControl(canvasRef.current, true);
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 50;

    // WASD Keyboard Controls
    const keys = { w: false, a: false, s: false, d: false, shift: false, space: false };
    const moveSpeed = 0.3;
    const fastMoveSpeed = 0.6;
    
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w') keys.w = true;
      if (key === 'a') keys.a = true;
      if (key === 's') keys.s = true;
      if (key === 'd') keys.d = true;
      if (key === 'shift') keys.shift = true;
      if (key === ' ') keys.space = true;
    });
    
    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w') keys.w = false;
      if (key === 'a') keys.a = false;
      if (key === 's') keys.s = false;
      if (key === 'd') keys.d = false;
      if (key === 'shift') keys.shift = false;
      if (key === ' ') keys.space = false;
    });
    
    // Update camera position based on WASD input
    scene.onBeforeRenderObservable.add(() => {
      const speed = keys.shift ? fastMoveSpeed : moveSpeed;
      
      // Get camera forward and right vectors
      const forward = camera.target.subtract(camera.position).normalize();
      const right = Vector3.Cross(forward, Vector3.Up()).normalize();
      
      // Move camera target (what we're looking at)
      if (keys.w) {
        camera.target.addInPlace(forward.scale(speed));
      }
      if (keys.s) {
        camera.target.addInPlace(forward.scale(-speed));
      }
      if (keys.a) {
        camera.target.addInPlace(right.scale(speed));
      }
      if (keys.d) {
        camera.target.addInPlace(right.scale(-speed));
      }
      if (keys.space) {
        camera.target.y += speed * 0.5;
      }
      if (keys.shift && !keys.w && !keys.s && !keys.a && !keys.d) {
        camera.target.y -= speed * 0.5;
      }
    });

    // Sky-like lighting
    const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.8;
    hemiLight.groundColor = new Color3(0.3, 0.3, 0.4);

    const sunLight = new DirectionalLight('sunLight', new Vector3(-1, -2, -1), scene);
    sunLight.intensity = 1.2;
    sunLight.position = new Vector3(20, 40, 20);
    
    // Enable shadows with optimized settings
    const shadowGenerator = new ShadowGenerator(1024, sunLight); // Reduced from 2048
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = waterParams.shadowBlur;
    shadowGenerator.darkness = waterParams.shadowDarkness;
    shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_LOW; // Performance boost
    shadowGeneratorRef.current = shadowGenerator;

    // Create advanced procedural sky with clouds
    const skybox = MeshBuilder.CreateSphere('skyBox', { diameter: 1000, segments: 32 }, scene);
    
    const skyShader = new ShaderMaterial('skyShader', scene, {
      vertexSource: `
        precision highp float;
        attribute vec3 position;
        uniform mat4 worldViewProjection;
        uniform mat4 world;
        uniform vec3 cameraPosition;
        varying vec3 vWorldPos;
        varying vec3 vViewDir;
        
        void main() {
          vec4 worldPos = world * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vViewDir = normalize(worldPos.xyz - cameraPosition);
          gl_Position = worldViewProjection * vec4(position, 1.0);
        }
      `,
      fragmentSource: `
        precision highp float;
        varying vec3 vWorldPos;
        varying vec3 vViewDir;
        uniform float iTime;
        uniform sampler2D noiseTexture;
        
        // Sphere intersection helper
        vec2 sphIntersect(vec3 ro, vec3 rd, vec3 ce, float ra) {
          vec3 oc = ro - ce;
          float b = dot(oc, rd);
          float c = dot(oc, oc) - ra * ra;
          float h = b * b - c;
          if (h < 0.0) return vec2(-1.0);
          h = sqrt(h);
          return vec2(-b - h, -b + h);
        }
        
        float CloudSample(vec2 uv, float time, float spread) {
          // Wrap UVs properly for seamless tiling
          vec2 cloudUV0 = fract(uv);
          cloudUV0 += time * 0.0003;
          
          vec2 cloudUV1 = fract(cloudUV0 * 2.3);
          cloudUV1 += time * 0.0004;
          
          vec2 cloudUV2 = fract(cloudUV0 * 4.7);
          cloudUV2 -= time * 0.0002;
          
          // Sample multiple octaves for smooth detail
          float cloudSampleA0 = texture2D(noiseTexture, cloudUV0).r;
          float cloudSampleA1 = texture2D(noiseTexture, cloudUV1).r;
          float cloudSampleA2 = texture2D(noiseTexture, cloudUV2).r;
          
          // Combine octaves with different weights
          float cloudDensity = cloudSampleA0 * 0.5 + cloudSampleA1 * 0.3 + cloudSampleA2 * 0.2;
          
          // Add some variation
          cloudDensity = pow(cloudDensity, 1.2);
          
          return cloudDensity;
        }
        
        vec4 TraceSky(vec3 dir, float time) {
          // Realistic sky colors - bright blue with white clouds
          vec3 skyZenithCol = vec3(0.4, 0.6, 0.95);      // Bright blue zenith
          vec3 skyHorizonCol = vec3(0.65, 0.75, 0.9);    // Lighter blue horizon
          vec3 sunDiscCol = vec3(1.0, 1.0, 0.98);        // Bright white sun
          vec3 sunLightCol = vec3(1.0, 0.98, 0.95);      // Warm sunlight
          vec3 ambientCol = vec3(0.7, 0.75, 0.85);       // Bright ambient for white clouds
          
          float sunElevation = 0.5;  // Higher sun
          float sunHeading = 1.0;
          vec3 sunDir = normalize(vec3(cos(sunHeading), sunElevation, sin(sunHeading)));
          
          // Sky gradient
          float f = clamp(1.0 - dir.y, 0.0, 1.0);
          f = f * f;  // Less aggressive gradient
          vec3 col = mix(skyZenithCol, skyHorizonCol, f);
          
          // Sun disc
          float VdotL = dot(dir, sunDir);
          const float a0 = cos(radians(2.0));  // Larger sun
          const float a1 = cos(radians(1.5));
          float sunBlend = smoothstep(a0, a1, VdotL);
          col = mix(col, sunDiscCol, sunBlend);
          
          float dist = 100000.0;
          
          // Cloud layer
          if (dir.y > 0.0) {
            float earthRadius = 6371000.0;
            vec3 earthOrigin = vec3(0.0, -earthRadius, 0.0);
            float cloudHeight = 4000.0;  // Lower clouds
            float cloudRadius = earthRadius + cloudHeight;
            vec2 cloudInt = sphIntersect(vec3(0), dir, earthOrigin, cloudRadius);
            float cloudT = cloudInt.y;
            dist = cloudT;
            
            vec3 cloudPos = dir * cloudT;
            vec3 cloudN = normalize(cloudPos - earthOrigin);
            vec2 cloudUV = cloudPos.xz * 0.00002;  // Larger cloud scale
            
            float cloudDensityA = CloudSample(cloudUV, time, 0.0);
            float bumpOffset = 0.0005;
            float cloudDensityB = CloudSample(cloudUV - sunDir.xz * bumpOffset, time, 0.0);
            float cloudDensity = (cloudDensityA + cloudDensityB) * 0.5;
            
            // Bumpmap towards sun
            float cloudBumpLight = max(0.0, (cloudDensityB - cloudDensityA) * 2.0 + 0.6);
            float sunThicknessFactor = 1.0 / max(0.1, dot(cloudN, sunDir));
            sunThicknessFactor = abs(sunThicknessFactor);
            float toSunFactor = 1.0 - max(0.0, dot(dir, sunDir));
            float toSunAmount = exp(toSunFactor * -15.0);
            float cloudSunLight = cloudBumpLight * (1.0 + toSunAmount * 3.0);
            
            float viewThicknessFactor = 1.0 / max(0.1, dot(cloudN, dir));
            float cover = 0.35;      // More coverage
            float density = 0.15;    // Lighter, wispier clouds
            float thickness = max(0.0, (cloudDensity - cover) / (1.0 - cover));
            float cloudOpticalDepth = thickness * viewThicknessFactor;
            float sunCloudOpticalDepth = thickness * sunThicknessFactor;
            
            vec3 litCloudCol = sunLightCol * cloudSunLight * exp(sunCloudOpticalDepth * -density) * 8.0;
            vec3 cloudCol = litCloudCol + ambientCol * 0.8;  // Brighter clouds
            float cloudBlend = 1.0 - exp(cloudOpticalDepth * -density);
            col = mix(col, cloudCol, cloudBlend * 0.9);  // Slightly transparent
          }
          
          return vec4(col, dist);
        }
        
        void main() {
          vec3 dir = normalize(vViewDir);
          vec4 skyColor = TraceSky(dir, iTime);
          gl_FragColor = vec4(skyColor.rgb, 1.0);
        }
      `
    }, {
      attributes: ['position'],
      uniforms: ['worldViewProjection', 'world', 'cameraPosition', 'iTime', 'noiseTexture']
    });
    
    skyShader.backFaceCulling = false;
    skyShader.setFloat('iTime', 0);
    
    // Create a better noise texture for realistic clouds using Perlin-like noise
    const noiseSize = 256;
    const noiseData = new Uint8Array(noiseSize * noiseSize * 4);
    
    // Generate smooth Perlin-like noise
    const smoothNoise = (x, y) => {
      const corners = (
        Math.random() + Math.random() + 
        Math.random() + Math.random()
      ) / 4.0;
      return corners;
    };
    
    // Generate multi-octave noise
    for (let y = 0; y < noiseSize; y++) {
      for (let x = 0; x < noiseSize; x++) {
        let value = 0;
        let amplitude = 1.0;
        let frequency = 1.0;
        let maxValue = 0;
        
        // Multiple octaves for detail
        for (let octave = 0; octave < 6; octave++) {
          const sampleX = (x / noiseSize) * frequency;
          const sampleY = (y / noiseSize) * frequency;
          
          const noise = (Math.sin(sampleX * 12.9898 + sampleY * 78.233) * 43758.5453) % 1.0;
          value += Math.abs(noise) * amplitude;
          maxValue += amplitude;
          
          amplitude *= 0.5;
          frequency *= 2.0;
        }
        
        value /= maxValue;
        
        const i = (y * noiseSize + x) * 4;
        noiseData[i] = value * 255;
        noiseData[i + 1] = value * 255;
        noiseData[i + 2] = value * 255;
        noiseData[i + 3] = 255;
      }
    }
    
    const noiseTexture = new RawTexture(
      noiseData,
      noiseSize,
      noiseSize,
      5, // RGBA format
      scene,
      false,
      true,
      Texture.TRILINEAR_SAMPLINGMODE
    );
    noiseTexture.name = 'skyNoise';
    noiseTexture.wrapU = Texture.WRAP_ADDRESSMODE;
    noiseTexture.wrapV = Texture.WRAP_ADDRESSMODE;
    
    skyShader.setTexture('noiseTexture', noiseTexture);
    skybox.material = skyShader;
    
    // Update sky shader time in render loop
    scene.registerBeforeRender(() => {
      skyShader.setFloat('iTime', performance.now() / 1000);
      skyShader.setVector3('cameraPosition', camera.position);
    });

    // Add cache buster to force reload GLB
    const cacheBuster = `?v=${Date.now()}`;
    SceneLoader.Append('/Blender/', `secne.glb${cacheBuster}`, scene, 
      async (loadedScene) => {
        console.log('=== SCENE LOADED ===');
        console.log('Total meshes:', scene.meshes.length);
        console.log('Total materials:', scene.materials.length);
        console.log('Total textures:', scene.textures.length);
        
        // Log all materials
        console.log('\n=== MATERIALS ===');
        scene.materials.forEach((mat, idx) => {
          console.log(`Material ${idx}: ${mat.name} (${mat.getClassName()})`);
        });
        
        // Log all textures
        console.log('\n=== TEXTURES ===');
        scene.textures.forEach((tex, idx) => {
          console.log(`Texture ${idx}: ${tex.name} - ${tex.url || 'procedural'}`);
        });
        
        const objects = [];
        
        console.log('=== ANIMATION DEBUG START ===');
        console.log('Scene loaded successfully');
        console.log('Animation groups:', scene.animationGroups);
        console.log('Number of animation groups:', scene.animationGroups?.length || 0);
        
        // Check for all types of animations
        console.log('Checking for animations in scene...');
        console.log('- Skeletons:', scene.skeletons?.length || 0);
        console.log('- Animation groups:', scene.animationGroups?.length || 0);
        
        // Check skeleton animations
        if (scene.skeletons && scene.skeletons.length > 0) {
          scene.skeletons.forEach((skeleton, index) => {
            console.log(`Skeleton ${index}:`, {
              name: skeleton.name,
              bones: skeleton.bones.length,
              animations: skeleton.animations?.length || 0
            });
          });
        }
        
        // Check individual mesh animations
        let meshesWithAnimations = 0;
        scene.meshes.forEach((mesh) => {
          if (mesh.animations && mesh.animations.length > 0) {
            meshesWithAnimations++;
            console.log(`Mesh "${mesh.name}" has ${mesh.animations.length} animations:`, 
              mesh.animations.map(a => a.name || 'unnamed'));
          }
          
          // Check for morph target animations
          if (mesh.morphTargetManager) {
            const manager = mesh.morphTargetManager;
            console.log(`Mesh "${mesh.name}" has ${manager.numTargets} morph targets`);
            for (let i = 0; i < manager.numTargets; i++) {
              const target = manager.getTarget(i);
              if (target.animations && target.animations.length > 0) {
                console.log(`  - Morph target "${target.name}" has ${target.animations.length} animations`);
              }
            }
          }
        });
        console.log(`Total meshes with animations: ${meshesWithAnimations}`);
        
        // Play all animation groups
        if (scene.animationGroups && scene.animationGroups.length > 0) {
          console.log(`Found ${scene.animationGroups.length} animation groups - starting playback...`);
          scene.animationGroups.forEach((animationGroup, index) => {
            console.log(`Animation Group ${index}:`, {
              name: animationGroup.name,
              from: animationGroup.from,
              to: animationGroup.to,
              duration: animationGroup.to - animationGroup.from,
              targetedAnimations: animationGroup.targetedAnimations?.length || 0,
              isPlaying: animationGroup.isPlaying,
              speedRatio: animationGroup.speedRatio
            });
            
            // List what this animation affects
            if (animationGroup.targetedAnimations) {
              animationGroup.targetedAnimations.forEach((ta, taIndex) => {
                console.log(`  - Target ${taIndex}:`, {
                  targetName: ta.target?.name || 'unknown',
                  animationName: ta.animation?.name || 'unnamed',
                  property: ta.animation?.targetProperty || 'unknown'
                });
              });
            }
            
            // Configure animation
            animationGroup.loopAnimation = true;
            animationGroup.speedRatio = 1.0;
            
            // For shape key animations, ensure morph targets are enabled
            if (animationGroup.targetedAnimations) {
              animationGroup.targetedAnimations.forEach((ta) => {
                if (ta.target && ta.target.influence !== undefined) {
                  console.log(`  - This is a morph target animation for: ${ta.target.name}`);
                  // Enable the morph target manager
                  if (ta.target._parentContainer && ta.target._parentContainer.morphTargetManager) {
                    ta.target._parentContainer.morphTargetManager.enableNormalMorphing = true;
                    ta.target._parentContainer.morphTargetManager.enableTangentMorphing = true;
                  }
                }
              });
            }
            
            // Try multiple start methods
            try {
              // Method 1: play with loop
              animationGroup.play(true);
              console.log(`✓ Method 1: play(true) called`);
            } catch (e) {
              console.error('Method 1 failed:', e);
            }
            
            try {
              // Method 2: start with parameters
              animationGroup.start(true, 1.0, animationGroup.from, animationGroup.to, false);
              console.log(`✓ Method 2: start() called`);
            } catch (e) {
              console.error('Method 2 failed:', e);
            }
            
            try {
              // Method 3: reset and play
              animationGroup.reset();
              animationGroup.play(true);
              console.log(`✓ Method 3: reset + play called`);
            } catch (e) {
              console.error('Method 3 failed:', e);
            }
            
            console.log(`Animation commands sent for: "${animationGroup.name}"`);
            
            // Verify it's playing
            setTimeout(() => {
              console.log(`Animation "${animationGroup.name}" status after 100ms:`, {
                isPlaying: animationGroup.isPlaying,
                currentFrame: animationGroup.animatables?.[0]?.masterFrame,
                animatablesCount: animationGroup.animatables?.length
              });
              
              // Check morph target values
              scene.meshes.forEach((mesh) => {
                if (mesh.morphTargetManager && mesh.morphTargetManager.numTargets > 0) {
                  console.log(`Morph targets for "${mesh.name}":`);
                  for (let i = 0; i < mesh.morphTargetManager.numTargets; i++) {
                    const target = mesh.morphTargetManager.getTarget(i);
                    console.log(`  - ${target.name}: ${target.influence.toFixed(3)}`);
                  }
                }
              });
            }, 100);
          });
        } else {
          console.log('⚠️ No animation groups found in GLB file');
          console.log('This could mean:');
          console.log('1. The GLB file has no animations');
          console.log('2. Animations were not exported from Blender');
          console.log('3. Animation export settings need to be checked');
        }
        
        console.log('=== ANIMATION DEBUG END ===');
        
        scene.meshes.forEach((mesh) => {
          if (mesh.name !== 'skyBox' && mesh.name !== '__root__') {
            const customProps = {};
            
            // Enable shadows for all meshes
            if (mesh.name.toLowerCase().includes('water')) {
              mesh.receiveShadows = true;
            } else {
              shadowGenerator.addShadowCaster(mesh);
              mesh.receiveShadows = true;
            }
            
            // Read custom properties from metadata
            if (mesh.metadata) {
              Object.keys(mesh.metadata).forEach(key => {
                if (key !== 'gltf') {
                  customProps[key] = mesh.metadata[key];
                }
              });
            }
            
            // Check for morph targets (shape keys) - DETAILED
            let morphTargets = [];
            if (mesh.morphTargetManager) {
              const manager = mesh.morphTargetManager;
              console.log(`\n=== MORPH TARGET DETAILS for "${mesh.name}" ===`);
              console.log('Manager exists:', !!manager);
              console.log('Number of targets:', manager.numTargets);
              console.log('Are normals enabled:', manager.enableNormalMorphing);
              console.log('Are tangents enabled:', manager.enableTangentMorphing);
              
              for (let i = 0; i < manager.numTargets; i++) {
                const target = manager.getTarget(i);
                console.log(`\nMorph Target ${i}:`, {
                  name: target.name,
                  influence: target.influence,
                  hasPositions: target.hasPositions,
                  hasNormals: target.hasNormals,
                  hasTangents: target.hasTangents,
                  uniqueId: target.uniqueId,
                  animations: target.animations?.length || 0
                });
                
                // Check if target has animation data
                if (target.animations && target.animations.length > 0) {
                  target.animations.forEach((anim, animIdx) => {
                    console.log(`  Animation ${animIdx}:`, {
                      name: anim.name,
                      property: anim.targetProperty,
                      framePerSecond: anim.framePerSecond,
                      dataType: anim.dataType,
                      loopMode: anim.loopMode,
                      keys: anim.getKeys()?.length || 0
                    });
                    
                    // Show first few keyframes
                    const keys = anim.getKeys();
                    if (keys && keys.length > 0) {
                      console.log('  First keyframes:', keys.slice(0, 5));
                    }
                  });
                }
                
                morphTargets.push({
                  name: target.name,
                  influence: target.influence,
                  hasAnimations: (target.animations?.length || 0) > 0
                });
              }
              console.log('=== END MORPH TARGET DETAILS ===\n');
            } else {
              console.log(`Mesh "${mesh.name}" has NO morphTargetManager`);
            }

            // Calculate triangle count
            const indices = mesh.getIndices();
            const triangles = indices ? indices.length / 3 : 0;
            const vertices = mesh.getTotalVertices();

            objects.push({
              name: mesh.name,
              id: mesh.id,
              position: mesh.position.asArray(),
              rotation: mesh.rotation.asArray(),
              scaling: mesh.scaling.asArray(),
              customProperties: customProps,
              morphTargets: morphTargets,
              triangles: triangles,
              vertices: vertices
            });

            // Apply water shader to water mesh
            if (mesh.id === 'water' || mesh.name.toLowerCase().includes('water')) {
              console.log('Found water mesh:', mesh.name);
              console.log('Available vertex data:', {
                hasPositions: mesh.isVerticesDataPresent('position'),
                hasNormals: mesh.isVerticesDataPresent('normal'),
                hasUVs: mesh.isVerticesDataPresent('uv'),
                hasColors: mesh.isVerticesDataPresent('color'),
                hasMatricesIndices: mesh.isVerticesDataPresent('matricesIndices'),
                hasMatricesWeights: mesh.isVerticesDataPresent('matricesWeights')
              });
              
              // Check metadata for vertex groups
              console.log('Mesh metadata:', mesh.metadata);
              
              // Check geometry for vertex data
              if (mesh.geometry) {
                console.log('Geometry vertex buffers:', Object.keys(mesh.geometry._vertexBuffers || {}));
              }
              
              // Try to access vertex colors if they exist
              if (mesh.isVerticesDataPresent('color')) {
                const colors = mesh.getVerticesData('color');
                console.log('Vertex colors sample (first 20):', colors?.slice(0, 20));
              }
              
              // Check if mesh has morph targets (shape keys)
              if (mesh.morphTargetManager) {
                console.log('Water mesh has morph targets - shader will work with shape key deformations');
                console.log('Morph targets:', mesh.morphTargetManager.numTargets);
              }
              
              waterMeshRef.current = mesh;
              
              // Always load vertex group data from JSON file
              (async () => {
                try {
                  console.log('Loading vertex group data from JSON file...');
                  const response = await fetch('/Blender/secne_vertex_groups.json');
                  
                  if (!response.ok) {
                    throw new Error(`Failed to load vertex groups: ${response.status}`);
                  }
                  
                  const vertexGroupData = await response.json();
                  console.log('✅ Loaded vertex group data from file:', vertexGroupData);
                  
                  if (vertexGroupData.water) {
                    const waterData = vertexGroupData.water;
                    const positions = mesh.getVerticesData('position');
                  const vertexCount = positions.length / 3;
                  const colors = new Float32Array(vertexCount * 4);
                  
                  // Initialize with defaults
                  for (let i = 0; i < vertexCount; i++) {
                    colors[i * 4] = 0.0;     // R = foam (default no foam)
                    colors[i * 4 + 1] = 0.0; // G = waves (default no waves if not painted)
                    colors[i * 4 + 2] = 0.0; // B
                    colors[i * 4 + 3] = 1.0; // A
                  }
                  
                  // Apply foam vertex group
                  if (waterData.vertex_groups && waterData.vertex_groups.foam && waterData.vertices) {
                    const foamMap = new Map();
                    waterData.vertices.forEach(vertex => {
                      const foamGroup = vertex.groups?.find(g => g.name === 'foam');
                      if (foamGroup) {
                        foamMap.set(vertex.index, foamGroup.weight);
                      }
                    });
                    
                    for (let i = 0; i < vertexCount; i++) {
                      const weight = foamMap.get(i);
                      if (weight !== undefined) {
                        colors[i * 4] = weight; // R = foam weight
                      }
                    }
                    console.log('✅ Applied foam vertex group');
                  }
                  
                  // Apply waves vertex group
                  if (waterData.vertex_groups && waterData.vertex_groups.waves && waterData.vertices) {
                    const wavesMap = new Map();
                    waterData.vertices.forEach(vertex => {
                      const wavesGroup = vertex.groups?.find(g => g.name === 'waves');
                      if (wavesGroup) {
                        wavesMap.set(vertex.index, wavesGroup.weight);
                      }
                    });
                    
                    for (let i = 0; i < vertexCount; i++) {
                      const weight = wavesMap.get(i);
                      if (weight !== undefined) {
                        colors[i * 4 + 1] = weight; // G = wave weight
                      }
                    }
                    console.log('✅ Applied waves vertex group');
                  }
                  
                  mesh.setVerticesData('color', colors);
                  console.log('✅ Applied vertex group data to water mesh (foam + waves)');
                } else {
                  console.warn('⚠️ No water data found in vertex groups JSON');
                }
                } catch (err) {
                  console.error('❌ Failed to load vertex group data from JSON:', err);
                  console.log('Water will render without vertex group painting');
                }
                
                createWaterMaterial(mesh, scene);
              })(); // End of async IIFE
            } else {
              // Set other meshes to rendering group 0
              mesh.renderingGroupId = 0;
              
              // Log material info for debugging
              console.log(`Mesh "${mesh.name}" material:`, {
                hasMaterial: !!mesh.material,
                materialName: mesh.material?.name,
                materialType: mesh.material?.getClassName(),
                isVisible: mesh.isVisible,
                isEnabled: mesh.isEnabled()
              });
              
              // Ensure mesh is visible
              mesh.isVisible = true;
              
              // If material exists, log texture info
              if (mesh.material) {
                const mat = mesh.material;
                console.log(`  Material details:`, {
                  albedoTexture: mat.albedoTexture?.name || 'none',
                  diffuseTexture: mat.diffuseTexture?.name || 'none',
                  baseTexture: mat.baseTexture?.name || 'none',
                  hasTextures: scene.textures.length
                });
              }
            }
          }
        });

        setObjectInfo(objects);
        console.log('Loaded objects:', objects);
        
        // Setup WebXR (VR/AR support) after scene is loaded
        const setupVR = async () => {
          try {
            console.log('🔍 Checking WebXR support...');
            
            // Check if WebXR is available
            if (!navigator.xr) {
              console.warn('❌ navigator.xr not available - WebXR not supported by this browser');
              console.log('💡 Try Chrome or Edge browser for WebXR support');
              setVrSupported(false);
              return;
            }
            
            // Check if immersive VR is supported
            const vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
            console.log('VR Session Support:', vrSupported);
            
            if (!vrSupported) {
              console.warn('⚠️ Immersive VR not supported');
              console.log('💡 To test without headset:');
              console.log('   1. Open DevTools (F12)');
              console.log('   2. Click ⋮ menu → More tools → WebXR');
              console.log('   3. Select a VR device and enable');
              setVrSupported(false);
              return;
            }
            
            console.log('Initializing WebXR...');
            
            // Create WebXR experience with floor meshes for teleportation
            const floorMeshes = scene.meshes.filter(m => 
              m.name.toLowerCase().includes('beach') || 
              m.name.toLowerCase().includes('ground') ||
              m.name.toLowerCase().includes('floor')
            );
            
            const xrHelper = await WebXRDefaultExperience.CreateAsync(scene, {
              floorMeshes: floorMeshes,
              disableDefaultUI: false,
              disableTeleportation: false
            });
            
            if (xrHelper) {
              setVrSupported(true);
              console.log('✅ WebXR initialized successfully!');
              console.log('🥽 VR button should appear in bottom-right corner');
              console.log('📱 Click the VR button to enter VR mode');
              
              // Track VR state changes
              xrHelper.baseExperience.onStateChangedObservable.add((state) => {
                console.log('WebXR state changed:', state);
                if (state === WebXRState.IN_XR) {
                  setInVR(true);
                  console.log('🥽 Entered VR mode');
                } else if (state === WebXRState.NOT_IN_XR) {
                  setInVR(false);
                  console.log('👓 Exited VR mode');
                }
              });
              
              // Enable teleportation if available
              if (xrHelper.teleportation) {
                console.log('✅ Teleportation enabled');
              }
              
              // Enable pointer selection if available
              if (xrHelper.pointerSelection) {
                console.log('✅ Pointer selection enabled');
              }
            }
          } catch (error) {
            console.error('❌ WebXR initialization failed:', error);
            console.log('💡 Possible reasons:');
            console.log('   - Browser doesn\'t support WebXR');
            console.log('   - No VR device detected');
            console.log('   - WebXR flags not enabled');
            setVrSupported(false);
          }
        };
        
        setupVR();
      },
      null,
      (scene, message, exception) => {
        console.error('Error loading GLB:', message, exception);
        setError(message);
      }
    );

    // FPS tracking
    let lastTime = performance.now();
    let frameCount = 0;
    
    engine.runRenderLoop(() => {
      if (waterMaterialRef.current) {
        waterMaterialRef.current.setFloat('iTime', performance.now() / 1000 * waterParams.timeSpeed);
      }
      scene.render();
      
      // Update FPS every 30 frames
      frameCount++;
      if (frameCount >= 30) {
        const currentTime = performance.now();
        const delta = currentTime - lastTime;
        const currentFps = Math.round((frameCount * 1000) / delta);
        setFps(currentFps);
        frameCount = 0;
        lastTime = currentTime;
      }
    });

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.dispose();
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      
      {/* FPS Counter */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        background: 'rgba(0, 0, 0, 0.7)',
        color: fps < 30 ? '#ff4444' : fps < 50 ? '#ffaa00' : '#44ff44',
        padding: '8px 12px',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '16px',
        fontWeight: 'bold'
      }}>
        FPS: {fps}
      </div>
      
      {/* VR Status Indicator */}
      {inVR && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(76, 175, 80, 0.9)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          🥽 VR MODE ACTIVE
        </div>
      )}
      
      {/* Keyboard hint when controls are hidden */}
      {!showControls && !inVR && (
        <div style={{
          position: 'absolute',
          top: 20,
          left: 20,
          background: 'rgba(0, 0, 0, 0.6)',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '8px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <div>🎮 Controls:</div>
          <div style={{ marginTop: '5px', fontSize: '11px' }}>
            • WASD - Move camera
          </div>
          <div style={{ fontSize: '11px' }}>
            • Shift - Move faster
          </div>
          <div style={{ fontSize: '11px' }}>
            • Space - Move up
          </div>
          <div style={{ fontSize: '11px' }}>
            • Mouse - Look around
          </div>
          <div style={{ fontSize: '11px' }}>
            • Scroll - Zoom in/out
          </div>
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #555' }}>
            Ctrl+Q - Water controls
          </div>
          {vrSupported && (
            <div style={{ marginTop: '5px', color: '#4CAF50' }}>
              🥽 VR Ready - Look for VR button ↘️
            </div>
          )}
        </div>
      )}
      
      {/* Water Controls - Toggle with Ctrl+Q */}
      {showControls && (
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        minWidth: '250px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Water Controls</h3>
        
        {/* VR Button - Only show if WebXR is supported */}
        {vrSupported && (
          <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #444' }}>
            <div style={{ 
              fontSize: '11px', 
              color: '#aaa', 
              marginBottom: '8px',
              textAlign: 'center'
            }}>
              {inVR ? '🥽 VR Active' : '🥽 VR Ready'}
            </div>
            <div style={{ 
              fontSize: '10px', 
              color: '#888', 
              marginBottom: '8px',
              textAlign: 'center'
            }}>
              Use your VR headset's button to enter/exit VR mode
            </div>
          </div>
        )}
        
        <div style={{ marginBottom: '10px' }}>
          <label>Time Speed: {waterParams.timeSpeed}</label>
          <input 
            type="range" 
            min="0" 
            max="2" 
            step="0.1"
            value={waterParams.timeSpeed}
            onChange={(e) => setWaterParams({...waterParams, timeSpeed: parseFloat(e.target.value)})}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>UV Scale X: {waterParams.uvScaleX}</label>
          <input 
            type="range" 
            min="0.1" 
            max="5" 
            step="0.1"
            value={waterParams.uvScaleX}
            onChange={(e) => setWaterParams({...waterParams, uvScaleX: parseFloat(e.target.value)})}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>UV Scale Y: {waterParams.uvScaleY}</label>
          <input 
            type="range" 
            min="0.1" 
            max="5" 
            step="0.1"
            value={waterParams.uvScaleY}
            onChange={(e) => setWaterParams({...waterParams, uvScaleY: parseFloat(e.target.value)})}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>UV Scale Z: {waterParams.uvScaleZ}</label>
          <input 
            type="range" 
            min="0.1" 
            max="5" 
            step="0.1"
            value={waterParams.uvScaleZ}
            onChange={(e) => setWaterParams({...waterParams, uvScaleZ: parseFloat(e.target.value)})}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>UV Rotation: {waterParams.uvRotation.toFixed(2)}</label>
          <input 
            type="range" 
            min="0" 
            max="6.28" 
            step="0.1"
            value={waterParams.uvRotation}
            onChange={(e) => setWaterParams({...waterParams, uvRotation: parseFloat(e.target.value)})}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Alpha: {waterParams.alpha}</label>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.05"
            value={waterParams.alpha}
            onChange={(e) => setWaterParams({...waterParams, alpha: parseFloat(e.target.value)})}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Dither Scale: {waterParams.ditherScale} (for Alpha Hashed)</label>
          <input 
            type="range" 
            min="0.5" 
            max="4" 
            step="0.1"
            value={waterParams.ditherScale}
            onChange={(e) => setWaterParams({...waterParams, ditherScale: parseFloat(e.target.value)})}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #444' }}>
          <h4 style={{ marginTop: 0, marginBottom: '10px', fontSize: '13px' }}>Shore Foam</h4>
          
          <div style={{ marginBottom: '10px' }}>
            <label>
              <input 
                type="checkbox" 
                checked={waterParams.useVertexGroup}
                onChange={(e) => setWaterParams({...waterParams, useVertexGroup: e.target.checked})}
              />
              {' '}Use Vertex Group (Blender "foam")
            </label>
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <label>Foam Amount: {waterParams.foamAmount.toFixed(2)}</label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05"
              value={waterParams.foamAmount}
              onChange={(e) => setWaterParams({...waterParams, foamAmount: parseFloat(e.target.value)})}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Foam Threshold: {waterParams.foamThreshold.toFixed(2)}</label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05"
              value={waterParams.foamThreshold}
              onChange={(e) => setWaterParams({...waterParams, foamThreshold: parseFloat(e.target.value)})}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Foam Sharpness: {waterParams.foamSharpness.toFixed(1)}</label>
            <input 
              type="range" 
              min="1" 
              max="10" 
              step="0.5"
              value={waterParams.foamSharpness}
              onChange={(e) => setWaterParams({...waterParams, foamSharpness: parseFloat(e.target.value)})}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #444' }}>
          <h4 style={{ marginTop: 0, marginBottom: '10px', fontSize: '13px' }}>Water Colors</h4>
          
          <div style={{ marginBottom: '10px' }}>
            <label>Deep Water Color</label>
            <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
              <input 
                type="color" 
                value={`#${Math.round(waterParams.deepWaterR * 255).toString(16).padStart(2, '0')}${Math.round(waterParams.deepWaterG * 255).toString(16).padStart(2, '0')}${Math.round(waterParams.deepWaterB * 255).toString(16).padStart(2, '0')}`}
                onChange={(e) => {
                  const hex = e.target.value;
                  const r = parseInt(hex.slice(1, 3), 16) / 255;
                  const g = parseInt(hex.slice(3, 5), 16) / 255;
                  const b = parseInt(hex.slice(5, 7), 16) / 255;
                  setWaterParams({...waterParams, deepWaterR: r, deepWaterG: g, deepWaterB: b});
                }}
                style={{ width: '100%', height: '30px', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Shallow Water Color</label>
            <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
              <input 
                type="color" 
                value={`#${Math.round(waterParams.shallowWaterR * 255).toString(16).padStart(2, '0')}${Math.round(waterParams.shallowWaterG * 255).toString(16).padStart(2, '0')}${Math.round(waterParams.shallowWaterB * 255).toString(16).padStart(2, '0')}`}
                onChange={(e) => {
                  const hex = e.target.value;
                  const r = parseInt(hex.slice(1, 3), 16) / 255;
                  const g = parseInt(hex.slice(3, 5), 16) / 255;
                  const b = parseInt(hex.slice(5, 7), 16) / 255;
                  setWaterParams({...waterParams, shallowWaterR: r, shallowWaterG: g, shallowWaterB: b});
                }}
                style={{ width: '100%', height: '30px', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Foam Color</label>
            <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
              <input 
                type="color" 
                value={`#${Math.round(waterParams.foamR * 255).toString(16).padStart(2, '0')}${Math.round(waterParams.foamG * 255).toString(16).padStart(2, '0')}${Math.round(waterParams.foamB * 255).toString(16).padStart(2, '0')}`}
                onChange={(e) => {
                  const hex = e.target.value;
                  const r = parseInt(hex.slice(1, 3), 16) / 255;
                  const g = parseInt(hex.slice(3, 5), 16) / 255;
                  const b = parseInt(hex.slice(5, 7), 16) / 255;
                  setWaterParams({...waterParams, foamR: r, foamG: g, foamB: b});
                }}
                style={{ width: '100%', height: '30px', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Roughness: {waterParams.roughness.toFixed(2)}</label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05"
              value={waterParams.roughness}
              onChange={(e) => setWaterParams({...waterParams, roughness: parseFloat(e.target.value)})}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #444' }}>
          <h4 style={{ marginTop: 0, marginBottom: '10px', fontSize: '13px' }}>Wave Displacement</h4>
          
          <div style={{ marginBottom: '10px' }}>
            <label>Wave Amplitude: {waterParams.waveAmplitude.toFixed(2)}</label>
            <input 
              type="range" 
              min="0" 
              max="2" 
              step="0.05"
              value={waterParams.waveAmplitude}
              onChange={(e) => setWaterParams({...waterParams, waveAmplitude: parseFloat(e.target.value)})}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Wave Frequency: {waterParams.waveFrequency.toFixed(2)}</label>
            <input 
              type="range" 
              min="0.1" 
              max="3" 
              step="0.1"
              value={waterParams.waveFrequency}
              onChange={(e) => setWaterParams({...waterParams, waveFrequency: parseFloat(e.target.value)})}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #444' }}>
          <h4 style={{ marginTop: 0, marginBottom: '10px', fontSize: '13px' }}>Texture Noise (Experimental)</h4>
          
          <div style={{ marginBottom: '10px' }}>
            <label>
              <input 
                type="checkbox" 
                checked={waterParams.useTextureNoise}
                onChange={(e) => setWaterParams({...waterParams, useTextureNoise: e.target.checked})}
              />
              {' '}Use Texture Noise
            </label>
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <label>Noise Scale: {waterParams.textureNoiseScale.toFixed(2)}</label>
            <input 
              type="range" 
              min="0.1" 
              max="10" 
              step="0.1"
              value={waterParams.textureNoiseScale}
              onChange={(e) => setWaterParams({...waterParams, textureNoiseScale: parseFloat(e.target.value)})}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Noise Strength: {waterParams.textureNoiseStrength.toFixed(2)}</label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05"
              value={waterParams.textureNoiseStrength}
              onChange={(e) => setWaterParams({...waterParams, textureNoiseStrength: parseFloat(e.target.value)})}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Noise Speed: {waterParams.textureNoiseSpeed.toFixed(2)}</label>
            <input 
              type="range" 
              min="0" 
              max="2" 
              step="0.1"
              value={waterParams.textureNoiseSpeed}
              onChange={(e) => setWaterParams({...waterParams, textureNoiseSpeed: parseFloat(e.target.value)})}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #444' }}>
          <h4 style={{ marginTop: 0, marginBottom: '10px', fontSize: '13px' }}>Shadows</h4>
          
          <div style={{ marginBottom: '10px' }}>
            <label>Shadow Darkness: {waterParams.shadowDarkness.toFixed(2)}</label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05"
              value={waterParams.shadowDarkness}
              onChange={(e) => setWaterParams({...waterParams, shadowDarkness: parseFloat(e.target.value)})}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Shadow Blur: {waterParams.shadowBlur.toFixed(0)}</label>
            <input 
              type="range" 
              min="1" 
              max="128" 
              step="1"
              value={waterParams.shadowBlur}
              onChange={(e) => setWaterParams({...waterParams, shadowBlur: parseFloat(e.target.value)})}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #444' }}>
          <h4 style={{ marginTop: 0, marginBottom: '10px', fontSize: '13px' }}>Debug</h4>
          
          <div style={{ marginBottom: '10px' }}>
            <label>
              <input 
                type="checkbox" 
                checked={waterParams.showVertexWeights}
                onChange={(e) => setWaterParams({...waterParams, showVertexWeights: e.target.checked})}
              />
              {' '}Show Vertex Weights (Red=Foam, Green=Waves)
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>
            <input 
              type="checkbox" 
              checked={waterParams.useAlphaHashed}
              onChange={(e) => setWaterParams({...waterParams, useAlphaHashed: e.target.checked})}
            />
            {' '}Use Alpha Hashed (fixes overlaps)
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>
            <input 
              type="checkbox" 
              checked={waterParams.useDepthPeeling}
              onChange={(e) => setWaterParams({...waterParams, useDepthPeeling: e.target.checked})}
            />
            {' '}Use Depth Peeling (better transparency)
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>
            <input 
              type="checkbox" 
              checked={waterParams.backfaceCulling}
              onChange={(e) => setWaterParams({...waterParams, backfaceCulling: e.target.checked})}
            />
            {' '}Backface Culling (deprecated - use Cull Mode)
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Cull Mode:</label>
          <select 
            value={waterParams.cullMode}
            onChange={(e) => setWaterParams({...waterParams, cullMode: e.target.value})}
            style={{
              width: '100%',
              padding: '5px',
              background: '#333',
              color: 'white',
              border: '1px solid #555',
              borderRadius: '4px',
              marginTop: '5px'
            }}
          >
            <option value="none">None (Double Sided)</option>
            <option value="back">Back (Show Front)</option>
            <option value="front">Front (Show Back)</option>
          </select>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>
            <input 
              type="checkbox" 
              checked={waterParams.depthWrite}
              onChange={(e) => setWaterParams({...waterParams, depthWrite: e.target.checked})}
            />
            {' '}Depth Write
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>
            <input 
              type="checkbox" 
              checked={waterParams.separateCullingPass}
              onChange={(e) => setWaterParams({...waterParams, separateCullingPass: e.target.checked})}
            />
            {' '}Separate Culling Pass (reduces overlaps)
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Rendering Order:</label>
          <select 
            value={waterParams.renderingGroupId}
            onChange={(e) => setWaterParams({...waterParams, renderingGroupId: parseInt(e.target.value)})}
            style={{
              width: '100%',
              padding: '5px',
              background: '#333',
              color: 'white',
              border: '1px solid #555',
              borderRadius: '4px',
              marginTop: '5px'
            }}
          >
            <option value="0">Same as other objects</option>
            <option value="1">After other objects</option>
            <option value="2">Last (on top)</option>
          </select>
        </div>

        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #444' }}>
          <button 
            onClick={() => {
              setWaterParams(defaultWaterParams);
            }}
            style={{
              width: '100%',
              padding: '8px',
              background: '#9C27B0',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '8px'
            }}
          >
            Reset to Default
          </button>
          
          <button 
            onClick={() => {
              const dataStr = JSON.stringify(waterParams, null, 2);
              const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
              const exportFileDefaultName = 'water-settings.json';
              const linkElement = document.createElement('a');
              linkElement.setAttribute('href', dataUri);
              linkElement.setAttribute('download', exportFileDefaultName);
              linkElement.click();
            }}
            style={{
              width: '100%',
              padding: '8px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '8px'
            }}
          >
            Export Settings
          </button>
          
          <input 
            type="file"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const imported = JSON.parse(event.target.result);
                    setWaterParams(imported);
                    // Save imported settings to localStorage
                    localStorage.setItem('waterShaderSettings', JSON.stringify(imported));
                    console.log('Imported and saved settings:', imported);
                    alert('Settings imported and saved successfully!');
                  } catch (err) {
                    console.error('Failed to import settings:', err);
                    alert('Failed to import settings. Please check the JSON file.');
                  }
                };
                reader.readAsText(file);
              }
              // Reset file input so the same file can be imported again
              e.target.value = '';
            }}
            style={{ display: 'none' }}
            id="importSettings"
          />
          <button 
            onClick={() => document.getElementById('importSettings').click()}
            style={{
              width: '100%',
              padding: '8px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '8px'
            }}
          >
            Import Settings
          </button>

          <input 
            type="file"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const vertexGroupData = JSON.parse(event.target.result);
                    console.log('Imported vertex group data:', vertexGroupData);
                    
                    // Save vertex group data to localStorage
                    localStorage.setItem('waterVertexGroupData', JSON.stringify(vertexGroupData));
                    
                    // Apply vertex group data to water mesh
                    if (waterMeshRef.current && vertexGroupData.water) {
                      const waterData = vertexGroupData.water;
                      const positions = waterMeshRef.current.getVerticesData('position');
                      const vertexCount = positions.length / 3;
                      const colors = new Float32Array(vertexCount * 4);
                      
                      // Initialize with defaults
                      for (let i = 0; i < vertexCount; i++) {
                        colors[i * 4] = 0.0;     // R = foam (default no foam)
                        colors[i * 4 + 1] = 0.0; // G = waves (default no waves if not painted)
                        colors[i * 4 + 2] = 0.0; // B
                        colors[i * 4 + 3] = 1.0; // A
                      }
                      
                      let hasData = false;
                      
                      // Apply foam vertex group
                      if (waterData.vertex_groups && waterData.vertex_groups.foam && waterData.vertices) {
                        const foamMap = new Map();
                        waterData.vertices.forEach(vertex => {
                          const foamGroup = vertex.groups?.find(g => g.name === 'foam');
                          if (foamGroup) {
                            foamMap.set(vertex.index, foamGroup.weight);
                          }
                        });
                        
                        for (let i = 0; i < vertexCount; i++) {
                          const weight = foamMap.get(i);
                          if (weight !== undefined) {
                            colors[i * 4] = weight; // R = foam weight
                          }
                        }
                        hasData = true;
                      }
                      
                      // Apply waves vertex group
                      if (waterData.vertex_groups && waterData.vertex_groups.waves && waterData.vertices) {
                        const wavesMap = new Map();
                        waterData.vertices.forEach(vertex => {
                          const wavesGroup = vertex.groups?.find(g => g.name === 'waves');
                          if (wavesGroup) {
                            wavesMap.set(vertex.index, wavesGroup.weight);
                          }
                        });
                        
                        for (let i = 0; i < vertexCount; i++) {
                          const weight = wavesMap.get(i);
                          if (weight !== undefined) {
                            colors[i * 4 + 1] = weight; // G = wave weight
                          }
                        }
                        hasData = true;
                      }
                      
                      if (hasData) {
                        waterMeshRef.current.setVerticesData('color', colors);
                        console.log('Applied and saved vertex group data (foam + waves)');
                        alert('Vertex group data imported and saved successfully!');
                      } else {
                        alert('Invalid vertex group data format');
                      }
                    } else {
                      alert('Water mesh not found or invalid data');
                    }
                  } catch (err) {
                    console.error('Failed to import vertex group:', err);
                    alert('Failed to import vertex group data');
                  }
                };
                reader.readAsText(file);
              }
              // Reset file input
              e.target.value = '';
            }}
            style={{ display: 'none' }}
            id="importVertexGroup"
          />
          <button 
            onClick={() => document.getElementById('importVertexGroup').click()}
            style={{
              width: '100%',
              padding: '8px',
              background: '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '8px'
            }}
          >
            Import Vertex Group JSON
          </button>
          
          <button 
            onClick={() => {
              if (confirm('Clear saved vertex group data? This will remove foam painting on next reload.')) {
                localStorage.removeItem('waterVertexGroupData');
                console.log('Cleared saved vertex group data');
                alert('Vertex group data cleared. Reload page to see default foam.');
              }
            }}
            style={{
              width: '100%',
              padding: '8px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear Vertex Group Data
          </button>
        </div>
      </div>
      )}

      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 0, 0, 0.8)',
          color: 'white',
          padding: '20px',
          borderRadius: '8px'
        }}>
          Error loading model: {error}
        </div>
      )}
      {objectInfo.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          maxHeight: '80vh',
          overflowY: 'auto',
          fontSize: '12px',
          fontFamily: 'monospace',
          maxWidth: '300px'
        }}>
          <h3 style={{ marginTop: 0 }}>Scene Stats</h3>
          <div style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #555' }}>
            <div style={{ color: '#2196F3' }}>
              Total Tris: {objectInfo.reduce((sum, obj) => sum + (obj.triangles || 0), 0).toLocaleString()}
            </div>
            <div style={{ color: '#2196F3' }}>
              Total Verts: {objectInfo.reduce((sum, obj) => sum + (obj.vertices || 0), 0).toLocaleString()}
            </div>
            <div style={{ color: '#4CAF50' }}>
              Objects: {objectInfo.length}
            </div>
          </div>
          <h3 style={{ marginTop: 0 }}>Objects</h3>
          {objectInfo.map((obj, idx) => (
            <div key={idx} style={{ marginBottom: '15px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', color: '#4CAF50' }}>{obj.name}</div>
              <div>ID: {obj.id}</div>
              <div style={{ color: '#2196F3' }}>Tris: {obj.triangles?.toLocaleString() || 0}</div>
              <div style={{ color: '#2196F3' }}>Verts: {obj.vertices?.toLocaleString() || 0}</div>
              {obj.morphTargets && obj.morphTargets.length > 0 && (
                <div style={{ marginTop: '5px' }}>
                  <div style={{ color: '#FF9800' }}>Shape Keys ({obj.morphTargets.length}):</div>
                  {obj.morphTargets.map((morph, mIdx) => (
                    <div key={mIdx} style={{ marginLeft: '10px', fontSize: '11px' }}>
                      {morph.name}: {morph.influence.toFixed(3)}
                    </div>
                  ))}
                </div>
              )}
              {Object.keys(obj.customProperties).length > 0 && (
                <div style={{ marginTop: '5px' }}>
                  <div style={{ color: '#FFA500' }}>Custom Properties:</div>
                  {Object.entries(obj.customProperties).map(([key, value]) => (
                    <div key={key} style={{ marginLeft: '10px' }}>
                      {key}: {JSON.stringify(value)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
