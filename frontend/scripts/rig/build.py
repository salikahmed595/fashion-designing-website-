# Blender (background) script: volumetric body from prep.py output, armature,
# distance-based skin weights, walk / sit / idle actions, GLB export.
# usage: blender -b --factory-startup -P build.py -- <prepdir> <out.glb> [render.png]
import bpy, bmesh, json, sys, math
import numpy as np
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
D, OUT = argv[0], argv[1]
RENDER = argv[2] if len(argv) > 2 else None
meta = json.load(open(D + "/meta.json"))
g = np.load(D + "/grid.npz")
inside, depth, gx, gy = g["inside"], g["depth"], g["gx"], g["gy"]
s, W, H, bot, cx = meta["s"], meta["W"], meta["H"], meta["bot"], meta["cx"]
J = {k: Vector((v[0], 0.0, v[1])) for k, v in meta["joints"].items()}
Hm = (J["head_top"].z)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 30

# ---------- depth profile: thick body core, arms as tubes, thin drapery elsewhere ----------
def seg_dist(p, a, b):
    ab = b - a; t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-9)))
    return (p - (a + ab * t)).length

arms = [(J["shoulder_r"], J["elbow_r"]), (J["elbow_r"], J["hand_r"]), (J["shoulder_l"], J["elbow_l"]), (J["elbow_l"], J["hand_l"])]
hipz = J["hips"].z
def profile(x, z):
    # half-width of the body core grows from the hips to the hem
    hw = 0.12 * Hm if z > hipz else 0.12 * Hm + (hipz - z) / hipz * 0.07 * Hm
    core = 0.15 * max(0.0, min(1.0, 1 - (abs(x) - hw) / (0.04 * Hm)))
    p = Vector((x, 0, z))
    arm = max((0.05 - seg_dist(p, a, b)) for a, b in arms)
    arm = max(0.0, arm) * 0.9 + (0.03 if arm > -0.02 else 0.0)
    return max(core, arm, 0.012)

rows, cols = inside.shape
# depth per grid vertex, then a masked blur so the surface has no creases
dg = np.zeros((rows, cols))
for i in range(rows):
    z = (bot - gy[i]) * s
    for j in range(cols):
        if inside[i, j]:
            dg[i, j] = min(depth[i, j], profile((gx[j] - cx) * s, z))
msk = (depth > 0).astype(float)
def blur(a):
    p = np.pad(a, 2, mode="edge"); o = np.zeros_like(a)
    for di in range(5):
        for dj in range(5):
            o += p[di:di + rows, dj:dj + cols]
    return o / 25
for _ in range(3):
    dg = blur(dg * msk) / np.maximum(blur(msk), 1e-6) * msk
# keep a rounded edge: ease the depth toward 0 within ~3 cells of the silhouette
edge = msk.copy()
for _ in range(3):
    edge = np.minimum(edge, np.minimum.reduce([np.pad(edge, 1)[1:-1, :-2], np.pad(edge, 1)[1:-1, 2:], np.pad(edge, 1)[:-2, 1:-1], np.pad(edge, 1)[2:, 1:-1]])) * 0 + edge * 0 + blur(edge) * msk
dg *= np.sqrt(np.clip(edge, 0, 1))
idx_f = -np.ones((rows, cols), int); idx_b = -np.ones((rows, cols), int)
verts, uvs_v = [], []
for i in range(rows):
    z = (bot - gy[i]) * s
    for j in range(cols):
        if not inside[i, j]:
            continue
        x = (gx[j] - cx) * s
        d = float(dg[i, j])
        uv = (gx[j] / W, 1 - gy[i] / H)
        idx_f[i, j] = len(verts); verts.append((x, -d, z)); uvs_v.append(uv)
        if d > 1e-5:
            idx_b[i, j] = len(verts); verts.append((x, d, z)); uvs_v.append(uv)
        else:
            idx_b[i, j] = idx_f[i, j]  # silhouette: front and back meet

faces, fmat = [], []
for i in range(rows - 1):
    for j in range(cols - 1):
        q = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
        if all(inside[a, b] for a, b in q):
            faces.append([idx_f[a, b] for a, b in q]); fmat.append(0)
            faces.append([idx_b[a, b] for a, b in reversed(q)]); fmat.append(1)

me = bpy.data.meshes.new("body")
me.from_pydata(verts, [], faces)
me.update()
uvl = me.uv_layers.new(name="UVMap")
for poly in me.polygons:
    poly.material_index = fmat[poly.index]
    for li in poly.loop_indices:
        uvl.data[li].uv = uvs_v[me.loops[li].vertex_index]
bm = bmesh.new(); bm.from_mesh(me)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
dup = [f for f in bm.faces if len(set(v.index for v in f.verts)) < 3]
bmesh.ops.delete(bm, geom=dup, context="FACES")
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(me); bm.free()
me.validate()
for p in me.polygons:
    p.use_smooth = True
body = bpy.data.objects.new("Body", me)
scene.collection.objects.link(body)

def material(name, path):
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(path)
    tex.interpolation = "Linear"
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    gt = nt.nodes.new("ShaderNodeMath"); gt.operation = "GREATER_THAN"; gt.inputs[1].default_value = 0.5
    nt.links.new(tex.outputs["Alpha"], gt.inputs[0])
    nt.links.new(gt.outputs[0], bsdf.inputs["Alpha"])
    bsdf.inputs["Roughness"].default_value = 0.85
    m.use_backface_culling = False
    return m
me.materials.append(material("front", D + "/front.png"))
me.materials.append(material("back", D + "/back.png"))

# ---------- armature ----------
arm = bpy.data.armatures.new("Rig")
rig = bpy.data.objects.new("Rig", arm)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")
B = {}
def bone(name, h, t, parent=None):
    b = arm.edit_bones.new(name); b.head = h; b.tail = t
    if parent: b.parent = B[parent]
    B[name] = b
bone("hips", J["hips"], J["spine"])
bone("spine", J["spine"], J["chest"], "hips")
bone("chest", J["chest"], J["neck"], "spine")
bone("neck", J["neck"], J["head"], "chest")
bone("head", J["head"], J["head_top"], "neck")
for k, side in (("r", "R"), ("l", "L")):
    bone(f"upper_arm.{side}", J["shoulder_" + k], J["elbow_" + k], "chest")
    bone(f"forearm.{side}", J["elbow_" + k], J["hand_" + k], f"upper_arm.{side}")
    bone(f"thigh.{side}", J["hip_" + k], J["knee_" + k], "hips")
    bone(f"shin.{side}", J["knee_" + k], J["ankle_" + k], f"thigh.{side}")
bpy.ops.object.mode_set(mode="OBJECT")

# ---------- skin weights: inverse distance to bone segments, with region rules ----------
segs = {b.name: (b.head_local.copy(), b.tail_local.copy()) for b in arm.bones}
groups = {n: body.vertex_groups.new(name=n) for n in segs}
shw = abs(J["shoulder_l"].x)
kneez = J["knee_l"].z
def sstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)
def inv(p, names):
    ws = {n: 1.0 / (seg_dist(p, *segs[n]) + 0.025) ** 4 for n in names}
    t = sum(ws.values()); return {n: w / t for n, w in ws.items()}
TORSO = ["hips", "spine", "chest", "neck", "head"]
# the hand hangs past the forearm tail: extend forearm segments to cover the fingers
for sd in ("L", "R"):
    a, b = segs[f"forearm.{sd}"]
    segs[f"forearm.{sd}"] = (a, b + (b - a).normalized() * 0.13)
for v in me.vertices:
    p = Vector((v.co.x, 0, v.co.z))
    ws = {}
    def add(d, f):
        for n, w in d.items():
            ws[n] = ws.get(n, 0.0) + w * f
    # body: legs share the skirt smoothly left/right and thigh/shin, easing into the hips
    if p.z < hipz + 0.02:
        lt = sstep(-0.11, 0.11, p.x)
        th = sstep(kneez - 0.1, kneez + 0.1, p.z)
        hp = sstep(hipz - 0.16, hipz + 0.02, p.z)
        body_w = {"hips": hp}
        for sd, f in (("L", lt), ("R", 1 - lt)):
            body_w[f"thigh.{sd}"] = (1 - hp) * f * th
            body_w[f"shin.{sd}"] = (1 - hp) * f * (1 - th)
    else:
        body_w = inv(p, TORSO)
    # arms take over near the arm bones
    side = "L" if p.x > 0 else "R"
    an = [f"upper_arm.{side}", f"forearm.{side}"]
    da = min(seg_dist(p, *segs[n]) for n in an)
    af = 0.0 if (abs(p.x) < shw * 0.5 or p.z > J["shoulder_l"].z + 0.06) else max(0.0, min(1.0, (0.075 - da) / 0.045))
    add(body_w, 1 - af)
    if af > 0:
        add(inv(p, an), af)
    top = sorted(ws.items(), key=lambda kv: -kv[1])[:4]
    tot = sum(w for _, w in top) or 1.0
    for n, w in top:
        if w > 1e-4:
            groups[n].add([v.index], w / tot, "REPLACE")
body.parent = rig
mod = body.modifiers.new("Armature", "ARMATURE"); mod.object = rig

# ---------- animation helpers ----------
PB = rig.pose.bones
for pb in PB:
    pb.rotation_mode = "QUATERNION"
X, Z = Vector((1, 0, 0)), Vector((0, 0, 1))

def rot(name, ax=0.0, az=0.0, ay=0.0):
    pb = PB[name]; R = pb.bone.matrix_local.to_3x3()
    Rw = Matrix.Rotation(az, 3, Z) @ Matrix.Rotation(ay, 3, "Y") @ Matrix.Rotation(ax, 3, X)
    pb.rotation_quaternion = (R.inverted() @ Rw @ R).to_quaternion()

def loc(name, dw):
    pb = PB[name]; pb.location = pb.bone.matrix_local.to_3x3().inverted() @ Vector(dw)

def reset():
    for pb in PB:
        pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)

def key(f):
    for pb in PB:
        pb.keyframe_insert("rotation_quaternion", frame=f)
        pb.keyframe_insert("location", frame=f)

rig.animation_data_create()
def action(name, frames, pose_fn, cyclic=False):
    act = bpy.data.actions.new(name)
    rig.animation_data.action = act
    for f in frames:
        reset(); pose_fn(f); key(f)
    tr = rig.animation_data.nla_tracks.new(); tr.name = name
    tr.strips.new(name, int(frames[0]), act)
    rig.animation_data.action = None
    return act

deg = math.radians
Lt = (J["hip_l"] - J["knee_l"]).length
Ls = (J["knee_l"] - J["ankle_l"]).length
SEAT_HIP = 0.50
drop = SEAT_HIP - (J["ankle_l"].z + Ls)
back = math.sqrt(max(Lt * Lt - drop * drop, 0.0))
a_thigh = -math.atan2(back, max(drop, 0.0))

def seated(breath=0.0, look=0.0, k=1.0):
    loc("hips", (0, back * k, (SEAT_HIP - J["hips"].z) * k))
    for sd in ("L", "R"):
        rot(f"thigh.{sd}", ax=a_thigh * k, az=(0.05 if sd == "L" else -0.05) * k)
        rot(f"shin.{sd}", ax=-a_thigh * k)
        rot(f"upper_arm.{sd}", ax=deg(-20) * k, az=(deg(8) if sd == "R" else deg(-8)) * k)
        rot(f"forearm.{sd}", ax=deg(-38) * k)
    rot("spine", ax=deg(3) * k)
    rot("chest", ax=deg(2 + breath) * k)
    rot("head", ax=deg(-3) * k, az=look)

# walk: 33 frames (1.1 s) per two steps, in place
CYC = 33
def walk_pose(f):
    ph = 2 * math.pi * f / CYC
    sw = math.sin(ph)
    loc("hips", (0, 0, -0.012 + 0.012 * math.cos(2 * ph)))
    rot("hips", az=deg(4) * sw)
    rot("chest", az=deg(-5) * sw, ax=deg(-2))
    rot("thigh.L", ax=deg(-17) * sw)
    rot("thigh.R", ax=deg(17) * sw)
    rot("shin.L", ax=deg(14) * max(0.0, math.sin(ph + 1.9)))
    rot("shin.R", ax=deg(14) * max(0.0, math.sin(ph + 1.9 + math.pi)))
    rot("upper_arm.L", ax=deg(13) * sw, az=deg(-4))
    rot("upper_arm.R", ax=deg(-13) * sw, az=deg(4))
    rot("forearm.L", ax=deg(-10) + deg(-6) * max(0, -sw))
    rot("forearm.R", ax=deg(-10) + deg(-6) * max(0, sw))
    rot("head", az=deg(-2) * sw)
action("walk", list(range(0, CYC + 1, 3)) + [CYC], walk_pose)

def ease(t):
    return t * t * (3 - 2 * t)
SIT_N = 40
def sit_pose(f):
    t = ease(f / SIT_N)
    seated(k=t)
    rot("spine", ax=deg(3) * t + deg(-14) * math.sin(math.pi * t))
action("sit", list(range(0, SIT_N + 1, 4)), sit_pose)

IDLE_N = 120
def idle_pose(f):
    ph = 2 * math.pi * f / IDLE_N
    seated(breath=1.2 * math.sin(2 * ph), look=deg(6) * math.sin(ph))
action("idle", list(range(0, IDLE_N + 1, 10)), idle_pose)

# ---------- optional preview render: rest / walk / seated side by side ----------
if RENDER:
    reset()
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    scene.collection.objects.link(cam); scene.camera = cam
    cam.data.lens = 50
    light = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    light.data.energy = 3; light.rotation_euler = (deg(50), 0, deg(-30))
    scene.collection.objects.link(light)
    w = bpy.data.worlds.new("w"); scene.world = w
    w.color = (0.8, 0.8, 0.8)
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.color_type = "TEXTURE"
    scene.display.shading.light = "STUDIO"
    scene.render.resolution_x, scene.render.resolution_y = 420, 620
    scene.render.film_transparent = False
    cam.data.lens = 85
    shots = [("front", None, (0, -5.2, 0.85), (deg(90), 0, 0)),
             ("q34", None, (3.3, -4.0, 0.85), (deg(90), 0, deg(40))),
             ("walk", ("walk", 8), (4.3, -2.9, 0.85), (deg(90), 0, deg(56))),
             ("sit", ("idle", 0), (3.1, -4.1, 0.7), (deg(90), 0, deg(37)))]
    for tag, clip, pos, er in shots:
        reset()
        rig.animation_data.action = bpy.data.actions[clip[0]] if clip else None
        for tr in rig.animation_data.nla_tracks:
            tr.mute = True
        scene.frame_set(clip[1] if clip else 0)
        cam.location = pos; cam.rotation_euler = er
        scene.render.filepath = RENDER.replace(".png", f"-{tag}.png")
        bpy.ops.render.render(write_still=True)
    rig.animation_data.action = None
    for tr in rig.animation_data.nla_tracks:
        tr.mute = False
    reset()

bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format="GLB", export_animations=True, export_animation_mode="ACTIONS",
    export_image_format="WEBP", export_skins=True, export_yup=True, export_apply=False,
)
print("EXPORTED", OUT, len(me.vertices), "verts", "back", back, "thigh", math.degrees(a_thigh))
