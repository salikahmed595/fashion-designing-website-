# Transparent cut-outs of the generated images (plain light background) for the
# rail and Try the Look. Writes public/generated/cut/<looks|rail>/<name>.webp.
# Needs: pip install opencv-python numpy.  Run from frontend/: python scripts/cutout.py [--force]
import cv2, numpy as np, os, sys, glob

ROOT = os.path.join("public", "generated")
FORCE = "--force" in sys.argv

def cut(src, dst):
    im = cv2.imread(src); h, w = im.shape[:2]
    sc = 900 / h; sm = cv2.resize(im, (int(w * sc), 900), interpolation=cv2.INTER_AREA)
    lab = cv2.cvtColor(sm, cv2.COLOR_BGR2LAB).astype(np.float32)
    border = np.concatenate([lab[:6].reshape(-1, 3), lab[-6:].reshape(-1, 3), lab[:, :6].reshape(-1, 3), lab[:, -6:].reshape(-1, 3)])
    bg = np.median(border, 0)
    # per-row background (handles soft gradients / vignettes)
    rowbg = np.median(np.concatenate([lab[:, :10], lab[:, -10:]], 1), 1)[:, None, :]
    d = np.minimum(np.linalg.norm(lab - bg, axis=2), np.linalg.norm(lab - rowbg, axis=2))
    m = np.full(d.shape, cv2.GC_PR_BGD, np.uint8)
    m[d > 9] = cv2.GC_PR_FGD
    m[d > 30] = cv2.GC_FGD
    m[:4], m[-2:], m[:, :4], m[:, -4:] = cv2.GC_BGD, cv2.GC_BGD, cv2.GC_BGD, cv2.GC_BGD
    b, f = np.zeros((1, 65)), np.zeros((1, 65))
    cv2.grabCut(sm, m, None, b, f, 5, cv2.GC_INIT_WITH_MASK)
    k = np.where((m == 1) | (m == 3), 255, 0).astype(np.uint8)
    k = cv2.morphologyEx(k, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab_, st, _ = cv2.connectedComponentsWithStats(k)
    if n > 1:
        big = st[1:, cv2.CC_STAT_AREA].max()
        keep = [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] > big * 0.002]
        k = np.isin(lab_, keep).astype(np.uint8) * 255
    ff = k.copy(); cv2.floodFill(ff, None, (0, 0), 255); k = k | cv2.bitwise_not(ff)  # fill holes
    a = cv2.GaussianBlur(cv2.resize(k, (w, h), interpolation=cv2.INTER_LINEAR), (5, 5), 0)
    out = np.dstack([im, a])
    ys, xs = np.where(a > 10)
    out = out[max(0, ys.min() - 6):ys.max() + 6, max(0, xs.min() - 6):xs.max() + 6]
    if out.shape[0] > 1400:
        s = 1400 / out.shape[0]; out = cv2.resize(out, (int(out.shape[1] * s), 1400), interpolation=cv2.INTER_AREA)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    cv2.imwrite(dst, out, [cv2.IMWRITE_WEBP_QUALITY, 85])

n = 0
for sub in ("looks", "rail"):
    for src in sorted(glob.glob(os.path.join(ROOT, sub, "*.png"))):
        dst = os.path.join(ROOT, "cut", sub, os.path.basename(src)[:-4] + ".webp")
        if not FORCE and os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            continue
        cut(src, dst); n += 1
print(f"{n} cut-out(s) written")
