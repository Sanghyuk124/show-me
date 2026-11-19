"""
MakeHuman(CC0)의 인체 모델로 Show Me 3D 아바타 파일을 만드는 스크립트입니다.

사용법:
  git clone --depth 1 https://github.com/makehumancommunity/makehuman  (데이터 폴더만 있으면 돼요)
  python3 scripts/avatar/build_avatar.py <makehuman/makehuman/data 경로> public/models

만들어지는 파일: public/models/avatar-female.bin, avatar-male.bin
- 기본 몸(동아시아 20대 여성/남성) + 팔을 내린 자세
- 몸무게·가슴·허리·엉덩이·어깨·팔 길이·다리 길이 변형(morph) 데이터
- MakeHuman의 줄자 위치(가슴·허리·엉덩이 둘레 등) → 앱에서 입력한 cm에 맞춰 변형 강도를 계산
- 속옷을 칠할 기준 높이(가슴·허리·엉덩이 등)와 팔 영역 (속옷은 화면에서 위치로 칠해요: components/Avatar3D.tsx)

MakeHuman 에셋 라이선스: CC0 1.0 (https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.ASSETS.md)
"""
import json
import math
import os
import struct
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from mh import MH  # noqa: E402

# MakeHuman 측정 플러그인(0_modeling_a_measurement.py)의 줄자 정점 (원본 base.obj 기준 번호)
RULERS = {
    "bust": [8439,8455,8462,8446,8478,8494,8557,8510,8526,8542,10720,10601,10603,10602,10612,10611,10610,10613,10604,10605,10606,3942,3941,3940,3950,3947,3948,3949,3938,3939,3937,4065,1870,1854,1838,1885,1822,1806,1774,1790,1783,1767,1799,8471],
    "underbust": [10750,10744,10724,10725,10748,10722,10640,10642,10641,10651,10650,10649,10652,10643,10644,10645,10646,10647,10648,3988,3987,3986,3985,3984,3983,3982,3992,3989,3990,3991,3980,3981,3979,4067,4098,4073,4072,4094,4100,4082,4088,4088],
    "waist": [4121,10760,10757,10777,10776,10779,10780,10778,10781,10771,10773,10772,10775,10774,10814,10834,10816,10817,10818,10819,10820,10821,4181,4180,4179,4178,4177,4176,4175,4196,4173,4131,4132,4129,4130,4128,4138,4135,4137,4136,4133,4134,4108,4113,4118,4121],
    "hips": [4341,10968,10969,10971,10970,10967,10928,10927,10925,10926,10923,10924,10868,10875,10861,10862,4228,4227,4226,4242,4234,4294,4293,4296,4295,4297,4298,4342,4345,4346,4344,4343,4361,4341],
    "upperarm": [8274, 10037],
    "lowerarm": [10040, 10548],
    "thigh": [11071,11080,11081,11086,11076,11077,11074,11075,11072,11073,11069,11070,11087,11085,11084,12994,11083,11082,11079,11071],
    "knee": [11223,11230,11232,11233,11238,11228,11229,11226,11227,11224,11225,11221,11222,11239,11237,11236,13002,11235,11234,11223],
    "calf": [11339,11336,11353,11351,11350,13008,11349,11348,11345,11337,11344,11346,11347,11352,11342,11343,11340,11341,11338,11339],
    "ankle": [11460,11464,11458,11459,11419,11418,12958,12965,12960,12963,12961,12962,12964,12927,13028,12957,11463,11461,11457,11460],
    "upperleg": [10970, 11230],
    "lowerleg": [11225, 12820],
}
SHOULDER_TIP = 8274  # 어깨 끝(왼쪽). 오른쪽은 x를 뒤집은 가장 가까운 정점
CROTCH_PROBE = 4341  # 엉덩이 줄자 시작점 근처

MORPHS = {
    "weightMin": "macrodetails/universal-{g}-young-averagemuscle-minweight.target",
    "weightMax": "macrodetails/universal-{g}-young-averagemuscle-maxweight.target",
    "bustInc": "measure/measure-bust-circ-incr.target",
    "bustDec": "measure/measure-bust-circ-decr.target",
    "waistInc": "measure/measure-waist-circ-incr.target",
    "waistDec": "measure/measure-waist-circ-decr.target",
    "hipsInc": "measure/measure-hips-circ-incr.target",
    "hipsDec": "measure/measure-hips-circ-decr.target",
    "shoulderInc": "measure/measure-shoulder-dist-incr.target",
    "shoulderDec": "measure/measure-shoulder-dist-decr.target",
    "upperarmInc": "measure/measure-upperarm-length-incr.target",
    "upperarmDec": "measure/measure-upperarm-length-decr.target",
    "lowerarmInc": "measure/measure-lowerarm-length-incr.target",
    "lowerarmDec": "measure/measure-lowerarm-length-decr.target",
    "upperlegInc": "measure/measure-upperleg-height-incr.target",
    "upperlegDec": "measure/measure-upperleg-height-decr.target",
    "lowerlegInc": "measure/measure-lowerleg-height-incr.target",
    "lowerlegDec": "measure/measure-lowerleg-height-decr.target",
}

ARM_ANGLE = {"female": 7.0, "male": 8.0}  # 팔을 내린 각도 (수직에서 바깥쪽으로, 도)
LEG_SPREAD = {"female": 0.45, "male": 0.6}  # 발목 위치 = 고관절 x × 이 값 (작을수록 다리를 모아요)


def rotation(axis, angle):
    axis = axis / (np.linalg.norm(axis) + 1e-12)
    x, y, z = axis
    c, s = math.cos(angle), math.sin(angle)
    C = 1 - c
    return np.array([
        [c + x * x * C, x * y * C - z * s, x * z * C + y * s],
        [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
        [z * x * C - y * s, z * y * C + x * s, c + z * z * C],
    ])


def arm_pose(m, v, gender):
    """팔(어깨 아래)을 아래로 내린 자세로 바꾸는 정점별 회전을 구해요. 반환: (정점별 회전행렬 목록, 회전 중심)"""
    skel, weights = m.skeleton()
    bones = skel["bones"]
    joints = skel["joints"]

    def joint(name):
        return v[joints[name]].mean(axis=0)

    def descendants(root):
        out = {root}
        changed = True
        while changed:
            changed = False
            for b, info in bones.items():
                if info["parent"] in out and b not in out:
                    out.add(b)
                    changed = True
        return out

    n = len(v)
    mats = np.tile(np.eye(3), (n, 1, 1))
    pivots = np.zeros((n, 3))
    owner = np.zeros(n)  # 정점마다 가장 많이 속한 팔·다리의 비율 (양쪽에 걸친 점은 큰 쪽을 따라가요)
    for side in ("L", "R"):
        chain = descendants(f"upperarm01.{side}")
        f = np.zeros(n)
        for b in chain:
            for i, w in weights.get(b, []):
                f[int(i)] += w
        for i, w in weights.get(f"shoulder01.{side}", []):
            f[int(i)] += 0.45 * w
        f = np.clip(f, 0, 1)
        pivot = joint(f"upperarm01.{side}____head")
        wrist = joint(f"wrist.{side}____head")
        cur = (wrist - pivot) / np.linalg.norm(wrist - pivot)
        sx = 1.0 if cur[0] > 0 else -1.0
        a = math.radians(ARM_ANGLE[gender])
        tgt = np.array([sx * math.sin(a), -math.cos(a), 0.05])
        tgt /= np.linalg.norm(tgt)
        axis = np.cross(cur, tgt)
        full = math.acos(np.clip(np.dot(cur, tgt), -1, 1))
        idx = np.nonzero(f > 1e-4)[0]
        for i in idx:
            if f[i] <= owner[i]:
                continue
            owner[i] = f[i]
            mats[i] = rotation(axis, full * f[i])
            pivots[i] = pivot

        # 다리: MakeHuman 기본 자세는 다리를 벌리고 있어서, 발이 골반 폭 안쪽으로 오도록 모아요
        chain = descendants(f"upperleg01.{side}")
        g = np.zeros(n)
        for b in chain:
            for i, w in weights.get(b, []):
                g[int(i)] += w
        g = np.clip(g, 0, 1)
        hip = joint(f"upperleg01.{side}____head")
        foot = joint(f"foot.{side}____head")
        cur = (foot - hip) / np.linalg.norm(foot - hip)
        want = np.array([hip[0] * LEG_SPREAD[gender], foot[1], foot[2]]) - hip
        want /= np.linalg.norm(want)
        axis = np.cross(cur, want)
        full = math.acos(np.clip(np.dot(cur, want), -1, 1))
        for i in np.nonzero(g > 1e-4)[0]:
            if g[i] <= owner[i]:
                continue
            owner[i] = g[i]
            mats[i] = rotation(axis, full * g[i])
            pivots[i] = hip
    return mats, pivots


def apply_pose(v, mats, pivots):
    return np.einsum("nij,nj->ni", mats, v - pivots) + pivots


def rotate_delta(d, mats):
    return np.einsum("nij,nj->ni", mats, d)


def ruler_length(v, idx):
    return float(sum(np.linalg.norm(v[idx[k]] - v[idx[k - 1]]) for k in range(1, len(idx))))


def vertex_order(m):
    """내보낼 정점 순서: [몸+눈 정점 (그림)] + [타이츠 도우미 정점 (옷 묶기용)]. 반환: (원본 번호 목록, 그리는 정점 수)"""
    draw = sorted({i for g in ("body", "helper-l-eye", "helper-r-eye") for f in m.faces.get(g, []) for i in f})
    helper = sorted({i for f in m.faces.get("helper-tights", []) for i in f} - set(draw))
    return draw + helper, len(draw)


def build(data_root, out_dir, gender):
    m = MH(data_root)
    body_faces = m.faces["body"]
    eye_faces = m.faces.get("helper-l-eye", []) + m.faces.get("helper-r-eye", [])
    used, n_draw = vertex_order(m)
    remap = {old: new for new, old in enumerate(used)}

    base = m.v + m.target(f"macrodetails/asian-{gender}-young.target")
    mats, pivots = arm_pose(m, base, gender)
    posed = apply_pose(base, mats, pivots)

    # 팔에 속하는 정도 (속옷 칠할 때 제외용)
    _, weights = m.skeleton()
    arm_f = np.zeros(len(base))
    for b, wl in weights.items():
        if any(k in b for k in ("upperarm", "lowerarm", "wrist", "finger", "metacarpal")):
            for i, w in wl:
                arm_f[int(i)] += w

    # 다리에 속하는 정도 (옷 입히기: 바지 다리 부분)
    leg_f = np.zeros(len(base))
    for b, wl in weights.items():
        if any(k in b for k in ("upperleg", "lowerleg", "foot", "toe")):
            for i, w in wl:
                leg_f[int(i)] += w

    # 바닥을 y=0으로
    body_idx = sorted({i for f in body_faces for i in f})
    floor = posed[body_idx, 1].min()
    posed[:, 1] -= floor

    deltas = {}
    for name, rel in MORPHS.items():
        d = m.target(rel.format(g=gender))
        deltas[name] = rotate_delta(d, mats)

    # 기준 높이 (화면에서 속옷을 칠할 때 써요)
    def ring_y(name):
        return float(posed[RULERS[name], 1].mean())

    hips_pts = posed[RULERS["hips"]]
    # 가랑이 점: 몸 가운데(|x|<1cm)에서 가장 낮은 정점 (두 다리가 갈라지는 곳) → 인심(가랑이~바닥) 측정에 써요
    # (다리를 모으기 전 원래 자세에서 찾아야 허벅지 안쪽이 아니라 진짜 가랑이가 잡혀요)
    top = float(base[body_idx, 1].max())
    bottom = float(base[body_idx, 1].min())
    mid = [i for i in body_idx if abs(base[i, 0]) < 1.0 and base[i, 1] > bottom + 0.35 * (top - bottom)]  # 발끝 제외
    crotch_i = int(min(mid, key=lambda i: base[i, 1]))
    lm = {
        "hipsY": ring_y("hips"),
        "waistY": ring_y("waist"),
        "bustY": ring_y("bust"),
        "underbustY": ring_y("underbust"),
        "crotchY": float(posed[crotch_i, 1]),
        "hipsHalf": float(np.abs(hips_pts[:, 0]).max()),
        "hipsZ": float(hips_pts[:, 2].mean()),
        "shoulderY": float(posed[SHOULDER_TIP, 1]),
        "torsoZ": float(posed[RULERS["bust"], 2].mean()),
    }
    bust_pts = posed[RULERS["bust"]]
    front = bust_pts[bust_pts[:, 2] > lm["torsoZ"]]
    lm["breastX"] = float(np.abs(front[np.argmax(front[:, 2]), 0])) if gender == "female" else 9.0

    # 오른쪽 어깨 끝: 왼쪽 어깨 끝의 거울 위치에 가장 가까운 정점
    lt = posed[SHOULDER_TIP]
    mirror = np.array([-lt[0], lt[1], lt[2]])
    rt = int(min(body_idx, key=lambda i: np.linalg.norm(posed[i] - mirror)))

    # ── 내보내기 (사용하는 정점만) ──
    pos = posed[used].astype(np.float32)
    tri = []
    for f in body_faces:
        a = [remap[i] for i in f]
        tri += [a[0], a[1], a[2]] + ([a[0], a[2], a[3]] if len(a) == 4 else [])
    eye_tri = []
    for f in eye_faces:
        a = [remap[i] for i in f]
        eye_tri += [a[0], a[1], a[2]] + ([a[0], a[2], a[3]] if len(a) == 4 else [])

    arrays = []  # (name, bytes, dtype, count)
    header = {
        "version": 1,
        "gender": gender,
        "units": "cm",
        "license": "MakeHuman assets CC0 1.0",
        "vertexCount": n_draw,  # 화면에 그리는 몸·눈 정점 수
        "helperCount": len(used) - n_draw,  # 그 뒤에 붙은 '타이츠 도우미' 정점 (옷을 몸에 묶는 기준, 그리지 않아요)
        "rulers": {k: [remap[i] for i in v] for k, v in RULERS.items()},
        "shoulderTips": [remap[SHOULDER_TIP], remap[rt]],
        "crotch": remap[crotch_i],
        "landmarks": lm,
        "arrays": {},
        "morphs": [],
    }

    def add(name, arr, dtype):
        b = np.ascontiguousarray(arr, dtype=dtype).tobytes()
        arrays.append((name, b))
        header["arrays"][name] = {"type": np.dtype(dtype).name, "count": int(np.asarray(arr).size)}

    add("position", pos.reshape(-1), np.float32)
    add("index", np.array(tri), np.uint32)
    add("eyeIndex", np.array(eye_tri), np.uint32)
    # 팔에 속하는 정도 (속옷은 화면에서 위치로 칠하고, 팔에는 칠하지 않아요)
    add("armF", np.round(np.clip(arm_f[used], 0, 1) * 255), np.uint8)
    add("legF", np.round(np.clip(leg_f[used], 0, 1) * 255), np.uint8)

    SCALE = 100.0  # 이동량을 0.01cm 단위 정수로 저장
    for name, d in deltas.items():
        du = d[used]
        nz = np.nonzero(np.abs(du).max(axis=1) > 1e-4)[0]
        add(f"m_{name}_idx", nz, np.uint32)
        add(f"m_{name}_d", np.clip(np.round(du[nz] * SCALE), -32767, 32767).reshape(-1), np.int16)
        header["morphs"].append({"name": name, "count": int(len(nz)), "scale": 1 / SCALE})

    # 파일: [헤더 길이 u32][헤더 JSON][4바이트 정렬][배열들]
    offset = 0
    blobs = []
    for name, b in arrays:
        pad = (-offset) % 4
        blobs.append(b"\0" * pad)
        offset += pad
        header["arrays"][name]["offset"] = offset
        blobs.append(b)
        offset += len(b)
    hj = json.dumps(header, ensure_ascii=False).encode("utf-8")
    hj += b" " * ((-(4 + len(hj))) % 4)
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, f"avatar-{gender}.bin")
    with open(path, "wb") as f:
        f.write(struct.pack("<I", len(hj)))
        f.write(hj)
        for b in blobs:
            f.write(b)
    size = os.path.getsize(path)
    height = pos[:, 1].max()
    print(f"{gender}: {path} {size/1024:.0f}KB, verts {len(used)}, tris {len(tri)//3}, height {height:.1f}cm")
    for k in ("bust", "underbust", "waist", "hips"):
        print(f"  {k}: {ruler_length(posed, RULERS[k]):.1f}cm")


if __name__ == "__main__":
    root, out = sys.argv[1], sys.argv[2]
    for g in ("female", "male"):
        build(root, out, g)
