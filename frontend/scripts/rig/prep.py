# Prepare textures, depth grid and joint positions for a reference model.
import cv2, numpy as np, sys, json, os
ref, out = sys.argv[1], sys.argv[2]   # ref = .../model-1  (expects -front.png/-back.png)
os.makedirs(out, exist_ok=True)
HEIGHT = 1.65; STEP = 6

def mask_of(im):
    h, w = im.shape[:2]; sc = 900 / h
    sm = cv2.resize(im, (int(w*sc), 900)); sh, sw = sm.shape[:2]
    m = np.zeros((sh, sw), np.uint8)
    bg = np.zeros((1,65)); fg = np.zeros((1,65))
    cv2.grabCut(sm, m, (int(sw*.02), 2, int(sw*.96), sh-3), bg, fg, 6, cv2.GC_INIT_WITH_RECT)
    m = np.where((m==1)|(m==3), 255, 0).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if n > 1: m = np.where(lab == 1+np.argmax(st[1:, cv2.CC_STAT_AREA]), 255, 0).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((7,7), np.uint8))
    # fill interior holes
    ff = m.copy(); cv2.floodFill(ff, None, (0,0), 255); m = m | cv2.bitwise_not(ff)
    return cv2.resize(m, (w, h), interpolation=cv2.INTER_LINEAR)

F = cv2.imread(ref+"-front.png"); B = cv2.flip(cv2.imread(ref+"-back.png"), 1)
Mf, Mb = mask_of(F), mask_of(B)
def bbox(m):
    ys, xs = np.where(m > 127); return xs.min(), ys.min(), xs.max(), ys.max()
fx0, fy0, fx1, fy1 = bbox(Mf); bx0, by0, bx1, by1 = bbox(Mb)
# align back to front by bbox (scale y by height, centre x)
sy = (fy1-fy0)/(by1-by0); sx = sy
fcx = (fx0+fx1)/2; bcx = (bx0+bx1)/2
A = np.float32([[sx, 0, fcx - bcx*sx], [0, sy, fy0 - by0*sy]])
h, w = F.shape[:2]
B = cv2.warpAffine(B, A, (w, h), borderMode=cv2.BORDER_REPLICATE)
Mb = cv2.warpAffine(Mb, A, (w, h))
# fill back colours outside its own mask (so misalignment never shows grey)
hole = (Mb < 128).astype(np.uint8)*255
Bs = cv2.resize(B, (w//4, h//4)); hs = cv2.resize(hole, (w//4, h//4))
Bf = cv2.resize(cv2.inpaint(Bs, hs, 6, cv2.INPAINT_TELEA), (w, h))
B = np.where(hole[..., None] > 0, Bf, B)
# crop
M = 12
x0, y0, x1, y1 = max(0, fx0-M), max(0, fy0-M), min(w, fx1+M), min(h, fy1+M)
crop = lambda a: a[y0:y1, x0:x1]
F, B, Mf = crop(F), crop(B), crop(Mf)
alpha = cv2.GaussianBlur(Mf, (3,3), 0)
cv2.imwrite(out+"/front.png", np.dstack([F, alpha]))
cv2.imwrite(out+"/back.png", np.dstack([B, alpha]))
H, W = Mf.shape
s = HEIGHT / (fy1 - fy0)  # metres per px
# depth: rounded cross-section from the distance transform
bin_ = (Mf > 127).astype(np.uint8)
t = cv2.distanceTransform(bin_, cv2.DIST_L2, 5)
Rl = cv2.dilate(t, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)))
d = np.sqrt(np.clip(t*(2*Rl - t), 0, None)) * s * 0.72
d = np.minimum(d, 0.15)
d = cv2.GaussianBlur(d, (0,0), 3)
gy = np.arange(0, H, STEP); gx = np.arange(0, W, STEP)
inside = cv2.dilate(bin_, np.ones((STEP+3, STEP+3), np.uint8))[np.ix_(gy, gx)]
depth = d[np.ix_(gy, gx)] * bin_[np.ix_(gy, gx)]
# joints (px in crop) from proportions + measured hands
top, bot = fy0-y0, fy1-y0; Hp = bot - top
rows = lambda f: int(top + f*Hp)
band = bin_[rows(.30):rows(.42)]
cols = np.where(band.sum(0) > 0)[0]
cx = float(np.median(np.where(bin_[rows(.36)] > 0)[0])) if False else (fx0+fx1)/2 - x0
hb = bin_[rows(.40):rows(.62)]
ys, xs = np.where(hb > 0)
li, ri = np.argmin(xs), np.argmax(xs)
handL = (float(xs[li]) + 0.02*Hp, float(ys[li] + rows(.40)))   # image-left hand (her right)
handR = (float(xs[ri]) - 0.02*Hp, float(ys[ri] + rows(.40)))
J = {
  "head_top": (cx, top), "head": (cx, rows(.135)), "neck": (cx, rows(.17)), "chest": (cx, rows(.30)),
  "spine": (cx, rows(.40)), "hips": (cx, rows(.50)),
  "shoulder_r": (cx - .105*Hp, rows(.19)), "shoulder_l": (cx + .105*Hp, rows(.19)),
  "hand_r": handL, "hand_l": handR,
  "hip_r": (cx - .055*Hp, rows(.505)), "hip_l": (cx + .055*Hp, rows(.505)),
  "knee_r": (cx - .055*Hp, rows(.74)), "knee_l": (cx + .055*Hp, rows(.74)),
  "ankle_r": (cx - .05*Hp, rows(.955)), "ankle_l": (cx + .05*Hp, rows(.955)),
}
for k in ("r", "l"):
    sx_, sy_ = J["shoulder_"+k]; hx, hy = J["hand_"+k]
    J["elbow_"+k] = ((sx_+hx)/2 + (hx-sx_)*0.04, (sy_+hy)/2)
# to metres: x right (+), z up, feet at 0
def m(p): return [ (p[0]-cx)*s, (bot - p[1])*s ]
json.dump({"step": STEP, "s": s, "W": W, "H": H, "bot": float(bot), "cx": float(cx),
           "joints": {k: m(v) for k, v in J.items()}}, open(out+"/meta.json", "w"), indent=1)
np.savez(out+"/grid.npz", inside=inside, depth=depth, gx=gx, gy=gy)
dbg = F.copy()
for k, v in J.items(): cv2.circle(dbg, (int(v[0]), int(v[1])), 7, (0,0,255), -1)
dv = (d/ d.max()*255).astype(np.uint8)
cv2.imwrite(out+"/debug.jpg", np.hstack([cv2.resize(dbg, (W//2, H//2)), cv2.resize(cv2.cvtColor(dv, cv2.COLOR_GRAY2BGR), (W//2, H//2)), cv2.resize(B, (W//2, H//2))]))
print("ok", W, H, "px/m", 1/s, "max depth m", float(d.max()), "verts", int(inside.sum()))
