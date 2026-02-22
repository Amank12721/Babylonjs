# Beach Viewer - BabylonJS Water Shader Demo

A 3D beach scene viewer built with React and BabylonJS, featuring advanced water shader effects with vertex group-based foam and wave control.

## Features

- **Custom Water Shader**: Procedural water with animated waves and foam
- **Vertex Group Control**: Paint foam and wave intensity directly in Blender
- **VR Support**: WebXR compatible for immersive viewing
- **Real-time Controls**: Adjust water parameters on the fly (Ctrl+Q to toggle)
- **Morph Target Animations**: Animated water effects using shape keys

## Water Shader System

The water shader uses vertex groups exported from Blender to control:
- **Foam**: Red channel - controls where foam appears (shore, rocks, etc.)
- **Waves**: Green channel - controls wave animation intensity

### Vertex Group Setup

1. In Blender, create two vertex groups on your water mesh:
   - `foam` - Paint areas where foam should appear
   - `waves` - Paint areas that should have wave animation

2. Export vertex groups with your GLB file using this Blender addon:
   **[GLB Vertex Export JSON](https://github.com/Amank12721/Glb_vertex_export_json)**

3. The addon exports vertex group data as custom properties in the GLB file
4. This viewer automatically reads and applies the vertex weights to the shader

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open http://localhost:5174 in your browser.

## Build

```bash
npm run build
```

## Controls

- **Ctrl+Q**: Toggle shader controls panel
- **Mouse**: Rotate camera
- **Scroll**: Zoom in/out
- **VR Button**: Enter VR mode (if supported)

## Project Structure

```
├── src/
│   ├── App.jsx              # Main app component
│   ├── BabylonViewer.jsx    # 3D scene and water shader
│   └── main.jsx             # Entry point
├── public/
│   └── Blender/             # 3D assets (GLB files)
└── package.json
```

## Water Shader Parameters

- **UV Scale**: Controls water texture tiling
- **UV Rotation**: Rotates the water pattern
- **Alpha**: Water transparency
- **Foam Amount**: Controls foam intensity
- **Wave Amplitude**: Height of waves
- **Wave Frequency**: Speed of wave animation
- **Colors**: Deep water, shallow water, and foam colors

## Technologies

- React 18
- BabylonJS 7
- Vite 5
- WebXR API

## Vertex Group Export

To export vertex groups from Blender with your GLB file:

1. Install the addon: [GLB Vertex Export JSON](https://github.com/Amank12721/Glb_vertex_export_json)
2. Create vertex groups named `foam` and `waves`
3. Weight paint your water mesh
4. Export as GLB with "Custom Properties" enabled
5. The vertex data will be embedded in the GLB file

## Live Demo

[View on Cloudflare Pages](https://beach-viewer.pages.dev)

## License

MIT
