# VR Support Guide

## Requirements

### Hardware
- VR headset (Meta Quest 2/3/Pro, HTC Vive, Valve Index, etc.)
- Compatible PC or standalone VR device

### Browser Support
- Chrome/Edge 79+ (recommended)
- Firefox 98+
- Oculus Browser (for Quest standalone)

## How to Use VR

### Desktop PC with VR Headset

1. **Connect your VR headset** to your PC
2. **Start SteamVR or Oculus app** (depending on your headset)
3. **Open the app** in Chrome or Edge: `http://localhost:5173/`
4. **Look for the VR button** - Babylon.js automatically adds a VR icon in the bottom-right corner
5. **Click the VR button** or use your headset's button to enter VR mode
6. **Use controllers** to teleport and interact

### Meta Quest (Standalone)

1. **Put on your Quest headset**
2. **Open Oculus Browser**
3. **Navigate to your PC's IP address**: `http://[YOUR_PC_IP]:5173/`
   - Find your PC IP: Run `ipconfig` in Windows CMD, look for IPv4 Address
4. **Click the VR button** in the browser
5. **Enjoy the beach in VR!**

## VR Controls

- **Teleportation**: Point controller at ground and press trigger
- **Look around**: Move your head naturally
- **Exit VR**: Press the VR button again or use headset menu

## Features in VR

✅ Full 3D immersion
✅ Stereoscopic rendering (separate view for each eye)
✅ Head tracking
✅ Controller support
✅ Teleportation movement
✅ Real-time water shader effects
✅ Dynamic sky and lighting

## Troubleshooting

**VR button not appearing?**
- Check browser console for WebXR errors
- Ensure your browser supports WebXR
- Try Chrome/Edge instead of Firefox
- Make sure VR headset is connected and detected

**Performance issues in VR?**
- VR requires rendering twice (once per eye)
- Lower the shadow quality in water controls (Ctrl+Q)
- Reduce wave amplitude and frequency
- Check FPS counter (should be 72+ for smooth VR)

**Can't connect from Quest?**
- Ensure PC and Quest are on same WiFi network
- Check Windows Firewall isn't blocking port 5173
- Try running: `npm run dev -- --host`

## Performance Tips for VR

Since VR renders the scene twice (once per eye), performance is critical:

1. **Target 72+ FPS** (90 FPS ideal)
2. **Reduce shadow quality** if lagging
3. **Lower mesh complexity** if needed
4. **Disable texture noise** in water shader
5. **Use wired connection** for PC VR (better than wireless)

## Technical Details

- Uses **WebXR Device API**
- Babylon.js **WebXRDefaultExperience**
- Supports **6DOF tracking** (position + rotation)
- Compatible with **OpenXR** runtime
