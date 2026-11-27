#!/usr/bin/env python3
"""Seed or remove FICTIONAL demo listings (isDemo=true, no phone numbers).
Usage: demo_listings.py seed | delete
Needs a Google access token with Firestore rights in /tmp/.at (e.g. from the Firebase CLI login)."""
import json, random, sys, urllib.request
P = 'velora-6f788'
T = open('/tmp/.at').read().strip()
H = {'Authorization': 'Bearer ' + T, 'x-goog-user-project': P, 'Content-Type': 'application/json'}
BASE = f'https://firestore.googleapis.com/v1/projects/{P}/databases/(default)/documents'

def enc(v):
    if isinstance(v, bool): return {'booleanValue': v}
    if isinstance(v, int): return {'integerValue': str(v)}
    if isinstance(v, float): return {'doubleValue': v}
    if isinstance(v, str): return {'stringValue': v}
    if isinstance(v, list): return {'arrayValue': {'values': [enc(x) for x in v]}}
    if isinstance(v, dict): return {'mapValue': {'fields': {k: enc(x) for k, x in v.items()}}}
    raise TypeError(v)

def req(m, u, b=None):
    r = urllib.request.Request(u, method=m, headers=H, data=json.dumps(b).encode() if b is not None else None)
    try: return json.load(urllib.request.urlopen(r))
    except urllib.error.HTTPError as e: print('ERR', e.code, e.read()[:200]); return {}

IMG = '/src/assets/images/'
VENUE_IMGS = [IMG + 'velora_venue_palace_1795424759214.jpg', IMG + 'velora_venue_garden_1795424759691.jpg', IMG + 'velora_hero_wedding_1795424759489.jpg']
PHOTO_IMGS = [IMG + 'velora_photographer_couple_1795424759634.jpg', IMG + 'couple_floral_illustration_1795512102318.jpg', IMG + 'velora_hero_wedding_1795424759489.jpg']
SERV_IMGS = [IMG + 'velora_service_floral_kosha_1795424758988.jpg', IMG + 'ivory_roses_fullbleed_1795512118161.jpg']
PLACES = [('القاهرة', 'التجمع الخامس'), ('القاهرة', 'مدينة نصر'), ('القاهرة', 'المعادي'), ('الجيزة', 'الشيخ زايد'), ('الجيزة', 'الهرم'), ('الجيزة', 'الدقي'),
          ('الإسكندرية', 'سموحة'), ('الإسكندرية', 'العجمي'), ('المنوفية', 'شبين الكوم'), ('الدقهلية', 'المنصورة'), ('الغربية', 'طنطا'), ('الشرقية', 'الزقازيق'),
          ('القليوبية', 'بنها'), ('أسيوط', 'وسط المدينة'), ('الفيوم', 'وسط المدينة'), ('السويس', 'الأربعين'), ('أسوان', 'كورنيش النيل'), ('الأقصر', 'الكرنك'),
          ('البحيرة', 'دمنهور'), ('الإسماعيلية', 'حي أول')]
HALLS = ['قاعة ليالي الياسمين', 'قاعة نجمة الزمان', 'قصر الأحلام الذهبي', 'قاعة سحر الفيروز', 'قاعة بيت الورد', 'قاعة أمواج الندى', 'قصر الفرح الملكي', 'قاعة همسة العمر',
         'قاعة شمس الأصيل', 'قاعة زهرة اللوتس', 'قاعة واحة الأنوار', 'قصر الهناء', 'قاعة ضي القمر', 'قاعة لمسة حرير', 'قاعة جنة الأفراح', 'قاعة سماء الكريستال',
         'قاعة عبير الليل', 'قصر النخيل', 'قاعة مرايا الزمن', 'قاعة بهجة العمر']
PHOTOS = ['استوديو لقطة حلم', 'عدسة الحكاية', 'استوديو ضوء ولون', 'ذكريات بالعدسة', 'استوديو لحظة وردية', 'فريق إطار ذهبي', 'استوديو نبض الصورة', 'عدسة الليالي',
          'استوديو ظل وضوء', 'فريق لقطات الزمن', 'استوديو سحر الكادر', 'عدسة الفرحة', 'استوديو بصمة', 'فريق وميض', 'استوديو صدى اللحظة', 'عدسة الأصيل',
          'استوديو رحلة الحب', 'فريق كادر أبيض', 'استوديو لمسة نور', 'عدسة أحلى يوم']
SERVS = [('kosha', 'كوشة الأحلام البيضاء (نموذج تجريبي)'), ('flowers', 'تنسيق ورد بيت الربيع (نموذج تجريبي)'), ('decor', 'ديكور وإضاءة ليالي الفرح (نموذج تجريبي)'),
         ('makeup', 'ميك أب لمسة جمال (نموذج تجريبي)'), ('cars', 'سيارات الزفاف الكلاسيك (نموذج تجريبي)'), ('catering', 'بوفيه وحلويات الفرح (نموذج تجريبي)')]
COMMON = {'ownerId': 'demo-owner', 'isDemo': True, 'status': 'approved', 'featured': False, 'avgRating': 0, 'reviewsCount': 0,
          'createdAt': '2026-11-27T06:00:00.000Z', 'contactPhone': ''}
random.seed(7)
MAN = json.load(open(__file__.rsplit('/', 1)[0] + '/demo_images.json'))
def credit(m):
    return f" الصورة: {m['author'] or 'مجهول'} ({m['license']}) عبر Wikimedia Commons."


def put(col, id_, rec):
    req('PATCH', f'{BASE}/{col}/{id_}', {'fields': {k: enc(v) for k, v in rec.items()}})

def seed():
    for i, name in enumerate(HALLS):
        city, area = PLACES[i]; m = MAN['hall'][i]; img = m['file']; cmin = random.choice([100, 150, 200, 250]); id_ = f'demo-venue-{i+1:02d}'
        put('venues', id_, {**COMMON, 'id': id_, 'ownerName': 'نموذج تجريبي', 'titleAr': name + ' (نموذج تجريبي)', 'subtitleAr': 'قاعة أفراح - إعلان تجريبي',
            'city': city, 'area': area, 'address': 'عنوان تجريبي', 'mapUrl': '', 'capacityMin': cmin, 'capacityMax': cmin + random.choice([200, 300, 450]),
            'pricePerEvent': random.randrange(30000, 160000, 5000), 'discountPercent': random.choice([0, 0, 5, 10]), 'workingHours': '6:00 م - 2:00 ص',
            'decorStyles': ['كلاسيك', 'مودرن'], 'features': ['جناح للعروسين', 'إضاءة وساوند', 'موقف سيارات'],
            'descriptionAr': f'قاعة أفراح تجريبية في {area} - {city}. هذا إعلان وهمي لعرض شكل الموقع وليس قاعة حقيقية.' + credit(m),
            'coverImage': img, 'galleryImages': [img], 'videoUrl': ''})
    for i, name in enumerate(PHOTOS):
        city, area = PLACES[(i * 3 + 1) % len(PLACES)]; m = MAN['photo'][i]; img = m['file']; id_ = f'demo-photographer-{i+1:02d}'
        put('photographers', id_, {**COMMON, 'id': id_, 'displayName': name + ' (نموذج تجريبي)', 'specialtyAr': random.choice(['تصوير أفراح سينمائي', 'تصوير خطوبة وسيشن', 'فيديو وتصوير فوتوغرافي']),
            'city': city, 'studioLocation': area, 'yearsExperience': random.randint(2, 12), 'workingHours': '11:00 ص - 10:00 م',
            'startingPrice': random.randrange(5000, 30000, 1000), 'discountPercent': random.choice([0, 0, 10]),
            'bioAr': f'مصور تجريبي في {area} - {city}. إعلان وهمي لعرض شكل الموقع فقط.' + credit(m), 'equipmentAr': 'كاميرات احترافية وعدسات متنوعة',
            'shootingTypes': ['فوتو سيشن', 'تغطية الحفل'], 'avatarUrl': img, 'coverImage': img, 'videoReelUrl': '',
            'albums': [{'id': f'demo-album-{i+1:02d}', 'photographerId': id_, 'titleAr': 'أعمال تجريبية', 'descriptionAr': 'صور توضيحية للعرض فقط',
                        'sessionDate': '2026-10-01', 'locationAr': city, 'photos': [img]}]})
    for i, (cat, name) in enumerate(SERVS):
        city, area = PLACES[(i * 2) % len(PLACES)]; m = MAN['serv'][i]; img = m['file']; id_ = f'demo-service-{i+1:02d}'
        put('services', id_, {**COMMON, 'id': id_, 'providerName': 'نموذج تجريبي', 'category': cat, 'titleAr': name, 'city': city, 'area': area,
            'startingPrice': random.randrange(3000, 25000, 500), 'discountPercent': 0, 'workingHours': '10:00 ص - 9:00 م',
            'descriptionAr': 'خدمة تجريبية لعرض شكل الموقع، وليست مقدم خدمة حقيقي.' + credit(m), 'packagesAr': ['باقة أساسية'], 'coverImage': img, 'galleryImages': [img], 'videoUrl': ''})
    print('seeded', len(HALLS), len(PHOTOS), len(SERVS))

def delete():
    n = 0
    for col in ('venues', 'photographers', 'services'):
        r = req('POST', f'{BASE}:runQuery', {'structuredQuery': {'from': [{'collectionId': col}], 'where': {'fieldFilter': {'field': {'fieldPath': 'isDemo'}, 'op': 'EQUAL', 'value': {'booleanValue': True}}}}})
        for row in r if isinstance(r, list) else []:
            if 'document' in row: req('DELETE', 'https://firestore.googleapis.com/v1/' + row['document']['name']); n += 1
    print('deleted demo listings:', n, '(bookings/reviews made on them are NOT removed; clear those separately if any)')

{'seed': seed, 'delete': delete}[sys.argv[1]]()
