#!/usr/bin/env python3
"""把 three.js 源码 + 数据 + 场景代码拼成一个自包含 HTML。"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent   # 仓库根目录
tpl = (ROOT / "src/template.html").read_text("utf-8")
core = (ROOT / "src/three/three.core.js").read_text("utf-8")
mod = (ROOT / "src/three/three.module.js").read_text("utf-8")
scene = (ROOT / "src/scene.js").read_text("utf-8")
data = json.dumps(json.loads((ROOT / "src/graph_data.json").read_text("utf-8")), ensure_ascii=False)

for name, blk in (("core", core), ("module", mod), ("scene", scene), ("data", data)):
    assert "</script" not in blk.lower(), f"{name} 含有 </script，会截断 HTML"

out = (tpl
       .replace("__THREE_CORE__", core)
       .replace("__THREE_MODULE__", mod)
       .replace("__DATA__", data)
       .replace("__SCENE__", scene))

target = ROOT / "上海初中数学知识图谱_3D.html"
target.write_text(out, "utf-8")
print("written:", target, f"{target.stat().st_size/1024/1024:.2f} MB")
