"""Generate crisp anti-aliased PNG icons for Moonlight Elixirs (iPad Home Screen & PWA)."""
import math
import os
import struct
import zlib


def write_png(path, width, height, rgba_bytes):
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = bytearray()
    stride = width * 4
    for y in range(height):
        raw.append(0)
        raw.extend(rgba_bytes[y * stride : (y + 1) * stride])

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def clamp(v, lo=0.0, hi=1.0):
    return lo if v < lo else (hi if v > hi else v)


def blend(dst, src):
    sr, sg, sb, sa = src
    dr, dg, db, da = dst
    out_a = sa + da * (1.0 - sa)
    if out_a <= 1e-6:
        return (0.0, 0.0, 0.0, 0.0)
    out_r = (sr * sa + dr * da * (1.0 - sa)) / out_a
    out_g = (sg * sa + dg * da * (1.0 - sa)) / out_a
    out_b = (sb * sa + db * da * (1.0 - sa)) / out_a
    return (out_r, out_g, out_b, out_a)


def smoothstep(edge0, edge1, x):
    t = clamp((x - edge0) / (edge1 - edge0))
    return t * t * (3.0 - 2.0 * t)


def flask_half_width(y):
    """Normalized [0..1] y -> half width of cozy apothecary flask interior."""
    if y < 0.275 or y > 0.875:
        return -1.0
    if y < 0.375:
        return 0.082
    # Smooth curved belly between y=0.375 and y=0.875
    t = (y - 0.375) / 0.50
    # Smooth shoulder into rounded bulb
    cy = 0.655
    dy = (y - cy) / 0.22
    if abs(dy) <= 1.0:
        bulb = 0.245 * math.sqrt(max(0.0, 1.0 - dy * dy))
    else:
        bulb = 0.0
    neck_t = smoothstep(0.375, 0.48, y)
    return max(0.082 * (1.0 - neck_t * 0.3), bulb)


def sample_pixel(nx, ny):
    # Background radial gradient
    dx = nx - 0.5
    dy = ny - 0.38
    dist = math.sqrt(dx * dx + dy * dy)
    t = clamp(dist / 0.78)
    r = (44 * (1 - t) + 15 * t) / 255.0
    g = (36 * (1 - t) + 12 * t) / 255.0
    b = (68 * (1 - t) + 27 * t) / 255.0
    col = (r, g, b, 1.0)

    # Warm golden ambient glow behind flask
    gdx = nx - 0.5
    gdy = ny - 0.56
    gdist = math.sqrt(gdx * gdx + gdy * gdy)
    ga = clamp(1.0 - gdist / 0.44) ** 2 * 0.34
    col = blend(col, (0.97, 0.78, 0.45, ga))

    # Crescent moon top-right
    mx1, my1 = nx - 0.71, ny - 0.27
    mx2, my2 = nx - 0.755, ny - 0.245
    d1 = math.sqrt(mx1 * mx1 + my1 * my1)
    d2 = math.sqrt(mx2 * mx2 + my2 * my2)
    moon_in = smoothstep(0.118, 0.110, d1)
    moon_cut = smoothstep(0.095, 0.103, d2)
    moon_a = moon_in * moon_cut * 0.94
    if moon_a > 0.001:
        col = blend(col, (0.97, 0.84, 0.54, moon_a))

    # Sparkle star top-left
    sx, sy = abs(nx - 0.245), abs(ny - 0.30)
    star_d = math.pow(sx, 0.65) + math.pow(sy, 0.65)
    star_a = smoothstep(0.125, 0.10, star_d) * 0.9
    if star_a > 0.001:
        col = blend(col, (0.99, 0.89, 0.64, star_a))

    # Small stars
    for px, py, rad in [(0.32, 0.21, 0.011), (0.78, 0.49, 0.010), (0.21, 0.47, 0.008), (0.61, 0.20, 0.008)]:
        sd = math.sqrt((nx - px) ** 2 + (ny - py) ** 2)
        sa = smoothstep(rad + 0.006, rad - 0.002, sd) * 0.85
        if sa > 0.001:
            col = blend(col, (0.99, 0.89, 0.66, sa))

    # Cork
    if 0.15 <= ny <= 0.265 and abs(nx - 0.5) <= 0.068:
        cx_t = (nx - 0.432) / 0.136
        shade = 0.85 + 0.25 * math.sin(cx_t * math.pi)
        col = blend(col, (clamp(0.76 * shade), clamp(0.56 * shade), clamp(0.38 * shade), 1.0))

    # Flask SDF approximation
    hw = flask_half_width(ny)
    if hw > 0:
        adx = abs(nx - 0.5)
        inside = smoothstep(hw + 0.008, hw - 0.008, adx)
        # Bottom cap rounding
        if ny > 0.855:
            inside *= smoothstep(0.878, 0.862, ny)

        if inside > 0.001:
            # Potion liquid layers
            if ny >= 0.475:
                if ny >= 0.715:
                    liq = (0.43, 0.29, 0.98, 0.96 * inside)  # Royal Amethyst
                elif ny >= 0.595:
                    liq = (0.27, 0.71, 0.79, 0.96 * inside)  # Seafoam Teal
                else:
                    liq = (0.94, 0.58, 0.42, 0.96 * inside)  # Sunset Peach
                col = blend(col, liq)

                # Top meniscus highlight
                men_d = abs(ny - 0.478)
                if men_d < 0.015:
                    ma = smoothstep(0.015, 0.0, men_d) * 0.48 * inside
                    col = blend(col, (1.0, 0.90, 0.78, ma))

                # Subtle inner bubbles
                for bx, by, br in [(0.42, 0.67, 0.018), (0.57, 0.77, 0.022), (0.52, 0.55, 0.013)]:
                    bd = math.sqrt((nx - bx) ** 2 + (ny - by) ** 2)
                    ba = smoothstep(br + 0.004, br - 0.004, bd) * 0.25 * inside
                    if ba > 0.001:
                        col = blend(col, (1.0, 1.0, 1.0, ba))

            # Subtle glass fill sheen
            col = blend(col, (0.94, 0.90, 1.0, 0.12 * inside))

        # Glass outline stroke
        edge_dist = abs(adx - hw)
        stroke = smoothstep(0.017, 0.006, edge_dist)
        if ny > 0.855:
            bot_edge = abs(ny - 0.870)
            if adx <= hw + 0.015:
                stroke = max(stroke, smoothstep(0.015, 0.005, bot_edge))
        if stroke > 0.001:
            col = blend(col, (0.92, 0.87, 1.0, 0.76 * stroke))

        # Left curved specular glass highlight
        if 0.53 <= ny <= 0.73:
            hl_x = 0.5 - hw + 0.042
            hld = abs(nx - hl_x)
            hla = smoothstep(0.014, 0.003, hld) * 0.46
            if hla > 0.001:
                col = blend(col, (1.0, 1.0, 1.0, hla))

    # Flask lip / rim
    rim_dy = abs(ny - 0.268)
    if rim_dy < 0.022 and abs(nx - 0.5) < 0.115:
        ra = smoothstep(0.022, 0.010, rim_dy) * smoothstep(0.115, 0.102, abs(nx - 0.5))
        col = blend(col, (0.90, 0.85, 1.0, 0.72 * ra))

    return col


def render_icon(size, out_path):
    buf = bytearray(size * size * 4)
    # 2x2 supersampling for silky anti-aliasing
    offsets = (0.25, 0.75)
    idx = 0
    for y in range(size):
        for x in range(size):
            ar = ag = ab = aa = 0.0
            for oy in offsets:
                for ox in offsets:
                    r, g, b, a = sample_pixel((x + ox) / size, (y + oy) / size)
                    ar += r
                    ag += g
                    ab += b
                    aa += a
            buf[idx] = int(clamp(ar / 4.0) * 255 + 0.5)
            buf[idx + 1] = int(clamp(ag / 4.0) * 255 + 0.5)
            buf[idx + 2] = int(clamp(ab / 4.0) * 255 + 0.5)
            buf[idx + 3] = int(clamp(aa / 4.0) * 255 + 0.5)
            idx += 4
    write_png(out_path, size, size, buf)
    print(f"Generated {out_path} ({size}x{size})")


if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "assets", "icons")
    os.makedirs(out_dir, exist_ok=True)
    render_icon(180, os.path.join(out_dir, "apple-touch-icon.png"))
    render_icon(192, os.path.join(out_dir, "icon-192.png"))
    render_icon(512, os.path.join(out_dir, "icon-512.png"))
