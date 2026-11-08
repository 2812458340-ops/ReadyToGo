"""Generate the HarmonyOS app icon (amber globe on navy) with Pillow."""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = 1024
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

amber = (226, 178, 94, 255)
navy = (13, 23, 34, 255)
d.rounded_rectangle([0, 0, S, S], radius=int(S * 0.22), fill=navy)

cx = cy = S // 2
r = int(S * 0.30)
w = max(2, int(S * 0.022))
d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=amber, width=w)
d.ellipse([cx - r // 2, cy - r, cx + r // 2, cy + r], outline=amber, width=w)
for dy in (-r // 2, 0, r // 2):
    half = int((r * r - dy * dy) ** 0.5)
    d.line([cx - half, cy + dy, cx + half, cy + dy], fill=amber, width=w)

os.makedirs(os.path.join(ROOT, "harmony/AppScope/resources/base/media"), exist_ok=True)
os.makedirs(os.path.join(ROOT, "harmony/entry/src/main/resources/base/media"), exist_ok=True)
img.resize((512, 512), Image.LANCZOS).save(
    os.path.join(ROOT, "harmony/AppScope/resources/base/media/app_icon.png"))
img.resize((216, 216), Image.LANCZOS).save(
    os.path.join(ROOT, "harmony/entry/src/main/resources/base/media/startIcon.png"))
print("icons written")
