"""Одноразовая миграция: эффекты заклинаний из HTML-списка в структурное поле system.effects."""
import json, re, sys, html

SKILL_KEYS = {"Магия": "arcana", "Вера": "divine", "Природа": "primal"}

def parse(spell):
    s = spell["system"]
    if isinstance(s.get("skills"), str):
        s["skills"] = [SKILL_KEYS[x.strip()] for x in s["skills"].split(",") if x.strip() in SKILL_KEYS]
    desc = s.get("description", "")
    # Список эффектов — первый <ul> после заголовка «Дополнительные эффекты».
    head = re.search(r"Дополнительные эффекты", desc)
    m = re.compile(r"<ul>(.*?)</ul>", re.S).search(desc, head.end() if head else 0) if head else None
    effects = []
    if m:
        for li in re.findall(r"<li>(.*?)</li>", m.group(1), re.S):
            mm = re.match(r"\s*<strong>(.*?)</strong>\s*\(([+−-]?\s*\d+)[^)]*\)\s*[:.—-]?\s*(.*)", li, re.S)
            if not mm:
                print("  ! не разобран эффект:", spell["name"], li[:80]); continue
            name, diff, text = mm.groups()
            only = re.search(r"\(только ([^)]+)\)", name)
            skills = []
            if only:
                skills = [SKILL_KEYS[x.strip()] for x in re.split(r",| и ", only.group(1)) if x.strip() in SKILL_KEYS]
                name = name.replace(only.group(0), "").strip()
            repeat = bool(re.search(r"многократно|несколько раз|можно добавлять повторно|повторно", text))
            effects.append({
                "name": name.strip(),
                "difficulty": int(diff.replace("−", "-").replace(" ", "")),
                "skills": skills,
                "repeatable": repeat,
                "description": text.strip()
            })
        # Описание без списка эффектов (и без вводной строки «Дополнительные эффекты»).
        desc = desc[:m.start()] + desc[m.end():]
        desc = re.sub(r"<p><strong>Дополнительные эффекты[^<]*</strong>[^<]*</p>\s*$", "", desc.strip())
        desc = re.sub(r"<p><strong>Дополнительные эффекты</strong>[^<]*</p>", "", desc)
    s["description"] = desc.strip()
    s["effects"] = effects
    s.setdefault("concentration", False)
    s["attack"] = spell.get("nameEn") == "Attack" or s.get("attack", False)
    s.setdefault("baseAction", "")
    s.setdefault("selected", [])
    return len(effects)

for path in sys.argv[1:]:
    data = json.load(open(path))
    for sp in data:
        if sp["type"] == "spell":
            n = parse(sp)
            print(f"{sp['name']}: {n} эффектов, навыки {sp['system']['skills']}")
    json.dump(data, open(path, "w"), ensure_ascii=False, indent=2)
    open(path, "a").write("\n")
