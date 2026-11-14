# Rigged 3D models for the hero

The hero can load two **rigged, animated 3D women** (GLB files) that really walk down the boutique and sit on the sofa. Until those files exist, it uses the flat photo cut-outs.

Code can't create these models. They're made with external tools that need your own accounts. Here's the simplest pipeline.

## Honest expectations
- Long, flowing outfits (kaftans, lehengas, abayas) are the hardest thing to animate. A skeleton bends the body, but loose fabric doesn't swing on its own and can clip through the legs when she sits. Fitted outfits (e.g. the black gown) work best.
- Two rigged characters add about 5–10 MB of download and GPU work. The site loads them only on capable desktops; phones and slower PCs keep the lighter version.
- For **truly photo-real motion**, a short video is still the best option: generate an 8–10 s clip of the models walking through a boutique (e.g. Google Veo, Kling, Runway or Sora) and upload it as the hero video in WordPress (**Settings → Anashion Headless → Hero video**). It plays as the visitor scrolls.

## Pipeline (about 1–2 hours per model)
1. **Character image.** Generate a front-facing full-body image for 3D conversion:
   > Full-body photo of one elegant Pakistani woman in [OUTFIT from image-prompts.md], standing in a neutral A-pose (arms slightly away from the body, legs slightly apart), facing the camera, plain light-grey background, even flat lighting, no shadows, whole body from head to feet, photorealistic.

   Also make a back view if the 3D tool accepts multiple views.
2. **Image → 3D.** Upload it to an image-to-3D tool: **Meshy**, **Tripo3D** or **Hyper3D Rodin**. Choose a textured, realistic output of about 30–60k triangles with 2K textures.
3. **Rig + animate.**
   - **Easiest:** use the tool's built-in auto-rig and animation library (Meshy and Tripo both have one). Pick a **walk** (a female or catwalk walk), **stand-to-sit** and **sitting idle**.
   - **Or Mixamo** (free with an Adobe account): upload the model, auto-rig it, and download "Walking" (or "Catwalk Walk Forward"), "Stand To Sit" and "Sitting Idle" with skin. Combine them in Blender (import FBX → push each animation to an action → export glTF/GLB).
4. **Name the animations** `walk`, `sit` and `idle` (or tell us the names you used).
5. **Optimise:**
   ```bash
   npx @gltf-transform/cli optimize model.glb model-1.glb --texture-compress webp --texture-size 2048
   ```
   Aim for under about 5 MB per file.
6. **Drop them in:** `frontend/public/models/model-1.glb` and `frontend/public/models/model-2.glb`, then restart `npm run dev`. The hero switches to them automatically on capable desktops.
