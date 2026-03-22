# Amplify AR Stage Platform Research

**Date:** March 20, 2026  
**Purpose:** Evaluate AR platforms for Amplify's music stage AR visualization layer for live events

---

## 1. Platform Evaluations

### 8thWall (WebXR Platform)

**Overview:** 8thWall is a web-based AR platform that enables AR experiences directly in mobile browsers without app installation. Acquired by Apple in 2023.

**Strengths:**
- True cross-platform: works on both iOS and Android via Safari/Chrome
- No app download required—perfect for event attendees
- WebXR standard implementation
- SLAM (Simultaneous Localization and Mapping) for surface detection
- Face, body, and surface tracking capabilities
- Direct URL sharing for instant access

**Weaknesses:**
- Commercial pricing (~$500/year for indie, higher for commercial)
- Performance limited by browser sandbox
- Dependent on device capabilities exposed to browser
- Limited offline support
- Complex 3D scenes may suffer on lower-end devices

**Best for Amplify:** High-value live events where audience reach matters more than absolute performance

---

### AR.js (Open Source)

**Overview:** Open-source AR library built on top of A-Frame and Three.js. One of the most mature open-source web AR solutions.

**Strengths:**
- Completely free and open-source (MIT license)
- Marker-based and markerless modes
- Works with A-Frame (HTML-like syntax) or raw Three.js
- Good community support and documentation
- Can run on low-end devices
- WebAR capabilities via marker tracking

**Weaknesses:**
- Marker-based mode requires printed/digital markers
- Markerless (location-based) is limited compared to native
- Performance can be inconsistent across devices
- UI/debugging tooling is basic
- Limited face/body tracking features
- Development has slowed (last major updates ~2022)

**Best for Amplify:** Budget-conscious projects with marker-based use cases (venue markers, stage elements)

---

### Reality Composer Pro (Apple)

**Overview:** Apple's AR development tool, part of Xcode 15+. Designed for creating AR experiences for Apple devices using RealityKit.

**Strengths:**
- Tight integration with ARKit (Apple's native AR framework)
- Exceptional performance on Apple devices
- USDZ format for 3D assets (native Apple support)
- Can publish directly to App Store
- Portal experiences, face/body tracking, scene reconstruction
- Swift + SwiftUI integration

**Weaknesses:**
- **Apple-only**—no Android, no web
- Requires macOS development machine
- Must go through App Store review for updates
- Not suitable for cross-platform live events without additional work
- iOS 17+ features require latest devices
- Cannot be experienced via browser URL

**Best for Amplify:** Native iOS app companion for Apple-focused events or venues

---

### Meta Spark (Facebook/Meta)

**Overview:** Meta's AR creation platform for Instagram, Facebook, and Messenger. Used heavily for social media filters and effects.

**Strengths:**
- Massive reach via Instagram/Facebook integration
- No-code creation tool (Meta Spark Studio)
- Built-in face filters, world effects, segmentation
- Free to use
- Large creator community and tutorials
- Target tracking for products/images

**Weaknesses:**
- **Effectively discontinued**—Meta sunsetting Spark platform (announced late 2024)
- Effects only work within Meta's apps (Instagram, Facebook)
- Cannot create standalone AR experiences
- No way to export or self-host effects
- Limited to Meta's AR capabilities (mostly face/body/frame)
- Not suitable for live event stage visualization
- No timeline for platform longevity

**Best for Amplify:** Not recommended—platform in sunset phase

---

### Three.js + WebXR

**Overview:** Three.js is the dominant WebGL 3D library; WebXR API provides AR/VR device access directly in browsers.

**Strengths:**
- Complete control over rendering pipeline
- Maximum flexibility for custom shaders, materials, effects
- WebXR Device API is W3C standard
- Works with A-Frame, React-Three-Fiber, or raw Three.js
- Massive ecosystem, tutorials, examples
- Can target WebXR-capable devices (Quest, mobile, desktop)
- Free and open-source

**Weaknesses:**
- Requires significant Three.js/WebXR expertise
- No pre-built AR features (you build everything)
- AR session management is low-level
- Performance optimization is your responsibility
- Fragment shader complexity limited by mobile GPUs
- Testing across devices/browsers is complex

**Best for Amplify:** When you need custom stage visualizations with maximum control and have Three.js expertise

---

### MindAR / MindAR.js

**Overview:** Open-source AR library focused on face and image marker tracking, built as an alternative to AR.js.

**Strengths:**
- Strong face tracking (face filters, makeup, accessories)
- Image marker tracking
- Open-source and free
- Works in browser (WebGL-based)
- Good for face-filter style effects

**Weaknesses:**
- Face-focused—not suited for world/surface tracking
- Image markers only (no surface plane detection)
- Limited documentation
- Smaller community than AR.js
- Not actively maintained (minimal updates since ~2021)
- No SLAM or spatial mapping

**Best for Amplify:** Not suitable for stage AR—better for face filter applications

---

## 2. Key Decisions Analysis

### WebXR (Browser-Based) vs Native AR (ARKit/ARCore)

| Factor | WebXR | Native ARKit/ARCore |
|--------|-------|---------------------|
| **Audience Reach** | Any device with browser | Must install app / platform-specific |
| **Performance** | Good (GPU bottleneck) | Excellent (direct GPU access) |
| **Features** | Core WebXR features | Full platform capabilities |
| **Distribution** | URL/link sharing | App Store / Play Store |
| **Offline** | Limited | Full |
| **Update Cycle** | Instant (deploy changes) | App review required |
| **Cost** | Platform fees (8thWall) or DIY | Dev tools free, store fees |
| **Live Events** | ✅ Ideal (quick onboarding) | ⚠️ Friction for attendees |

**Recommendation for Amplify:** **WebXR-first** for live events where attendee friction must be minimized. Consider native companion app only if performance is absolutely critical.

---

### Marker-Based vs Markerless (Location/Surface)

| Factor | Marker-Based | Markerless (SLAM/Surface) |
|--------|--------------|---------------------------|
| **Setup** | Must place/display markers | Just scan environment |
| **Reliability** | Highly consistent | Variable by device |
| **Use Case Fit** | Fixed stage elements | Dynamic/free-form AR |
| **Branding** | Can integrate markers into design | Invisible to audience |
| **Device Variance** | Consistent across devices | Wide performance variance |
| **Live Event Demo** | Requires marker placement | Works faster on clean stages |

**Recommendation for Amplify:** **Hybrid approach.** Use markerless SLAM for the main stage area (attendees point phones at stage), with optional venue markers to anchor specific effects. Markers can serve as "reset anchors" if tracking drifts.

---

### iOS vs Android vs Web Support

| Platform | Coverage | Challenge |
|----------|----------|-----------|
| **Web (Mobile)** | ~95% of devices | Browser capability variance |
| **iOS (ARKit)** | ~55% of US smartphones | App Store dependency |
| **Android (ARCore)** | ~70% of global smartphones | Fragmented OS versions |

**Recommendation for Amplify:** **Web-first with ARCore/ARKit fallbacks.** Use WebXR with device capability detection—gracefully degrade to 3D viewer if AR unavailable. This maximizes reach while optimizing for AR-capable devices.

---

### Performance Considerations

For music stage AR visualization, key performance constraints:

1. **Frame Rate:** Must maintain 60fps for smooth AR. Stage effects with many particles/shaders will struggle on mobile browsers.

2. **Latency:** AR rendering + stage sync requires <50ms total latency. WebXR introduces overhead vs. native.

3. **Lighting:** Mobile AR has difficulty with stage lighting (often dark with dramatic spotlights). Plan effects that work in low-light or use environment probes.

4. **Tracking Stability:** Stage environments have moving performers, lights, and fog. SLAM can lose tracking. Use fixed anchor points where possible.

5. **Thermal:** Extended AR use drains batteries and heats devices. Inform attendees to have charging available.

**Recommendation:** Build with a "quality tiers" system—full effects for high-end devices (iPhone 14+, Pixel 8+, Galaxy S23+), simplified effects for older devices.

---

### Development Complexity

| Platform | Learning Curve | Time to MVP | Maintenance |
|----------|---------------|-------------|-------------|
| **8thWall** | Low-Medium | 1-2 weeks | Low |
| **AR.js** | Medium | 2-4 weeks | Medium |
| **Reality Composer Pro** | Medium | 2-3 weeks | Medium |
| **Meta Spark** | Low | 1-2 weeks | N/A (sunset) |
| **Three.js + WebXR** | High | 4-8 weeks | High |
| **MindAR** | Medium | 2-3 weeks | Low |

---

## 3. Recommendation for Amplify

### Primary Recommendation: **8thWall WebXR + Three.js Hybrid**

**Rationale:**
1. **Live event context demands frictionless access.** WebXR via 8thWall allows attendees to scan a QR code and immediately experience AR—no app install, no platform lock-in.

2. **Cross-platform reach.** Stage performances at venues like Red Rocks or festival circuits attract diverse audiences. Web covers iOS, Android, and even desktop fallback.

3. **Performance balance.** 8thWall handles device compatibility and WebXR session management while Three.js gives full control over custom stage shaders and effects.

4. **Production stability.** 8thWall has enterprise support and 99.9% uptime SLAs—critical for live events where technical failures are visible.

5. **Rapid iteration.** When a performer adds a new visual element the day before, you can deploy updated AR without app store review.

### Secondary Option: **Three.js + WebXR (Full DIY)**

If budget is constrained or extreme customization is needed:

- Use Three.js with `@webxr-native/xr` or `webxr` polyfill for WebXR device access
- Implement custom SLAM using device sensors if needed
- Accept higher development complexity and maintenance burden

This is viable if the team has strong Three.js/WebGL expertise and 3+ months for initial development.

### What to Avoid

- **Meta Spark:** Sunset/unsupported—do not build on
- **MindAR:** Insufficient world-tracking for stage use cases
- **Native-only (ARKit OR ARCore, not both):** Splits your audience unnecessarily
- **Pure marker-based:** Too limiting for dynamic stage performance AR

---

## 4. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [ ] Set up 8thWall developer account and project
- [ ] Deploy Three.js scene with basic stage geometry
- [ ] Implement WebXR session management
- [ ] Create device capability detection
- [ ] Build QR code generation and landing page

### Phase 2: Core AR Features (Weeks 5-8)
- [ ] Integrate surface/plane detection for stage floor
- [ ] Implement image marker tracking for venue anchors
- [ ] Build basic particle system for pyrotechnic effects
- [ ] Add lighting estimation for realistic rendering
- [ ] Test on target device fleet (iPhone 12+, Pixel 6+, Galaxy S21+)

### Phase 3: Performance Optimization (Weeks 9-12)
- [ ] Implement quality tier system (low/medium/high)
- [ ] Optimize shaders for mobile GPU
- [ ] Add tracking recovery for when AR session loses lock
- [ ] Profile and reduce thermal impact
- [ ] Add analytics for tracking performance across devices

### Phase 4: Live Event Integration (Weeks 13-16)
- [ ] Integrate with show control system (OSC, MIDI, or custom)
- [ ] Build DMX/lighting sync triggers
- [ ] Test in actual venue environment
- [ ] Create operator dashboard for monitoring
- [ ] Develop attendee troubleshooting guide

---

## 5. Platform Comparison Matrix

| Platform | Cost | iOS | Android | Web | Performance | Features | Maintenance | Stage AR Fit |
|----------|------|-----|---------|-----|-------------|----------|-------------|--------------|
| **8thWall** | $$-$$$ | ✅ | ✅ | ✅ | Good | High | Low | ⭐⭐⭐⭐⭐ |
| **AR.js** | Free | ✅ | ✅ | ✅ | Moderate | Medium | Low | ⭐⭐⭐ |
| **Reality Composer Pro** | Free | ✅ | ❌ | ❌ | Excellent | High | Medium | ⭐⭐ (iOS only) |
| **Meta Spark** | Free | ⚠️ | ⚠️ | ❌ | Good | Medium | N/A | ⭐ (sunset) |
| **Three.js + WebXR** | Free | ✅ | ✅ | ✅ | Good-Excellent | Maximum | High | ⭐⭐⭐⭐ |
| **MindAR** | Free | ✅ | ✅ | ✅ | Moderate | Low | Low | ⭐ (face only) |

---

## 6. Resource Requirements

### For 8thWall + Three.js Approach
- **Team:** 1-2 Three.js/WebGL developers, 1 XR/AR specialist
- **Budget:** 8thWall subscription (~$500-1500/year), compute for any backend sync
- **Devices:** Target fleet of 10-20 test devices (various generations)
- **Timeline:** 4 months to production-ready for first live event

### For Three.js + Native Fallback Approach
- **Team:** 2-3 developers (WebGL + iOS native + Android native)
- **Budget:** Store fees ($100-300/year each platform), more dev time
- **Devices:** Expanded test fleet
- **Timeline:** 6+ months to cover all platforms

---

## 7. Conclusions

For Amplify's music stage AR visualization at live events, **8thWall combined with Three.js** offers the optimal balance of:

- **Reach:** Any attendee with a phone can participate via browser
- **Performance:** Good enough for complex stage effects on modern devices
- **Reliability:** Enterprise infrastructure for live event criticality
- **Flexibility:** Full Three.js control for custom shader effects
- **Speed:** Faster iteration than native app development

The hybrid approach—WebXR for broad access, native ARKit/ARCore as progressive enhancement—ensures no attendee is left out while delivering premium experiences for those with capable devices.

---

*Research compiled: March 20, 2026*  
*Next Steps: Evaluate 8thWall pricing tiers, assess Three.js AR starter templates, and define MVP feature scope*
