# How to Test VR

## Method 1: Chrome DevTools WebXR Emulator (No Headset Needed)

1. **Open Chrome or Edge** browser
2. **Navigate to**: `http://localhost:5173/`
3. **Open DevTools**: Press `F12`
4. **Enable WebXR Emulator**:
   - Click the **3 dots menu** (⋮) in DevTools
   - Go to: **More tools** → **WebXR**
   - A new "WebXR" tab will appear in DevTools
5. **Select a device**:
   - In the WebXR tab, choose a VR headset (e.g., "Quest 2")
   - Click "Enable"
6. **Look for VR button**:
   - A VR icon should appear in the **bottom-right corner** of the page
   - Click it to enter VR mode
7. **Use emulated controls**:
   - Use mouse to look around
   - WASD to move in VR

## Method 2: Install WebXR API Emulator Extension

1. **Install Extension**:
   - Chrome: https://chrome.google.com/webstore/detail/webxr-api-emulator/mjddjgeghkdijejnciaefnkjmkafnnje
   - Firefox: https://addons.mozilla.org/en-US/firefox/addon/webxr-api-emulator/

2. **After installation**:
   - Click the extension icon in your browser toolbar
   - Select a VR device (Quest 2, Vive, etc.)
   - Refresh the page
   - VR button should appear

## Method 3: With Real VR Headset

### Desktop PC + VR Headset:

1. **Connect your VR headset** (Quest with Link cable, Vive, Index, etc.)
2. **Start VR software**:
   - Oculus App (for Quest)
   - SteamVR (for Vive/Index)
3. **Open browser**: Chrome or Edge
4. **Navigate to**: `http://localhost:5173/`
5. **Click VR button** in bottom-right corner
6. **Put on headset** - you should see the beach scene in VR!

### Standalone Quest (No PC):

1. **Put on Quest headset**
2. **Open Oculus Browser**
3. **Find your PC's IP address**:
   - On PC, open CMD and type: `ipconfig`
   - Look for "IPv4 Address" (e.g., 192.168.1.100)
4. **In Quest browser, go to**: `http://[YOUR_PC_IP]:5173/`
   - Example: `http://192.168.1.100:5173/`
5. **Click VR button**
6. **Enjoy VR beach!**

## Troubleshooting

### VR Button Not Appearing?

**Check Console (F12)**:
```
✅ "WebXR initialized successfully!" = Working
⚠️ "WebXR not supported" = Not working
```

**If not supported**:
1. Use Chrome/Edge (not Firefox)
2. Enable WebXR flags:
   - Go to: `chrome://flags`
   - Search: "WebXR"
   - Enable all WebXR flags
   - Restart browser

### Can't Connect from Quest?

1. **Check WiFi**: PC and Quest must be on same network
2. **Check Firewall**: 
   - Windows Firewall might block port 5173
   - Add exception for port 5173
3. **Use --host flag**:
   ```bash
   npm run dev -- --host
   ```
   This exposes the server to your network

### Performance Issues in VR?

VR renders twice (once per eye), so:
1. Press `Ctrl+Q` to open water controls
2. Reduce shadow quality
3. Lower wave amplitude
4. Check FPS counter (need 72+ FPS)

## What You Should See

### Without VR:
- FPS counter (top-left)
- Controls hint (top-left)
- Scene stats (top-right)
- Water shader controls (Ctrl+Q)

### With VR Enabled:
- Small VR icon button (bottom-right corner)
- "VR Ready" message in controls hint

### In VR Mode:
- Green banner: "🥽 VR MODE ACTIVE"
- Stereoscopic 3D view
- Head tracking
- Controller support (if available)

## Quick Test Commands

**Check if WebXR is available in browser console**:
```javascript
navigator.xr.isSessionSupported('immersive-vr').then(supported => {
  console.log('VR Supported:', supported);
});
```

**Check current VR state**:
- Look at top-left hint
- If it says "🥽 VR Ready", WebXR is working
- If no VR message, check console for errors
