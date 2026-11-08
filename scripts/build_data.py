#!/usr/bin/env python3
"""Build the normalized travel-risk dataset from official government sources.

Inputs (raw downloads, see fetch.py):
  data/raw/us_cadata.json      US State Dept travel advisories (JSON)
  data/raw/uk/*.json          UK FCDO country advice (GOV.UK Content API)
  data/raw/ca_list.html        Canada travel advisories (HTML table)
  data/raw/de_open.json        Germany AA open data (JSON)

Outputs:
  web/data/risk.json          normalized + aggregated risk data
  web/data/countries.geojson  simplified world polygons with ISO codes
"""
import json, re, os, sys, html, unicodedata, statistics, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# ---------------------------------------------------------------- source meta
SOURCES = {
    "us": {
        "name_zh": "美国国务院", "name_en": "U.S. Dept. of State", "short": "US",
        "flag": "🇺🇸", "scale": 4,
        "url": "https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html",
        "levels": {1: "保持正常防范", 2: "提高警惕", 3: "重新考虑行程", 4: "请勿前往"},
    },
    "uk": {
        "name_zh": "英国外交部", "name_en": "UK FCDO", "short": "UK",
        "flag": "🇬🇧", "scale": 4,
        "url": "https://www.gov.uk/foreign-travel-advice",
        "levels": {1: "无旅行警告", 2: "存在安全提示", 3: "避免非必要旅行", 4: "建议不要前往"},
    },
    "ca": {
        "name_zh": "加拿大政府", "name_en": "Global Affairs Canada", "short": "CA",
        "flag": "🇨🇦", "scale": 4,
        "url": "https://travel.gc.ca/travelling/advisories",
        "levels": {1: "保持正常防范", 2: "高度警惕", 3: "避免非必要旅行", 4: "避免一切旅行"},
    },
    "de": {
        "name_zh": "德国外交部", "name_en": "German Federal Foreign Office", "short": "DE",
        "flag": "🇩🇪", "scale": 4,
        "url": "https://www.auswaertiges-amt.de/en/aussenpolitik/laender",
        "levels": {1: "无正式旅行警告", 2: "安全形势提示", 3: "部分地区旅行警告", 4: "旅行警告"},
    },
    "cn": {
        "name_zh": "中国外交部", "name_en": "MFA of China", "short": "CN",
        "flag": "🇨🇳", "scale": 4,
        "url": "https://cs.mfa.gov.cn/zggmcg/ljmdd/",
        "levels": {1: "低风险", 2: "中风险", 3: "高风险", 4: "极高风险"},
    },
}

# ------------------------------------------------------------- name matching
ALIASES = {
    # normalized source name -> ISO2
    "burma": "MM", "myanmar": "MM",
    "cabo verde": "CV", "cape verde": "CV",
    "cote d ivoire": "CI", "ivory coast": "CI", "cote divoire": "CI",
    "czech republic": "CZ", "czechia": "CZ",
    "east timor": "TL", "timor leste": "TL",
    "eswatini": "SZ", "swaziland": "SZ",
    "kyrgyz republic": "KG", "kyrgyzstan": "KG", "the kyrgyz republic": "KG",
    "laos": "LA", "lao pdr": "LA",
    "macedonia": "MK", "north macedonia": "MK",
    "micronesia": "FM", "federated states of micronesia": "FM",
    "naoero": "NR", "nauru": "NR",
    "russia": "RU", "russian federation": "RU",
    "south korea": "KR", "republic of korea": "KR", "korea south": "KR",
    "north korea": "KP", "democratic peoples republic of korea": "KP",
    "republic of congo": "CG", "congo brazzaville": "CG", "congo": "CG",
    "democratic republic of the congo": "CD", "congo kinshasa": "CD", "drc": "CD",
    "turkey": "TR", "turkiye": "TR",
    "united states": "US", "united states of america": "US", "usa": "US",
    "united kingdom": "GB", "great britain": "GB", "britain": "GB",
    "vatican city": "VA", "holy see": "VA", "vatican": "VA",
    "the bahamas": "BS", "bahamas": "BS",
    "the gambia": "GM", "gambia": "GM",
    "hong kong": "HK", "hong kong sar": "HK", "hong kong sar china": "HK",
    "macau": "MO", "macao": "MO", "macao sar": "MO",
    "palestine": "PS", "the west bank": "PS", "west bank": "PS", "gaza": "PS",
    "israel the west bank and gaza": "IL",
    "saint barthelemy": "BL", "st barts": "BL",
    "french saint martin": "MF", "saint martin": "MF",
    "sint maarten": "SX",
    "saint vincent and the grenadines": "VC", "st vincent and the grenadines": "VC",
    "saint kitts and nevis": "KN", "st kitts and nevis": "KN",
    "saint lucia": "LC", "st lucia": "LC",
    "st maarten": "SX", "sint maarten": "SX",
    "st martin and saint barthelemy": "MF",
    "st helena ascension and tristan da cunha": "SH",
    "st pierre and miquelon": "PM", "saint pierre and miquelon": "PM",
    "azores": "PT", "canary islands": "ES", "madeira": "PT",
    "guam": "GU", "northern marianas": "MP", "northern mariana islands": "MP",
    "virgin islands us": "VI", "us virgin islands": "VI", "virgin islands u s": "VI",
    "american samoa": "AS",
    "british indian ocean territory": "IO",
    "south georgia and the south sandwich islands": "GS",
    "trinidad and tobago": "TT", "antigua and barbuda": "AG",
    "bosnia and herzegovina": "BA", "bosnia": "BA",
    "central african republic": "CF",
    "dominican republic": "DO",
    "equatorial guinea": "GQ",
    "guinea bissau": "GW",
    "papua new guinea": "PG",
    "sao tome and principe": "ST",
    "solomon islands": "SB",
    "south sudan": "SS",
    "sri lanka": "LK",
    "united arab emirates": "AE", "uae": "AE",
    "falkland islands": "FK", "falkland islands malvinas": "FK",
    "western sahara": "EH",
    "kosovo": "XK",
    "taiwan": "TW",
    "antarctica": "AQ",
    "greenland": "GL",
    "puerto rico": "PR",
    "bermuda": "BM",
    "cayman islands": "KY",
    "turks and caicos islands": "TC",
    "british virgin islands": "VG",
    "anguilla": "AI",
    "montserrat": "MS",
    "aruba": "AW",
    "curacao": "CW",
    "bonaire": "BQ", "saba and sint eustatius": "BQ", "caribbean netherlands": "BQ",
    "guadeloupe": "GP",
    "martinique": "MQ",
    "french guiana": "GF",
    "french polynesia": "PF",
    "new caledonia": "NC",
    "reunion": "RE",
    "mayotte": "YT",
    "faroe islands": "FO",
    "gibraltar": "GI",
    "jersey": "JE", "guernsey": "GG", "isle of man": "IM",
    "svalbard": "SJ",
    "cook islands": "CK", "niue": "NU",
    "wallis and futuna": "WF",
    "saint pierre and miquelon": "PM", "saint pierre et miquelon": "PM",
    "st martin and st barthelemy": "MF", "st martin and saint barthelemy": "MF",
    "saint helena": "SH",
    "tokelau": "TK",
    "pitcairn": "PN",
}

# tiny states / territories missing from the 110m polygon file: label coordinates
MICRO = {
    "AD": (42.55, 1.58), "SM": (43.94, 12.46), "MC": (43.74, 7.42), "LI": (47.16, 9.55),
    "MT": (35.90, 14.45), "SG": (1.35, 103.82), "BH": (26.03, 50.55), "MV": (3.20, 73.22),
    "SC": (-4.62, 55.45), "MU": (-20.20, 57.55), "KM": (-11.70, 43.30), "ST": (0.34, 6.73),
    "CV": (16.00, -24.00), "DJ": (11.59, 43.15), "GM": (13.44, -16.58), "GW": (11.80, -15.18),
    "GQ": (1.65, 10.27), "NR": (-0.52, 166.93), "TV": (-8.52, 179.20), "KI": (1.45, 173.03),
    "FM": (7.43, 150.42), "MH": (7.13, 171.38), "PW": (7.51, 134.58), "WS": (-13.76, -172.10),
    "TO": (-21.18, -175.20), "VU": (-15.38, 166.96), "SB": (-9.65, 160.16), "FJ": (-17.71, 178.07),
    "BN": (4.54, 114.73), "TL": (-8.87, 125.73), "BT": (27.51, 90.43), "XK": (42.60, 20.90),
    "PS": (31.95, 35.23), "EH": (-24.22, -12.89), "TW": (23.70, 120.96), "HK": (22.32, 114.17),
    "MO": (22.19, 113.54), "PR": (18.22, -66.59), "GL": (72.0, -40.0), "BM": (32.31, -64.75),
    "KY": (19.31, -81.25), "TC": (21.69, -71.80), "VG": (18.42, -64.64), "AI": (18.22, -63.07),
    "MS": (16.74, -62.19), "AW": (12.52, -69.97), "CW": (12.17, -68.99), "BQ": (12.18, -68.24),
    "GP": (16.25, -61.55), "MQ": (14.64, -61.02), "GF": (4.00, -53.00), "PF": (-17.68, -149.41),
    "NC": (-21.30, 165.50), "RE": (-21.12, 55.53), "YT": (-12.83, 45.17), "FO": (62.0, -6.9),
    "GI": (36.14, -5.35), "JE": (49.21, -2.13), "GG": (49.46, -2.58), "IM": (54.24, -4.55),
    "SJ": (78.0, 16.0), "CK": (-21.24, -159.78), "NU": (-19.05, -169.87), "WF": (-13.30, -176.20),
    "PM": (46.94, -56.33), "SH": (-15.94, -5.71), "TK": (-9.20, -171.85), "PN": (-25.07, -130.10),
    "FK": (-51.80, -59.00), "DM": (15.41, -61.37), "BB": (13.19, -59.54), "GD": (12.12, -61.68),
    "GU": (13.44, 144.79), "MP": (15.18, 145.75), "AS": (-14.27, -170.70), "IO": (-7.33, 72.42),
    "GS": (-54.40, -36.60), "VI": (18.34, -64.93),
}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace("&", " and ")
    s = s.replace("’", "'").replace("'", " ")
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    s = re.sub(r"^the\s+", "", s)
    return re.sub(r"\s+", " ", s)


def clean_text(s: str, limit=520) -> str:
    s = re.sub(r"<script.*?</script>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<style.*?</style>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    s = re.sub(r"[\u00a0\s]+", " ", s).strip()
    if len(s) > limit:
        s = s[:limit].rsplit(" ", 1)[0] + "…"
    return s


def iso_date(s: str) -> str:
    if not s:
        return ""
    m = re.match(r"(\d{4}-\d{2}-\d{2})", s)
    return m.group(1) if m else ""


# ------------------------------------------------------------------ world map
world = json.load(open("data/raw/world.geojson", encoding="utf-8"))
features = world["features"]
iso_index = {}      # iso2 -> canonical info
name_index = {}     # normalized name -> iso2

for f in features:
    p = f["properties"]
    iso2 = (p.get("ISO_A2") or "").upper()
    if len(iso2) != 2 or iso2.startswith("-"):
        iso2 = (p.get("ISO_A2_EH") or "").upper()
    if len(iso2) != 2 or iso2.startswith("-"):
        continue
    iso_index[iso2] = {
        "iso2": iso2,
        "iso3": p.get("ISO_A3") or "",
        "name_en": p.get("NAME_EN") or p.get("NAME") or "",
        "name_zh": p.get("NAME_ZH") or p.get("NAME") or "",
        "name_ja": p.get("NAME_JA") or "",
        "continent": p.get("CONTINENT") or "",
        "lat": round(float(p.get("LABEL_Y") or 0), 3),
        "lon": round(float(p.get("LABEL_X") or 0), 3),
        "has_geom": True,
    }
    for key in ("NAME", "NAME_EN", "NAME_LONG", "BRK_NAME", "ADMIN", "FORMAL_EN", "NAME_ZH"):
        v = p.get(key)
        if v:
            name_index.setdefault(norm(str(v)), iso2)

for alias, iso2 in ALIASES.items():
    name_index[norm(alias)] = iso2

# small states absent from the 110m polygon file still need name matching
EXTRA_NAMES = {
    "AD": "Andorra", "BH": "Bahrain", "BB": "Barbados", "DM": "Dominica", "GD": "Grenada",
    "KI": "Kiribati", "LI": "Liechtenstein", "MT": "Malta", "MH": "Marshall Islands",
    "MU": "Mauritius", "MC": "Monaco", "PW": "Palau", "WS": "Samoa", "SM": "San Marino",
    "SC": "Seychelles", "SG": "Singapore", "TO": "Tonga", "TV": "Tuvalu", "MV": "Maldives",
    "KM": "Comoros", "CV": "Cabo Verde", "ST": "Sao Tome and Principe",
    "NR": "Nauru", "FM": "Micronesia", "LC": "Saint Lucia", "VC": "Saint Vincent",
    "KN": "Saint Kitts", "AG": "Antigua", "GD": "Grenada", "BB": "Barbados",
    "HK": "Hong Kong", "MO": "Macao", "TC": "Turks and Caicos Islands", "YT": "Mayotte",
    "AI": "Anguilla", "AS": "American Samoa", "AW": "Aruba", "BL": "Saint Barthelemy",
    "BM": "Bermuda", "BQ": "Caribbean Netherlands", "CK": "Cook Islands", "CW": "Curacao",
    "GF": "French Guiana", "GI": "Gibraltar", "GP": "Guadeloupe", "GS": "South Georgia",
    "GU": "Guam", "IO": "British Indian Ocean Territory", "KY": "Cayman Islands",
    "MF": "Saint Martin", "MP": "Northern Mariana Islands", "MQ": "Martinique",
    "MS": "Montserrat", "NU": "Niue", "PF": "French Polynesia",
    "PM": "Saint Pierre and Miquelon", "PN": "Pitcairn Islands", "RE": "Reunion",
    "SH": "Saint Helena", "SX": "Sint Maarten", "TK": "Tokelau",
    "VG": "British Virgin Islands", "VI": "U.S. Virgin Islands", "WF": "Wallis and Futuna",
    "PR": "Puerto Rico", "GL": "Greenland", "JE": "Jersey", "GG": "Guernsey",
    "IM": "Isle of Man", "FO": "Faroe Islands", "SJ": "Svalbard", "FK": "Falkland Islands",
    "VA": "Vatican City", "TW": "Taiwan", "PS": "Palestine", "XK": "Kosovo",
}
EXTRA_ZH = {
    "AD": "安道尔", "BH": "巴林", "BB": "巴巴多斯", "DM": "多米尼克", "GD": "格林纳达",
    "KI": "基里巴斯", "LI": "列支敦士登", "MT": "马耳他", "MH": "马绍尔群岛",
    "MU": "毛里求斯", "MC": "摩纳哥", "PW": "帕劳", "WS": "萨摩亚", "SM": "圣马力诺",
    "SC": "塞舌尔", "SG": "新加坡", "TO": "汤加", "TV": "图瓦卢", "MV": "马尔代夫",
    "KM": "科摩罗", "CV": "佛得角", "ST": "圣多美和普林西比", "NR": "瑙鲁",
    "FM": "密克罗尼西亚联邦", "LC": "圣卢西亚", "VC": "圣文森特和格林纳丁斯",
    "KN": "圣基茨和尼维斯", "AG": "安提瓜和巴布达", "HK": "香港", "MO": "澳门",
    "TC": "特克斯和凯科斯群岛", "YT": "马约特", "AI": "安圭拉", "AS": "美属萨摩亚",
    "AW": "阿鲁巴", "BL": "圣巴泰勒米", "BM": "百慕大", "BQ": "荷兰加勒比区",
    "CK": "库克群岛", "CW": "库拉索", "GF": "法属圭亚那", "GI": "直布罗陀",
    "GP": "瓜德罗普", "GS": "南乔治亚和南桑威奇群岛", "GU": "关岛",
    "IO": "英属印度洋领地", "KY": "开曼群岛", "MF": "法属圣马丁",
    "MP": "北马里亚纳群岛", "MQ": "马提尼克", "MS": "蒙特塞拉特", "NU": "纽埃",
    "PF": "法属波利尼西亚", "PM": "圣皮埃尔和密克隆", "PN": "皮特凯恩群岛",
    "RE": "留尼汪", "SH": "圣赫勒拿", "SX": "荷属圣马丁", "TK": "托克劳",
    "VG": "英属维尔京群岛", "VI": "美属维尔京群岛", "WF": "瓦利斯和富图纳",
    "PR": "波多黎各", "GL": "格陵兰", "JE": "泽西岛", "GG": "根西岛",
    "IM": "马恩岛", "FO": "法罗群岛", "SJ": "斯瓦尔巴群岛", "FK": "福克兰群岛",
    "VA": "梵蒂冈", "TW": "台湾", "PS": "巴勒斯坦", "XK": "科索沃",
}
for iso2, n in EXTRA_NAMES.items():
    name_index.setdefault(norm(n), iso2)
for iso2, n in EXTRA_ZH.items():
    name_index.setdefault(norm(n), iso2)

# Chinese page names that differ from Natural Earth's NAME_ZH
ZH_ALIASES = {
    "中非": "CF", "刚果(布)": "CG", "刚果（布）": "CG", "刚果(金)": "CD", "刚果（金）": "CD",
    "朝鲜": "KP", "波黑": "BA", "蒙古": "MN", "阿联酋": "AE", "韩国": "KR",
    "俄罗斯": "RU", "美国": "US", "英国": "GB", "法国": "FR", "德国": "DE",
    "中国香港": "HK", "中国澳门": "MO", "库克群岛": "CK", "纽埃": "NU",
}
zh_index = {}
for iso2, info in iso_index.items():
    if info.get("name_zh"):
        zh_index[info["name_zh"]] = iso2
for iso2, n in EXTRA_ZH.items():
    zh_index[n] = iso2
for k, v in ZH_ALIASES.items():
    zh_index[k] = v


def match(name: str):
    """Resolve a source-provided country name to ISO2."""
    n = norm(name)
    if n in name_index:
        return name_index[n]
    # try dropping trailing qualifiers
    for suffix in (" travel advisory", " advisory", " sar", " special administrative region"):
        if n.endswith(suffix):
            n2 = n[: -len(suffix)]
            if n2 in name_index:
                return name_index[n2]
    # try prefix match on multi-part names ("X and Y")
    for key, iso2 in name_index.items():
        if len(key) > 4 and (n.startswith(key + " ") or n.endswith(" " + key)):
            return iso2
    return None


def ensure_country(iso2, fallback_name=""):
    if iso2 in iso_index:
        return iso_index[iso2]
    lat, lon = MICRO.get(iso2, (0.0, 0.0))
    info = {
        "iso2": iso2, "iso3": "", "name_en": fallback_name or EXTRA_NAMES.get(iso2, iso2),
        "name_zh": EXTRA_ZH.get(iso2) or fallback_name or iso2, "name_ja": "", "continent": "",
        "lat": lat, "lon": lon, "has_geom": False,
    }
    iso_index[iso2] = info
    return info


# ------------------------------------------------------------------- parsers
def parse_us():
    data = json.load(open("data/raw/us_cadata.json", encoding="utf-8"))
    recs, unmatched = {}, []
    for r in data:
        m = re.match(r"^(.*?)\s*-\s*Level\s*([1-4])\s*:\s*(.+)$", r["Title"].strip())
        if not m:
            unmatched.append(r["Title"])
            continue
        raw_name, level, label = m.group(1).strip(), int(m.group(2)), m.group(3).strip()
        raw_name = re.sub(r"\s*Travel Advisory$", "", raw_name, flags=re.I)
        iso2 = match(raw_name)
        if not iso2:
            unmatched.append(raw_name)
            continue
        if iso2 in recs and recs[iso2]["updated"] >= iso_date(r.get("Updated", "")):
            continue
        recs[iso2] = {
            "level": level,
            "label_en": label,
            "label_zh": SOURCES["us"]["levels"][level],
            "updated": iso_date(r.get("Updated", "")),
            "url": r.get("Link", ""),
            "summary": clean_text(r.get("Summary", "")),
            "partial": False,
        }
    return recs, unmatched


UK_LABELS = {
    ("avoid_all_travel_to_whole_country",): (4, "Avoid all travel", "建议不要前往", False),
    ("avoid_all_but_essential_travel_to_whole_country",): (3, "Avoid all but essential travel", "避免非必要旅行", False),
}


def parse_uk():
    recs, unmatched = {}, []
    for fn in os.listdir("data/raw/uk"):
        if not fn.endswith(".json"):
            continue
        d = json.load(open(os.path.join("data/raw/uk", fn), encoding="utf-8"))
        det = d.get("details", {})
        name = (det.get("country") or {}).get("name") or d.get("title", "").replace(" travel advice", "")
        iso2 = match(name)
        if not iso2:
            unmatched.append(name)
            continue
        status = det.get("alert_status") or []
        level, label_en, label_zh, partial = 1, "No travel warning", "无旅行警告", False
        if "avoid_all_travel_to_whole_country" in status:
            level, label_en, label_zh = 4, "Avoid all travel", "建议不要前往"
        elif "avoid_all_but_essential_travel_to_whole_country" in status:
            level, label_en, label_zh = 3, "Avoid all but essential travel", "避免非必要旅行"
        elif "avoid_all_travel_to_parts" in status:
            level, label_en, label_zh, partial = 4, "Avoid all travel to parts of the country", "部分地区建议不要前往", True
        elif "avoid_all_but_essential_travel_to_parts" in status:
            level, label_en, label_zh, partial = 3, "Avoid all but essential travel to parts", "部分地区避免非必要旅行", True
        recs[iso2] = {
            "level": level, "label_en": label_en, "label_zh": label_zh,
            "updated": iso_date(d.get("public_updated_at", "")),
            "url": "https://www.gov.uk" + d.get("base_path", ""),
            "partial": partial, "summary": "",
        }
    return recs, unmatched


CA_ICONS = {
    "normal-precautions": (1, "Exercise normal security precautions", "保持正常安全防范"),
    "increased-caution": (2, "Exercise a high degree of caution", "高度警惕"),
    "reconsider-travel": (3, "Avoid non-essential travel", "避免非必要旅行"),
    "do-not-travel": (4, "Avoid all travel", "避免一切旅行"),
}


def parse_ca():
    s = open("data/raw/ca_list.html", encoding="utf-8").read()
    body = s[s.find("<tbody>"): s.find("</tbody>")]
    recs, unmatched = {}, []
    for row in re.findall(r"<tr>(.*?)</tr>", body, re.S):
        a = re.search(r'<a href="https://travel\.gc\.ca/destinations/([^"]+)">([^<]+)</a>', row)
        icon = re.search(r"icons/([a-z\-]+)\.svg", row)
        ts = re.search(r"(\d{4}-\d{2}-\d{2}) \d{2}:\d{2}", row)
        if not (a and icon):
            continue
        slug, name = a.group(1), html.unescape(a.group(2)).strip()
        iso2 = match(name)
        if not iso2:
            unmatched.append(name)
            continue
        level, label_en, label_zh = CA_ICONS.get(icon.group(1), (None, "", ""))
        if not level:
            continue
        partial = "regional advisory" in row.lower()
        recs[iso2] = {
            "level": level, "label_en": label_en, "label_zh": label_zh,
            "updated": ts.group(1) if ts else "",
            "url": "https://travel.gc.ca/destinations/" + slug,
            "partial": partial, "summary": "",
        }
    return recs, unmatched


def parse_de():
    raw = json.load(open("data/raw/de_open.json", encoding="utf-8"))["response"]
    recs = {}
    for v in raw.values():
        if not isinstance(v, dict) or "countryCode" not in v:
            continue
        iso2 = v["countryCode"].upper()
        if v.get("warning"):
            level, label_en, label_zh, partial = 4, "Reisewarnung (travel warning)", "旅行警告", False
        elif v.get("partialWarning"):
            level, label_en, label_zh, partial = 3, "Teilreisewarnung (partial warning)", "部分地区旅行警告", True
        else:
            continue
        recs[iso2] = {
            "level": level, "label_en": label_en, "label_zh": label_zh,
            "updated": datetime.datetime.fromtimestamp(v.get("lastModified", 0), datetime.timezone.utc).strftime("%Y-%m-%d") if v.get("lastModified") else "",
            "url": "https://www.auswaertiges-amt.de/en/aussenpolitik/laender",
            "partial": partial, "summary": "",
        }
    return recs, []


CN_COLORS = {"红色": 4, "橙色": 3, "黄色": 2, "蓝色": 1}
CN_LABELS = {
    4: ("Red alert (very high risk)", "红色（极高风险）"),
    3: ("Orange alert (high risk)", "橙色（高风险）"),
    2: ("Yellow alert (medium risk)", "黄色（中风险）"),
    1: ("Blue alert (low risk)", "蓝色（低风险）"),
}


def page_text(s: str) -> str:
    s = re.sub(r"<script.*?</script>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<style.*?</style>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<[^>]+>", "\n", s)
    s = html.unescape(s)
    s = re.sub(r"[ \t\u00a0]+", " ", s)
    s = re.sub(r"\n\s*\n+", "\n", s)
    return s


def parse_cn():
    """中国领事服务网「了解目的地」: red/orange/yellow/blue risk zones per country."""
    links = {}
    index_path = "data/raw/cn_index.html"
    if os.path.exists(index_path):
        raw = open(index_path, encoding="utf-8", errors="replace").read()
        for href, name in re.findall(r'href="(/ljmdd/[^"]+)"[^>]*>([^<]{1,30})</a>', raw):
            links.setdefault(name.strip(), href)

    recs, unmatched, zero = {}, [], []
    for fn in sorted(os.listdir("data/raw/cn")):
        if not fn.endswith(".html"):
            continue
        name = fn[:-5]
        iso2 = zh_index.get(name)
        if not iso2:
            unmatched.append(name)
            continue
        t = page_text(open("data/raw/cn/" + fn, encoding="utf-8", errors="replace").read())
        tc = re.sub(r"\s+", "", t).replace("（", "(").replace("）", ")")
        idx = tc.find("外交部提醒")
        if idx < 0:
            idx = len(tc)
        tail = tc[max(0, idx - 900):idx]
        colors = re.findall(r"(红色|橙色|黄色|蓝色)\((?:极高风险|高风险|中风险|低风险)\)", tail)
        if not colors:
            colors = re.findall(r"(红色|橙色|黄色|蓝色)[:：]", tail)
        if not colors:
            zero.append(name)
            continue
        level = max(CN_COLORS[c] for c in colors)
        partial = "其他地区" in tail or "部分地区" in tail
        m = re.search(r"外交部提醒[^。]{0,200}。", tc)
        advice = m.group(0) if m else ""
        label_en, label_zh = CN_LABELS[level]
        recs[iso2] = {
            "level": level, "label_en": label_en, "label_zh": label_zh,
            "updated": "",
            "url": "https://cs.mfa.gov.cn" + links.get(name, ""),
            "partial": partial, "summary": advice,
        }
    return recs, unmatched, zero


def load_emergency():
    """Police / ambulance / fire numbers per country."""
    path = "data/raw/emergency.json"
    if not os.path.exists(path):
        return {}
    data = json.load(open(path, encoding="utf-8"))["data"]

    def nums(rec, key):
        v = rec.get(key) or {}
        return [str(x) for x in (v.get("All") or []) if x]

    out = {}
    for rec in data:
        iso2 = ((rec.get("Country") or {}).get("ISOCode") or "").upper()
        if len(iso2) != 2:
            continue
        em = {
            "police": nums(rec, "Police"),
            "ambulance": nums(rec, "Ambulance"),
            "fire": nums(rec, "Fire"),
            "dispatch": nums(rec, "Dispatch"),
            "notes": rec.get("Notes") or "",
        }
        if em["police"] or em["ambulance"] or em["fire"] or em["dispatch"]:
            out[iso2] = em
    return out


# ------------------------------------------------------------------- build
NAME_ZH_FIX = {
    "CN": "中国", "US": "美国", "GB": "英国", "RU": "俄罗斯",
    "KR": "韩国", "KP": "朝鲜", "CD": "刚果（金）", "CG": "刚果（布）",
    "TW": "中国台湾", "HK": "中国香港", "MO": "中国澳门",
    "CZ": "捷克", "LA": "老挝", "MM": "缅甸",
}
NAME_EN_FIX = {
    "US": "United States", "CN": "China", "KR": "South Korea",
    "KP": "North Korea", "CD": "DR Congo", "CG": "Republic of the Congo",
    "TW": "Taiwan", "CZ": "Czechia",
}

us, us_unmatched = parse_us()
uk, uk_unmatched = parse_uk()
ca, ca_unmatched = parse_ca()
de, _ = parse_de()
cn, cn_unmatched, cn_zero = parse_cn()
emergency = load_emergency()

print("US records: %d  unmatched: %d" % (len(us), len(us_unmatched)))
print("UK records: %d  unmatched: %d" % (len(uk), len(uk_unmatched)))
print("CA records: %d  unmatched: %d" % (len(ca), len(ca_unmatched)))
print("DE records: %d" % len(de))
print("CN records: %d  unmatched: %d  no-level: %d" % (len(cn), len(cn_unmatched), len(cn_zero)))
print("Emergency records: %d" % len(emergency))
print("US unmatched:", us_unmatched)
print("UK unmatched:", uk_unmatched)
print("CA unmatched:", ca_unmatched)
print("CN unmatched:", cn_unmatched)
print("CN no-level:", cn_zero)

all_iso = set(us) | set(uk) | set(ca) | set(de) | set(cn)
for iso2 in sorted(all_iso):
    ensure_country(iso2)

countries = []
for iso2, info in sorted(iso_index.items()):
    if iso2 == "AQ":  # Antarctica: not a travel destination for this atlas
        continue
    src = {}
    for sid, recs in (("us", us), ("uk", uk), ("ca", ca), ("de", de), ("cn", cn)):
        if iso2 in recs:
            src[sid] = recs[iso2]
    if not src:
        continue
    levels = [r["level"] for r in src.values() if r.get("level")]
    med = statistics.median(levels)
    mean = sum(levels) / len(levels)
    country = dict(info)
    country["sources"] = src
    country["name_zh"] = NAME_ZH_FIX.get(iso2, country["name_zh"])
    country["name_en"] = NAME_EN_FIX.get(iso2, country["name_en"])
    country["agg"] = {
        "n": len(levels),
        "median": med,
        "mean": round(mean, 2),
        "min": min(levels),
        "max": max(levels),
        "spread": max(levels) - min(levels),
        "level": int(med + 0.5),  # round half up -> conservative
    }
    country["updated"] = max((r.get("updated") or "") for r in src.values())
    if iso2 in emergency:
        country["emergency"] = emergency[iso2]
    countries.append(country)

countries.sort(key=lambda c: (-c["agg"]["level"], -c["agg"]["mean"], c["name_en"]))

payload = {
    "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
    "sources": SOURCES,
    "country_count": len(countries),
    "emergency_source": {
        "name": "Emergency telephone numbers",
        "url": "https://en.wikipedia.org/wiki/List_of_emergency_telephone_numbers",
        "dataset": "https://github.com/shanezzar/JSON-of-emergency-telephone-numbers",
        "note": "警察 / 急救 / 消防号码；拨号前请确认当地适用号码。",
    },
    "countries": countries,
}

os.makedirs("web/data", exist_ok=True)
risk_json = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
with open("web/data/risk.json", "w", encoding="utf-8") as f:
    f.write(risk_json)
# Script form: lets the app run from file:// / HarmonyOS WebView without fetch().
with open("web/data/risk.js", "w", encoding="utf-8") as f:
    f.write("window.__RISK__=" + risk_json + ";\n")

# ------------------------------------------------------------- map geometry
out_features = []
for f in features:
    p = f["properties"]
    iso2 = (p.get("ISO_A2") or "").upper()
    if len(iso2) != 2 or iso2.startswith("-"):
        iso2 = (p.get("ISO_A2_EH") or "").upper()
    if len(iso2) != 2 or iso2.startswith("-") or iso2 == "AQ":
        continue
    feats = dict(f)
    feats["properties"] = {
        "iso2": iso2,
        "name_en": p.get("NAME_EN") or p.get("NAME") or "",
        "name_zh": p.get("NAME_ZH") or "",
    }
    # round coordinates to ~1 km to shrink the payload
    def rnd(c):
        if isinstance(c, list):
            return [rnd(x) for x in c]
        return round(c, 3) if isinstance(c, float) else c
    feats["geometry"]["coordinates"] = rnd(f["geometry"]["coordinates"])
    out_features.append(feats)

geo = {"type": "FeatureCollection", "features": out_features}
geo_json = json.dumps(geo, ensure_ascii=False, separators=(",", ":"))
with open("web/data/countries.geojson", "w", encoding="utf-8") as f:
    f.write(geo_json)
with open("web/data/geo.js", "w", encoding="utf-8") as f:
    f.write("window.__GEO__=" + geo_json + ";\n")

print("countries in dataset:", len(countries))
print("risk.json bytes:", os.path.getsize("web/data/risk.json"))
print("countries.geojson bytes:", os.path.getsize("web/data/countries.geojson"))
print("point-only countries:", [c["iso2"] for c in countries if not c["has_geom"]])
