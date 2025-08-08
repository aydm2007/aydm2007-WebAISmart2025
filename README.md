<<<<<<< HEAD
# WebAISmart
=======
# SmartFinanceProject with Python Analysis Microservice

## المشروع

هذا المشروع عبارة عن تطبيق مالي ذكي مُكوّن من:
- واجهة أمامية تفاعلية مبنية بـ Next.js
- خدمة خلفية بـ Node.js
- خدمة تحليل بيانات منفصلة مبنية بـ Python

## إعداد المشروع

### متطلبات النظام
- Node.js (v18+)
- Python (v3.8+)
- Git

### الخدمة الخلفية (Node.js)
1. انتقل إلى مجلد backend:
```bash
cd backend
```
2. قم بتثبيت المكتبات المطلوبة:
```bash
npm install
```
3. إعداد متغير البيئة لعنوان خدمة Python (اختياري، الافتراضي http://localhost:8000):
```bash
# على Windows
set PYTHON_SERVICE_URL=http://localhost:8000
# على Linux/Mac
export PYTHON_SERVICE_URL=http://localhost:8000
```
4. تشغيل الخادم الخلفي:
```bash
npm run dev
```

### خدمة تحليل Python
1. انتقل إلى مجلد python_analysis_service:
```bash
cd python_analysis_service
```
2. قم بتثبيت مكتبات Python المطلوبة:
```bash
pip install -r requirements.txt
```
3. تشغيل خادم FastAPI:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### الواجهة الأمامية (Next.js)
1. انتقل إلى مجلد frontend:
```bash
cd frontend
```
2. قم بتثبيت المكتبات المطلوبة:
```bash
npm install
```
3. تشغيل خادم الواجهة الأمامية:
```bash
npm run dev
```

<<<<<<< HEAD
### Usage
- Backend proxies analysis requests to Python service at `/python/forecast` and `/python/detect_anomalies`.
- Frontend displays forecast chart and integrates new analysis features.# WebAISmart
>>>>>>> 97321c4 (first commit)
=======
## الاستخدام
- الخدمة الخلفية تقوم بتمرير طلبات التحليل إلى خدمة Python عبر المسارات `/python/forecast` و `/python/detect_anomalies`
- الواجهة الأمامية تعرض رسوم بيانية للتنبؤ وتتكامل مع ميزات التحليل الجديدة

## معلومات إضافية
- تم استثناء قاعدة البيانات المحلية وملفات الإعدادات الحساسة من Git
- للمساهمة في المشروع، يرجى اتباع دليل المساهمة
- لمزيد من التفاصيل باللغة العربية، راجع RUNBOOK_AR.md

>>>>>>> ef9c5b3 (إصلاح وتحسين الوثائق)
