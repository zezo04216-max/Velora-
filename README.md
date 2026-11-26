# VÉLORA — كل تفاصيل فرحتك تبدأ من هنا

منصة عربية (RTL) لتنظيم الأفراح: قاعات، مصورين، خدمات الزفاف، حجوزات، ودعوات إلكترونية.

## تشغيل محلي

    npm install --legacy-peer-deps
    npm run dev      # خادم Express + Vite على المنفذ 3000

## بناء ونشر الواجهة

    npm run build    # الناتج في dist/
    npx firebase-tools deploy --only hosting --project velora-6f788

ملاحظة: الواجهة تعتمد على واجهة API (server.ts). الاستضافة الثابتة تنشر الواجهة فقط.
