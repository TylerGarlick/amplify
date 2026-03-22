# Deep Dive: AR Stage Platforms for Amplify

**Date:** March 21, 2026  
**Purpose:** Document AR platform capabilities for Amplify's music stage visualization layer — with focus on geo-anchoring, scene segmentation, and AR glasses integration

---

## 1. ARKit ARGeoTrackingConfiguration

### Overview

`ARGeoTrackingConfiguration` is Apple's native AR configuration that combines GPS/coordinate data with visual-inertial odometry to anchor digital content to real-world geographic locations. It's the foundation for placing persistent AR content at specific stage venues without marker placement.

### AR Capabilities Relevant to Music Stage Visualization

- **Geo-Anchors (ARGeoAnchor):** Pin virtual stage elements (performer labels, visual effects, interactive zones) to precise GPS coordinates. When users point their device at the stage, content appears exactly where it should be relative to the physical venue.
- **World Mapping:** Combines ARKit's world tracking with location data to create a coordinate frame tied to real-world latitude/longitude. Useful for multi-user AR where all attendees see the same content at the same physical location.
- **6 DoF (Six Degrees of Freedom):** Full positional tracking — users can walk around virtual stage elements and view them from different angles, not just see them flatly overlaid.
- **Scene Reconstruction (LiDAR):** On devices with LiDAR (iPhone 12 Pro+, iPad Pro with LiDAR), the system builds a mesh of the physical environment for real-time occlusion — performers can walk in front of virtual elements and block them naturally.
- **集成 with Apple Maps:** Geo anchors align with map data, enabling venue-scale AR experiences that work across large outdoor festival sites.

### Limitations and Constraints

- **Device exclusivity:** ARKit only runs on Apple devices (iPhone, iPad). No Android, no web. Splits the audience if used as the primary platform.
- **Location drift:** GPS accuracy is typically 3-10 meters horizontally. For precise stage alignment, GPS alone is insufficient — you'd need to combine with visual anchors (marker points at known physical locations within the venue).
- **Limited outdoor accuracy:** Wide-area AR tracking degrades in dense urban environments with poor GPS signal or multi-path interference from buildings.
- **No persistent world maps across users:** While geo anchors provide a shared coordinate frame, each user's device builds its own local world map. Multi-user sync is possible but requires additional networking/persistence infrastructure.
- **Requires iOS 14+ for geo anchors, iOS 17+ for full ARGeoTrackingConfiguration:** Minimum OS version constraints older devices.
- **Battery intensive:** Continuous AR session + GPS + camera drains battery rapidly at live events.

### Integration Complexity

**Medium.** ARKit is well-documented with Swift APIs. The `ARGeoTrackingConfiguration` is instantiated like any other `ARConfiguration`. The challenge is building the surrounding infrastructure: anchor management, world map serialization for persistence, and multi-user synchronization. If you're already building a native iOS app, this is straightforward. If you need cross-platform, it becomes a separate iOS-only track.

### Real-World Device Support

- **iPhone:** 12 and newer (for best geo tracking quality)
- **iPad Pro:** 2020 and newer with LiDAR
- **Coverage:** ~55% of US smartphone users, but concentrated in higher-income demographics who attend paid live events
- **Outdoor festival viability:** Good in open-air venues; degraded in dense urban venues or indoors

### Pricing/Licensing

- **Free:** ARKit is a free Apple SDK. No per-user or per-app fees.
- **App Store fees:** Standard $99/year developer program fee for distribution.
- **Hardware required:** Mac for iOS development, device fleet for testing.

---

## 2. Meta SAM 2 (Segment Anything Model 2)

### Overview

SAM 2 (Segment Anything Model 2) is Meta's foundation model for promptable visual segmentation in images and videos. The original SAM was 2D image segmentation; SAM 2 extends this to **video** with real-time object tracking across frames. While not strictly "3D" in the sense of depth maps, SAM 2's video segmentation capabilities can be used to build 3D scene understanding by processing multiple viewpoints.

### AR Capabilities Relevant to Music Stage Visualization

- **Real-Time Video Segmentation:** SAM 2 can segment objects (performers, instruments, stage props) in real-time video streams. This enables occlusion handling — virtual stage elements can be placed behind real performers naturally.
- **Prompt-Based Segmentation:** You can point to a performer and SAM 2 will segment them across all video frames, creating a mask that can be used for compositing virtual content behind them.
- **3D Reconstruction from Video:** By running SAM 2 segmentation across multiple camera angles of the same scene, you can generate point clouds or mesh representations of stage geometry. Combined with COLMAP or similar photogrammetry pipelines, this enables accurate 3D stage reconstruction.
- **Per-Frame Object Tracking:** The `SAM2VideoPredictor` tracks multiple objects across video frames with memory — useful for following a performer as they move across the stage.
- **Model Checkpoints Available:** SAM 2.1 model weights are publicly downloadable (Facebook public files), and the model can be run locally on GPU hardware or via cloud inference.

### Limitations and Constraints

- **Not Real-Time On-Device:** Running SAM 2 on a mobile device in real-time is not feasible with current hardware. It requires GPU-accelerated inference (NVIDIA GPU recommended). For live events, you'd need edge computing or cloud inference with low-latency streaming of results to the device.
- **No Native 3D Output:** SAM 2 outputs 2D segmentation masks per frame. Converting this to 3D scene geometry requires additional processing — Structure-from-Motion, depth estimation, and mesh reconstruction pipelines.
- **Training/Customization Required:** The base SAM 2 model is general-purpose. For stage-specific segmentation (recognizing specific lighting rigs, stage structures, pyrotechnics), you'd need to fine-tune on stage-specific data.
- **Latency:** Even with optimized inference, there's a delay between capturing video and receiving segmentation results. For tight AR synchronization with live music, this could be noticeable.
- **Not a Production AR SDK:** SAM 2 is a research model, not a drop-in AR platform. Significant engineering is required to integrate it into a real-time AR pipeline.

### Integration Complexity

**Hard.** SAM 2 is not an AR SDK — it's a model you run inference against. Integrating it into Amplify's AR pipeline requires:
1. A video capture pipeline (device camera → frames)
2. A SAM 2 inference service (cloud GPU or edge GPU)
3. A segmentation results stream back to the AR client
4. Integration with your AR rendering pipeline (occlusion masks, mesh generation)
5. Latency compensation to sync virtual content with the real world

This is a research/engineering effort, not a platform integration.

### Real-World Device Support

- **Inference hardware:** Requires NVIDIA GPU (A100 or RTX 3090+ recommended for real-time video). Consumer GPUs will struggle with video-rate inference.
- **Client-side AR:** Works on any device that can display AR content (iOS, Android, WebXR) as long as the SAM 2 inference runs server-side.
- **Viability for live events:** Only feasible with dedicated edge computing hardware on-site or low-latency cloud inference.

### Pricing/Licensing

- **Free for research and commercial use:** Apache 2.0 license for model weights and code.
- **Compute costs:** GPU infrastructure for inference (cloud: ~$2-3/hr for A100 instance, or dedicated edge hardware ~$5,000-15,000).
- **No per-seat or per-usage fees from Meta.**

---

## 3. RayNeo SDK

### Overview

RayNeo (formerly Rokid) makes consumer AR glasses and provides an SDK for developers to build experiences targeting their hardware. RayNeo Air and RayNeo X2 are the main devices, featuring waveguide displays, bone-conduction audio, and gesture controls.

### AR Capabilities Relevant to Music Stage Visualization

- **Spatial Display:** AR glasses overlay content directly in the user's field of view, creating an immersive "heads-up" experience where stage visualizations appear anchored in the real world rather than on a phone screen.
- **Hand Tracking:** Built-in camera tracks hand gestures for interactive controls without holding a device.
- **6 DoF Tracking:** RayNeo X2 supports 6-degree-of-freedom head tracking for stable AR anchoring.
- **Lightweight Form Factor:** Unlike VR headsets, AR glasses are socially acceptable at live events — attendees can still see the stage and their surroundings while viewing AR overlays.
- **AR Glasses-Native Rendering:** The SDK provides APIs for rendering 3D content at spatial anchors, compatible with Unity.

### Limitations and Constraints

- **Very limited device market share:** RayNeo glasses are niche, primarily sold in China. Adoption in North American live event audiences would be minimal without hardware distribution programs.
- **SDK documentation quality:** Compared to Apple or Meta, RayNeo's developer documentation is less mature. Expect more trial-and-error and community forum reliance.
- **No LiDAR or advanced scene reconstruction:** The glasses lack depth sensors for real-time mesh generation. Scene understanding is limited to plane detection and basic spatial anchors.
- **Field of View (FOV):** Consumer AR glasses typically have FOV in the 30-40° range — much narrower than VR headsets. Stage visualizations that "fill" the environment won't work; content must be designed for near-eye display.
- **Battery life:** 2-4 hours continuous use. At a 3-4 hour concert, batteries will die mid-show.
- **Not consumer-deployed at scale:** You can't assume your audience owns RayNeo glasses. Any AR glasses experience would require hardware lending/distribution at the event.

### Integration Complexity

**Medium.** The RayNeo SDK has Unity support and provides spatial anchor APIs. If you're already building in Unity for other platforms, adding RayNeo as a target is moderate. The challenge is the limited audience and the need for on-site hardware distribution.

### Real-World Device Support

- **RayNeo Air/X2:** Consumer AR glasses sold primarily in Asia. Market share in North America: <1%.
- **Viability for live events:** Only viable for VIP/exclusive experiences where hardware can be provided to attendees, not general audience deployment.

### Pricing/Licensing

- **SDK:** Free to download and develop against.
- **Device cost:** RayNeo Air ~$400-500 per unit. For an event with 500 VIP attendees, hardware costs alone would be $200,000+.
- **No commercial licensing fees disclosed.**

---

## 4. XREAL SDK

### Overview

XREAL (formerly Nreal) is one of the leading consumer AR glasses platforms, with the Air 2 Ultra being the current developer-focused device. XREAL has the largest market share among consumer AR glasses (~40% in 2023, 350,000+ units sold) and provides a full SDK with Unity and AR Foundation support.

### AR Capabilities Relevant to Music Stage Visualization

- **Spatial Anchors:** Place persistent virtual content at specific 3D coordinates in the real world, shared across multiple users. This is directly applicable to stage visualization — multiple attendees could see the same AR content anchored to the stage.
- **Depth Meshing:** Generate a real-time 3D mesh of the environment for occlusion rendering. Performers can naturally walk in front of virtual elements.
- **Plane Detection:** Detect horizontal and vertical planes (stage floor, back wall) for anchoring content.
- **Hand Tracking:** High-fidelity hand tracking with pinch, grab, and swipe gestures for user interaction.
- **Image Tracking:** Track specific images (posters, venue markers) and anchor AR content to them.
- **6 DoF Tracking:** Full head pose tracking for stable AR anchoring.
- **Screen Mirroring + Spatial Display:** Works both as a secondary display and as a full spatial computing device.
- **Cross-Platform Support:** SDK supports Unity (including AR Foundation integration), making it easier to port from other AR platforms.

### Limitations and Constraints

- **AR Glasses Dependency:** Like RayNeo, this requires attendees to have or borrow XREAL glasses. For general live event audiences, this is a significant barrier.
- **Phone Compatibility Requirements:** The Air 2 Ultra requires a compatible Samsung phone (Galaxy S22/S23 with Snapdragon) for spatial computing. iPhone is not supported. This limits the audience significantly.
- **Field of View:** 52° FOV is better than most consumer AR glasses but still narrower than VR. Content must be designed for near-eye display, not environmental immersion.
- **No Built-in GPS:** Spatial anchoring uses inside-out tracking + image markers, not GPS. For large outdoor festival sites spanning multiple acres, geo-anchoring requires additional work.
- **Enterprise vs. Consumer SDK:** XREAL's more advanced features (spatial anchors, depth meshing) may require the commercial SDK tier.

### Integration Complexity

**Easy-Medium.** XREAL has the most developer-friendly SDK of the AR glasses platforms:
- Unity AR Foundation integration means you can target XREAL alongside iOS (ARKit) and Android (ARCore) from the same codebase.
- Clear documentation, Discord community with 10,000+ members.
- Spatial anchor and depth mesh APIs are well-documented.
- The challenge is device availability — you'd need to provide hardware to attendees.

### Real-World Device Support

- **Air 2 Ultra:** ~350,000 units sold globally as of 2023. Largest consumer AR glasses platform by market share.
- **Compatible phones:** Samsung Galaxy S22/S23/S24 with Snapdragon. Not iPhone compatible.
- **US/European market presence:** Growing, but still niche.
- **Viability for live events:** VIP hardware programs are feasible; general audience deployment is not.

### Pricing/Licensing

- **SDK:** Free to download and develop.
- **Device cost:** Air 2 Ultra ~$700 per unit for developers.
- **Commercial licensing:** Contact XREAL for commercial deployment terms.
- **Nebula App:** Free companion app for spatial computing on supported phones.

---

## 5. Lumus SDK (Waveguide AR Display)

### Overview

Lumus is a **waveguide optical engine manufacturer** — they make the reflective waveguide technology that goes inside AR glasses from companies like OPPO, Lenovo, and others. Lumus does **not** sell consumer AR glasses. Instead, they license their waveguide technology to ODMs (original design manufacturers) who build glasses around it.

### AR Capabilities Relevant to Music Stage Visualization

- **High-Quality Waveguide Displays:** Lumus waveguides offer best-in-class visual quality for AR glasses: high brightness (>10,000 nits), wide FOV (up to 55°), excellent color accuracy. When integrated into consumer AR glasses, this enables stage visualizations that are clearly visible even in bright outdoor festival environments.
- **2D Expansion Reflective Waveguide:** The core Lumus technology expands a micro-projector's image across a reflective waveguide in both X and Y dimensions, projecting it to the user's eye with minimal distortion.
- **OEM Integration Path:** If Amplify wants to work with a specific AR glasses manufacturer that uses Lumus technology (e.g., OPPO's Air Glass 3, Lenovo's ThinkReality), you would integrate with that manufacturer's SDK, not directly with Lumus.
- **No Direct SDK:** Lumus does not provide a developer SDK. They are a components supplier. Developer support depends on the OEM using their waveguides.

### Limitations and Constraints

- **No Direct Developer Access:** Lumus does not have a developer program, SDK download page, or developer community. They supply optics to companies, not to developers.
- **Fragmented OEM Landscape:** Each manufacturer that uses Lumus waveguides has their own SDK and platform. There's no unified "Lumus SDK" to target.
- **Device Availability:** Lumus-powered consumer glasses (OPPO Air Glass 3, etc.) are primarily available in Asia. North American availability is limited.
- **Not a Standalone AR Platform:** Even if you target Lumus-powered devices, you still need to integrate with the OEM's platform (OPPO's AR platform, etc.), which may have its own limitations.

### Integration Complexity

**Not Applicable (N/A).** There is no Lumus SDK to integrate with directly. If targeting Lumus-powered devices, you integrate with the OEM's SDK instead.

### Real-World Device Support

- **OPPO Air Glass 3:** Available in China. ~$700-800.
- **Lenovo ThinkReality devices:** Enterprise-focused, not consumer.
- **Other Lumus licensees:** Quanta Computer (manufacturing partner), various ODMs building enterprise headsets.
- **Viability for live events:** Very limited. Consumer deployment not feasible in Western markets.

### Pricing/Licensing

- **Lumus components:** Not sold directly to developers or consumers.
- **OEM/device pricing:** Varies by manufacturer.
- **Licensing:** Lumus licenses their technology to ODMs; commercial terms are not public.

---

## 6. Summary Comparison

| Platform | AR Capabilities | Stage AR Fit | Integration | Device Support | Pricing |
|----------|----------------|--------------|-------------|---------------|---------|
| **ARKit ARGeoTracking** | Geo anchors, world map, 6 DoF, LiDAR occlusion | ⭐⭐⭐⭐ | Medium | iOS only (~55% US) | Free (Apple SDK) |
| **Meta SAM 2** | Video segmentation, object tracking, 3D reconstruction | ⭐⭐⭐ (as backend) | Hard | GPU inference (cloud/edge) | Free (Apache 2.0) + compute |
| **RayNeo SDK** | Spatial display, hand tracking, 6 DoF, Unity | ⭐⭐ (VIP only) | Medium | RayNeo glasses (<1% US) | Free SDK + ~$500/device |
| **XREAL SDK** | Spatial anchors, depth mesh, hand tracking, 6 DoF, Unity/AR Foundation | ⭐⭐⭐ (VIP + dev) | Easy-Medium | XREAL Air 2 Ultra (~350K sold) | Free SDK + ~$700/device |
| **Lumus SDK** | Waveguide optics (no SDK) | N/A | N/A | OEM devices (limited) | Component supplier |

---

## 7. Summary Recommendations

### For General Audience Live Events (QR Code / Browser-Based)

**Primary:** Continue with the 8thWall + Three.js approach documented in the existing platform research (plans/amplify-ar-stage-platforms-2026-03-20.md). This remains the optimal path for frictionless audience access via phone browsers.

**Why:** None of the AR glasses platforms (RayNeo, XREAL) are consumer-deployed at scale in North America. You cannot assume your audience has hardware. Geo-anchoring via ARKit alone splits the audience to iOS users (~55%). 8thWall provides cross-platform browser-based AR that works for everyone immediately.

### For VIP / Premium Experiences (AR Glasses)

**Primary:** **XREAL SDK** over RayNeo.

**Why:** XREAL has larger market share, better documentation, Unity AR Foundation integration (meaning you can develop for XREAL alongside iOS/Android from the same codebase), and an active developer community. RayNeo's SDK is less documented and the platform has less traction outside Asia.

**Recommendation:** Partner with XREAL for a VIP AR glasses program at select high-value events (e.g., Red Rocks residency). Provide hardware to VIP ticket holders. This creates a premium experience that justifies the hardware investment.

### For Scene Understanding / Occlusion (Backend Processing)

**Secondary:** **SAM 2** as a backend processing layer for stage reconstruction and performer occlusion.

**Why:** SAM 2 can segment performers from video feeds (from venue cameras or a dedicated edge camera), generating masks that enable virtual stage elements to appear naturally behind real performers. This is a cloud/edge compute pipeline, not a direct consumer-facing SDK integration.

**Caveat:** Only pursue this if you have GPU compute infrastructure or can partner with an edge computing provider. The latency and engineering complexity are significant.

### For Geographic Stage Anchoring

**Primary:** **ARKit ARGeoTrackingConfiguration** for iOS-native VIP companion app.

**Why:** When combined with venue-specific calibration (placing visual anchors at known physical locations within the venue), ARKit's geo anchors provide a reliable shared spatial frame for stage content. This is the most technically sound approach for persistent geo-anchored AR at specific venues.

**Recommendation:** Build an iOS companion app with ARKit geo anchors as a premium feature. This pairs well with the XREAL VIP glasses program — iOS attendees get geo-anchored AR on their phones, VIPs with XREAL glasses get the spatial display experience.

### What Not to Pursue

- **Lumus SDK:** No direct developer access. No consumer devices in Western markets. Not a viable integration target.
- **Meta Spark:** Effectively discontinued/sunset. Already noted in prior research, but worth restating — do not build on this platform.
- **RayNeo as primary platform:** Too limited market penetration and documentation depth compared to XREAL.

---

## 8. Recommended Architecture for Amplify

```
Audience (General)
└── Phone Browser → 8thWall WebXR → Three.js Stage Visualizations
    (QR code entry, no app install required)

Audience (VIP / Premium)
├── iOS VIP App → ARKit ARGeoTracking + Visual Anchors → Stage Visualizations
└── XREAL Glasses Program → XREAL SDK → Spatial Stage Display
    (hardware provided at event)

Backend Processing (Optional)
├── Venue Camera Feeds → SAM 2 Video Segmentation → Occlusion Masks
└── Stage Geometry Reconstruction → COLMAP + Depth Estimation → 3D Stage Mesh
```

---

*Research compiled: March 21, 2026*  
*Related: plans/amplify-ar-stage-platforms-2026-03-20.md (general AR platform survey)*
