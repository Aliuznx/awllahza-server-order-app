"""Import only literal menu data; never execute scripts from the source website.

Usage: python scripts/import_menu.py [--fetch]
The committed source snapshot makes the import repeatable and auditable offline.
"""
import argparse
import ast
import base64
from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import html
import json
from pathlib import Path
import re
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/source/index.html'
URL = 'https://awllahza.com/'
TOKEN = re.compile(r"\s*(?:(?P<string>'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\")|(?P<number>\d+(?:\.\d+)?)|(?P<word>[A-Za-z_][A-Za-z_0-9]*)|(?P<punct>[\[\]{},:]))")


def literal_menu(text):
    """Parse a restricted JS data literal without eval, subprocesses, or JS execution."""
    match = re.search(r'const\s+M\s*=\s*(\[.*?\]);', text, re.S)
    if not match:
        raise ValueError('Source menu format changed: const M array not found')
    value = match.group(1)
    tokens, pos = [], 0
    while pos < len(value):
        match = TOKEN.match(value, pos)
        if not match:
            raise ValueError(f'Unexpected source token at {pos}')
        tokens.append((match.lastgroup, match.group(match.lastgroup)))
        pos = match.end()
    idx = 0

    def parse():
        nonlocal idx
        kind, token = tokens[idx]
        idx += 1
        if token in ('[', '{'):
            closing = ']' if token == '[' else '}'
            result = [] if token == '[' else {}
            while tokens[idx][1] != closing:
                if token == '[':
                    result.append(parse())
                else:
                    key_kind, key = tokens[idx]
                    idx += 1
                    if key_kind == 'string':
                        key = ast.literal_eval(key)
                    if tokens[idx][1] != ':':
                        raise ValueError('Invalid object literal')
                    idx += 1
                    result[key] = parse()
                if tokens[idx][1] == ',':
                    idx += 1
                elif tokens[idx][1] != closing:
                    raise ValueError('Missing comma')
            idx += 1
            return result
        if kind == 'string':
            return ast.literal_eval(token)
        if kind == 'number':
            return int(token) if '.' not in token else float(token)
        if token in ('null', 'true', 'false'):
            return {'null': None, 'true': True, 'false': False}[token]
        raise ValueError(f'Unsupported source value: {token}')

    result = parse()
    if idx != len(tokens):
        raise ValueError('Trailing source data')
    return result


def clean(value):
    return html.unescape(value or '')


def bilingual(en, ar):
    return {'en': clean(en), 'ar': clean(ar)}


def minor(price):
    found = re.fullmatch(r'(\d+(?:\.\d{1,2})?) SAR', price)
    if not found:
        raise ValueError(f'Unrecognized price: {price}')
    return int(Decimal(found.group(1)) * 100)


def build_catalog(source):
    categories, products, gaps = [], [], []
    source_menu = literal_menu(source)
    badge_ar = {'BIG 🔥': 'كبير 🔥', 'BEST': 'الأفضل', 'MENU': 'وجبة', 'POPULAR': 'الأكثر طلباً'}
    for c in source_menu:
        categories.append({'id': c['id'], 'name': bilingual(c['en'], c['ar']), 'icon': clean(c['ic'])})
        for item in c['it']:
            product_id = c['id'] + '-' + re.sub(r'[^a-z0-9]+', '-', item['ne'].lower()).strip('-')
            price = minor(item['pr'])
            variants = [{'id': 'regular', 'name': bilingual('Regular', 'عادي'), 'priceMinor': price, 'calories': item['cl']}]
            note = clean(item.get('no'))
            cheese = re.fullmatch(r'With cheese: (\+?)(\d+) SAR', note)
            small = re.fullmatch(r'Small: (\d+) SAR', note)
            # Restaurant override: Falafel Plate has no cheese option.
            if cheese and product_id != 'falafel-falafel-plate':
                amount = int(cheese[2]) * 100 + (price if cheese[1] else 0)
                variants.append({'id': 'cheese', 'name': bilingual('With cheese', 'مع جبن'), 'priceMinor': amount, 'calories': None})
                gaps.append({'productId': product_id, 'field': 'variants.cheese.calories', 'reason': 'Not specified by source'})
            if small:
                variants[0]['name'] = bilingual('Large', 'كبير')
                variants.append({'id': 'small', 'name': bilingual('Small', 'صغير'), 'priceMinor': int(small[1]) * 100, 'calories': None})
                gaps.append({'productId': product_id, 'field': 'variants.small.calories', 'reason': 'Not specified by source'})
            if not item.get('ig'):
                gaps.append({'productId': product_id, 'field': 'ingredients', 'reason': 'No separate ingredients list; description preserved'})
            products.append({
                'id': product_id, 'categoryId': c['id'],
                'name': bilingual(item['ne'], item['na']),
                'description': bilingual(item['de'], item['da']),
                'ingredients': bilingual(item.get('ig'), item.get('iga')),
                'note': bilingual('', '') if product_id == 'falafel-falafel-plate' else bilingual(item.get('no'), item.get('na2')),
                'badge': bilingual(item.get('bd'), badge_ar.get(clean(item.get('bd')), '')),
                'icon': clean(item.get('icm') or item.get('ic')),
                'calories': item['cl'], 'priceMinor': price,
                'active': True, 'variants': variants,
            })
    if len({p['id'] for p in products}) != len(products):
        raise ValueError('Duplicate product IDs')
    return {
        'sourceUrl': URL, 'sourceSha256': hashlib.sha256(source.encode()).hexdigest(),
        'currency': 'SAR', 'minorUnit': 2,
        'restaurant': {
            'name': bilingual('Awl Lahza', 'أول لحظة'),
            'tagline': bilingual('Taste the First Moment', 'ذوق أول لحظة'),
            'address': bilingual('Plan 71, Abu Bakr Al-Siddiq Street, opposite McDonald’s, Uhud, Dammam 32263, Saudi Arabia', 'مخطط 71، شارع أبو بكر الصديق، مقابل مطعم ماكدونالدز، حي أحد، الدمام 32263، المملكة العربية السعودية'),
            'mapsUrl': 'https://maps.app.goo.gl/c5ArK1aprzQ8qu436',
            'latitude': 26.4046239, 'longitude': 50.0382213,
        },
        'categories': categories, 'products': products,
        'importNotes': ['All 26 published source items have no separate active/inactive flag.', 'Source uses emoji product illustrations, not product photographs.', 'Prices are preserved. Tax/fee inclusion requires restaurant confirmation.'],
        'missingSourceFields': gaps,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--fetch', action='store_true')
    args = parser.parse_args()
    if args.fetch:
        with urlopen(Request(URL, headers={'User-Agent': 'AwlLahzaMenuImporter/1.0'}), timeout=30) as response:
            content = response.read().decode('utf-8')
        SOURCE.parent.mkdir(parents=True, exist_ok=True)
        SOURCE.write_text(content, encoding='utf-8')
    source = SOURCE.read_text(encoding='utf-8')
    catalog = build_catalog(source)
    logo = re.search(r'class="logo-img"\s+src="data:image/jpeg;base64,([^"]+)"', source)
    if not logo:
        raise ValueError('Source logo missing')
    assets = ROOT / 'public/assets'
    assets.mkdir(parents=True, exist_ok=True)
    (assets / 'logo.jpg').write_bytes(base64.b64decode(logo[1], validate=True))
    (ROOT / 'data/catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'categories': len(catalog['categories']), 'products': len(catalog['products']), 'variants': sum(len(p['variants']) for p in catalog['products']), 'sourceSha256': catalog['sourceSha256']}, indent=2))


if __name__ == '__main__':
    main()
