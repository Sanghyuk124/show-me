"""MakeHuman(CC0) 데이터를 읽는 도우미. build_avatar.py 에서 사용합니다."""
import json
import os
import numpy as np


class MH:
    def __init__(self, root):
        self.root = root  # .../makehuman/data
        self.v, self.faces = self._load_obj(os.path.join(root, "3dobjs", "base.obj"))
        self.v = self.v * 10.0  # MakeHuman 단위(데시미터) → cm

    @staticmethod
    def _load_obj(path):
        verts, faces, group = [], {}, None
        with open(path) as f:
            for line in f:
                if line.startswith("v "):
                    verts.append([float(x) for x in line.split()[1:4]])
                elif line.startswith("g "):
                    group = line.split(None, 1)[1].strip()
                elif line.startswith("f "):
                    idx = [int(t.split("/")[0]) - 1 for t in line.split()[1:]]
                    faces.setdefault(group, []).append(idx)
        return np.array(verts, dtype=np.float64), faces

    def target(self, rel):
        """target 파일 → (정점 수 x 3) 이동량 (cm)"""
        d = np.zeros_like(self.v)
        with open(os.path.join(self.root, "targets", rel)) as f:
            for line in f:
                if not line.strip() or line.startswith("#"):
                    continue
                i, x, y, z = line.split()
                d[int(i)] = [float(x) * 10, float(y) * 10, float(z) * 10]
        return d

    def skeleton(self):
        rig = os.path.join(self.root, "rigs")
        skel = json.load(open(os.path.join(rig, "default.mhskel")))
        weights = json.load(open(os.path.join(rig, "default_weights.mhw")))["weights"]
        # 정점마다 뼈 가중치 합이 1이 되도록 (도우미 정점은 합이 1이 아닌 경우가 있어요)
        total = {}
        for wl in weights.values():
            for i, w in wl:
                total[int(i)] = total.get(int(i), 0.0) + w
        weights = {b: [[i, w / total[int(i)]] for i, w in wl if total[int(i)] > 0] for b, wl in weights.items()}
        return skel, weights
