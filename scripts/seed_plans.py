#!/usr/bin/env python3
"""Create/reset the subscription plans (public prices). Admin edits them later from the admin panel.
Needs a Google access token with Firestore rights in /tmp/.at. Run: python3 scripts/seed_plans.py"""
import json, urllib.request
P = 'velora-6f788'; T = open('/tmp/.at').read().strip()
H = {'Authorization': 'Bearer ' + T, 'x-goog-user-project': P, 'Content-Type': 'application/json'}
BASE = f'https://firestore.googleapis.com/v1/projects/{P}/databases/(default)/documents/subscriptionPlans/'
def enc(v):
    if isinstance(v, bool): return {'booleanValue': v}
    if isinstance(v, int): return {'integerValue': str(v)}
    if isinstance(v, str): return {'stringValue': v}
    if isinstance(v, list): return {'arrayValue': {'values': [enc(x) for x in v]}}
PLANS = [
 dict(id='plan-provider-starter', audience='provider', targetRolesAr='مصور مستقل · مقدم خدمة زفاف', nameAr='باقة البداية',
      taglineAr='حضور رسمي منظم لاستقبال حجوزات العملاء وفحص التواريخ بسهولة.', monthlyPriceEgp=299, quarterlyPriceEgp=799, annualPriceEgp=2990,
      billingNoteAr='سنويًا بسعر 10 شهور (وفّر شهرين)',
      features=['إدراج ملفك المعتمد داخل منصة VÉLORA', 'معرض أعمال وألبومات حتى 15 صورة', 'استقبال طلبات الحجز مع منع تعارض التواريخ', 'إشعارات على الحساب عند كل طلب حجز', 'إطار لافندر مميز لإعلانك'],
      highlighted=False, active=True, sortOrder=1),
 dict(id='plan-provider-royal', audience='provider', targetRolesAr='قاعات الأفراح · المصورون · الكوشة والديكور', nameAr='باقة النمو الملكي',
      taglineAr='الأكثر طلبًا لزيادة الحجوزات والظهور في الترشيحات.', monthlyPriceEgp=699, quarterlyPriceEgp=1890, annualPriceEgp=6990,
      billingNoteAr='سنويًا بسعر 10 شهور (وفّر شهرين)',
      features=['كل مزايا باقة البداية', 'ظهور مميز في الصفحة الرئيسية وفي «اعثر على فرحك»', 'صور وألبومات وباقات أسعار غير محدودة', 'أولوية في الترشيحات داخل محافظتك', 'إطار بنفسجي ملكي مميز لإعلانك'],
      highlighted=True, active=True, sortOrder=2),
 dict(id='plan-provider-platinum', audience='provider', targetRolesAr='القاعات الكبرى · القصور · منظمو الحفلات', nameAr='الشريك البلاتيني',
      taglineAr='صدارة كاملة للقصور والفنادق ومنظمي حفلات الزفاف المتكاملة.', monthlyPriceEgp=1499, quarterlyPriceEgp=3990, annualPriceEgp=14990,
      billingNoteAr='سنويًا بسعر 10 شهور (وفّر شهرين) · يشمل حتى 5 إعلانات',
      features=['كل مزايا النمو الملكي', 'إدراج حتى 5 قاعات أو خدمات تحت حساب واحد', 'أولوية أولى في «اعثر على فرحك» ومقارنة القاعات', 'إبراز العروض الموسمية في الصفحة الرئيسية', 'إطار بلاتيني متدرج بشارة «شريك بلاتيني»'],
      highlighted=False, active=True, sortOrder=3),
 dict(id='plan-client-free', audience='client', targetRolesAr='لكل عريس وعروسة', nameAr='باقة العروسين الأساسية',
      taglineAr='تنظيم ميزانية الفرح وقائمة التجهيزات ومقارنة الأسعار مجانًا.', monthlyPriceEgp=0, quarterlyPriceEgp=0, annualPriceEgp=0,
      billingNoteAr='مجانًا بالكامل',
      features=['مساحة فرحنا لتتبع الميزانية والمدفوعات', 'قائمة تجهيزات ومهام قابلة للتخصيص', 'مقارنة حتى 3 قاعات أو 3 مصورين', 'دعوة إلكترونية ومتابعة ردود الضيوف'],
      highlighted=False, active=True, sortOrder=4),
 dict(id='plan-client-vip', audience='client', targetRolesAr='عروسين VIP · تجهيز متكامل', nameAr='باقة زفاف VIP بلس',
      taglineAr='مزايا حصرية للعروسين لمتابعة الحجوزات والدعوات.', monthlyPriceEgp=149, quarterlyPriceEgp=399, annualPriceEgp=999,
      billingNoteAr='اشتراك شهري أو 3 شهور أو سنة حتى يوم الفرح',
      features=['تصميم ومشاركة دعوات إلكترونية بلا حدود', 'أولوية تنسيق الحجوزات مع القاعات والمصورين', 'مساعدة في ترشيح البدائل لموعد فرحك'],
      highlighted=True, active=True, sortOrder=5),
]
for p in PLANS:
    body = {'fields': {k: enc(v) for k, v in p.items()}}
    r = urllib.request.Request(BASE + p['id'], method='PATCH', data=json.dumps(body).encode(), headers=H)
    print(p['id'], urllib.request.urlopen(r).status)
