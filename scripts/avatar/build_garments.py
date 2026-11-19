"""
MakeHuman(CC0) 기본 옷을 Show Me 아바타에 입힐 수 있는 '옷 본(템플릿)' 파일로 만드는 스크립트입니다.

사용법:
  1) MakeHuman 시스템 에셋(CC0) 내려받기
     https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip
     → 압축을 풀면 clothes/ 폴더가 있어요
  2) python3 scripts/avatar/build_garments.py <makehuman/makehuman/data 경로> <clothes 폴더> public/models

원리 (MakeHuman 옷 맞추기 방식)
- MakeHuman 옷(.mhclo)은 옷의 점 하나하나가 '몸의 점 3개 + 거기서 떨어진 거리'로 묶여 있어요.
  그래서 몸이 커지거나 작아지면 옷도 그 몸을 따라 같이 변해요.
- 여기서는 '떨어진 거리'를 그 몸 삼각형 기준(앞뒤·좌우·바깥 방향)으로 바꿔 저장해요.
  팔·다리 자세를 바꾸거나 체형이 바뀌어도 옷이 몸에 맞게 따라가요.
- 앱(lib/garment.ts)에서는 이 옷 본을 아바타에 입힌 뒤, 옷 실측(둘레·기장·소매)에 맞춰 넓히고 줄여요.

만들어지는 파일: public/models/garments.bin
"""
import json
import os
import re
import struct
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from mh import MH  # noqa: E402
from build_avatar import RULERS, vertex_order  # noqa: E402

# 다리 사이 도우미에 묶인 옷(스커트)은 다리를 모으면 접혀요 → 몸통 둘레 좌표(높이·각도·거리)로 저장해서 앱에서 감싸요
CYLINDRICAL = {"skirt"}

# (옷 본 이름, MakeHuman 옷, 상의/하의 부분, 설명)
TEMPLATES = [
    ("tee_short_f", "female_casualsuit01", "top", "반소매 티 (여성 핏)"),
    ("blouse", "female_elegantsuit01", "top", "블라우스·셔츠 (여성 핏)"),
    ("tee_long_m", "male_casualsuit02", "top", "긴소매 티 (남성 핏)"),
    ("tee_short_m", "male_casualsuit06", "top", "반소매 티 (남성 핏)"),
    ("shirt", "male_casualsuit03", "top", "셔츠 (남성 핏)"),
    ("jacket", "male_casualsuit05", "top", "재킷·아우터"),
    ("pants_f", "female_casualsuit01", "bottom", "긴바지 (여성 핏)"),
    ("pants_m", "male_casualsuit06", "bottom", "긴바지 (남성 핏)"),
    ("skirt", "female_elegantsuit01", "bottom", "스커트"),
    ("shorts", "female_casualsuit02", "bottom", "반바지"),
]


def load_obj(path):
    v, faces = [], []
    with open(path) as f:
        for line in f:
            if line.startswith("v "):
                v.append([float(x) for x in line.split()[1:4]])
            elif line.startswith("f "):
                faces.append([int(t.split("/")[0]) - 1 for t in line.split()[1:]])
    return np.array(v), faces


def load_mhclo(path):
    refs, scales, mode = [], {}, None
    with open(path) as f:
        for line in f:
            t = line.split()
            if not t or t[0].startswith("#"):
                continue
            if t[0] in ("x_scale", "y_scale", "z_scale"):
                scales[t[0][0]] = (int(t[1]), int(t[2]), float(t[3]))
                continue
            if t[0] in ("verts", "delete_verts"):
                mode = t[0]
                continue
            if mode == "verts" and re.match(r"^\d", t[0]):
                if len(t) >= 9:
                    refs.append(([int(x) for x in t[:3]], [float(x) for x in t[3:6]], [float(x) for x in t[6:9]]))
                else:
                    refs.append(([int(t[0])] * 3, [1.0, 0.0, 0.0], [0.0, 0.0, 0.0]))
            elif mode not in ("verts", "delete_verts"):
                mode = None
    return refs, scales


def components(n, faces):
    parent = list(range(n))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    for f in faces:
        for k in f[1:]:
            ra, rb = find(f[0]), find(k)
            if ra != rb:
                parent[ra] = rb
    return np.array([find(i) for i in range(n)])


def frame(a, b, c):
    """삼각형 기준 축 (e1: a→b, e2: 면 안 수직, n: 면 바깥) 과 크기"""
    e1 = b - a
    L = (np.linalg.norm(b - a) + np.linalg.norm(c - b) + np.linalg.norm(a - c)) / 3
    e1 = e1 / (np.linalg.norm(e1) + 1e-12)
    nrm = np.cross(b - a, c - a)
    nrm = nrm / (np.linalg.norm(nrm) + 1e-12)
    e2 = np.cross(nrm, e1)
    return e1, e2, nrm, L


def build(data_root, clothes_root, out_dir):
    m = MH(data_root)
    base = m.v / 10.0  # MakeHuman 단위(데시미터)로 계산 후 cm로
    used, _ = vertex_order(m)
    remap = {old: new for new, old in enumerate(used)}
    # 기준 높이 (상의/하의 부분 나누기): 허리 줄자 높이
    waist_y = base[[4121, 10760, 4181, 4131], 1].mean()

    header = {"version": 1, "units": "cm", "license": "MakeHuman system assets CC0 1.0", "templates": [], "arrays": {}}
    blobs = []
    offset = 0

    def add(name, arr, dtype):
        nonlocal offset
        b = np.ascontiguousarray(arr, dtype=dtype).tobytes()
        pad = (-offset) % 4
        blobs.append(b"\0" * pad)
        offset += pad
        header["arrays"][name] = {"type": np.dtype(dtype).name, "count": int(np.asarray(arr).size), "offset": offset}
        blobs.append(b)
        offset += len(b)

    # 기본 몸의 기준 높이·엉덩이 둘레 (원통 좌표 옷용, cm)
    bcm = base * 10
    hips_i = RULERS["hips"]
    hips_y = float(bcm[hips_i, 1].mean())
    hips_c = float(sum(np.linalg.norm(bcm[hips_i[k]] - bcm[hips_i[k - 1]]) for k in range(1, len(hips_i))))
    hips_z = float(bcm[hips_i, 2].mean())
    waist_i = RULERS["waist"]
    waist_ycm = float(bcm[waist_i, 1].mean())
    body = sorted({i for f in m.faces["body"] for i in f})
    top, bottom = bcm[body, 1].max(), bcm[body, 1].min()
    mid = [i for i in body if abs(bcm[i, 0]) < 1.0 and bcm[i, 1] > bottom + 0.35 * (top - bottom)]
    crotch_y = float(bcm[min(mid, key=lambda i: bcm[i, 1]), 1])
    rest_levels = {"crotchY": crotch_y, "hipsY": hips_y, "waistY": waist_ycm, "hipsC": hips_c, "hipsZ": hips_z}

    for key, asset, part, label in TEMPLATES:
        folder = os.path.join(clothes_root, asset)
        refs, scales = load_mhclo(os.path.join(folder, f"{asset}.mhclo"))
        obj_v, faces = load_obj(os.path.join(folder, f"{asset}.obj"))
        n = len(refs)
        assert n == len(obj_v), (asset, n, len(obj_v))

        # 옷 점의 원래 위치 (MakeHuman 기본 몸 기준)
        s = np.array([abs(base[scales[a][0], i] - base[scales[a][1], i]) / scales[a][2] for i, a in enumerate("xyz")])
        idx = np.array([r[0] for r in refs])
        w = np.array([r[1] for r in refs])
        off = np.array([r[2] for r in refs]) * s
        anchor = (base[idx] * w[:, :, None]).sum(axis=1)
        rest = anchor + off

        # 상의/하의 부분 고르기 (서로 떨어진 조각별로, 조각 중심이 허리보다 위면 상의)
        comp = components(n, faces)
        keep = np.zeros(n, bool)
        for c in np.unique(comp):
            sel = comp == c
            is_top = rest[sel, 1].mean() > waist_y
            keep[sel] = is_top if part == "top" else not is_top
        if not keep.any():
            raise SystemExit(f"{asset}: {part} 부분이 없어요")
        vmap = -np.ones(n, int)
        vmap[keep] = np.arange(keep.sum())
        tri = []
        for f in faces:
            if not all(keep[i] for i in f):
                continue
            a = [vmap[i] for i in f]
            tri += [a[0], a[1], a[2]] + ([a[0], a[2], a[3]] if len(a) == 4 else [])

        # 떨어진 거리를 몸 삼각형 기준으로 (크기로 나눠서)
        local = np.zeros((n, 3))
        for i in np.nonzero(keep)[0]:
            a, b, c = base[idx[i]]
            if len(set(idx[i])) < 3:
                # 점 하나에 붙은 옷 점: 세상 기준 거리 그대로 (드물어요)
                local[i] = off[i] * 10
                continue
            e1, e2, nrm, L = frame(a, b, c)
            d = rest[i] - anchor[i]
            local[i] = [d @ e1 / L, d @ e2 / L, d @ nrm / L]
        single = np.array([len(set(r)) < 3 for r in idx])

        ridx = np.array([[remap[j] for j in r] for r in idx[keep]], dtype=np.uint32)
        add(f"{key}_refs", ridx.reshape(-1), np.uint32)
        add(f"{key}_w", w[keep].reshape(-1), np.float32)
        add(f"{key}_off", local[keep].reshape(-1), np.float32)
        add(f"{key}_single", single[keep].astype(np.uint8), np.uint8)
        add(f"{key}_index", np.array(tri), np.uint32)
        meta = {"key": key, "kind": part, "label": label, "source": asset, "vertexCount": int(keep.sum())}
        if key in CYLINDRICAL:
            pc = rest[keep] * 10
            th = np.arctan2(pc[:, 2] - hips_z, pc[:, 0])
            r = np.hypot(pc[:, 0], pc[:, 2] - hips_z)
            add(f"{key}_cyl", np.stack([pc[:, 1], th, r], axis=1).reshape(-1), np.float32)
            meta["cyl"] = rest_levels
        header["templates"].append(meta)
        print(f"{key:12s} {asset:22s} {part:6s} verts {keep.sum():5d} tris {len(tri)//3:5d}  (obj 위치와 차이 {np.abs(rest*10 - obj_v*10)[keep].max():.2f}cm)")

    hj = json.dumps(header, ensure_ascii=False).encode("utf-8")
    hj += b" " * ((-(4 + len(hj))) % 4)
    path = os.path.join(out_dir, "garments.bin")
    with open(path, "wb") as f:
        f.write(struct.pack("<I", len(hj)))
        f.write(hj)
        for b in blobs:
            f.write(b)
    print(f"{path} {os.path.getsize(path)/1024:.0f}KB")


if __name__ == "__main__":
    build(sys.argv[1], sys.argv[2], sys.argv[3])
