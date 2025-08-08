# دليل تشغيل ونشر SmartFinance — خطوة بخطوة (AR)

> هذه الوثيقة تلخّص الإعداد المحلي، الاختبارات، التشغيل، ثم النشر إلى بيئة الإنتاج للواجهة (Vercel) والخلفية (Render).

## 1) المتطلبات الأساسية
- Node.js 20+ و npm
- Python 3.10+
- SQLite 3 (اختياري للتعامل اليدوي مع القاعدة)
- حساب Vercel (لواجهة Frontend)
- حساب Render (لخدمة Backend) — أو أي مزود بديل مع نشر عبر Hook

## 2) خدمة التحليلات (Python) — تشغيل محلي
```bash
cd python_analysis_service
python -m venv .venv && . .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

> **ملاحظة:** الخدمة تستخدم Prophet، وإن تعذّر البناء سيتم **fallback إلى ARIMA** تلقائيًا.

## 3) الخلفية (Backend — Express/TS)
### 3.1 الإعداد والتشغيل
```bash
cd backend
cp .env.example .env
# اختيارياً لتجربة بدون LLM:
# echo OPENAI_MOCK=1 >> .env
npm i
npm run dev
# صحّة الخدمة: http://localhost:5000/healthz
```

### 3.2 الأوامر المهمة
- **اختبارات**: `npm run test`
- **Lint**: `npm run lint`
- **بناء**: `npm run build`  ← يُنتج `dist/`
- **متغيرات البيئة** الأهم:
  - `OPENAI_API_KEY`، `OPENAI_MODEL`
  - `PYTHON_SERVICE_URL` (افتراضي: `http://localhost:8000`)
  - `DATABASE_PATH` (افتراضي: `./local_database.db`)
  - `CORS_ORIGINS` (افتراضي: `http://localhost:3000`)
  - `RATE_LIMIT_MAX` (افتراضي: `120`)
  - `OPENAI_MOCK=1` (وضع تجريبي لا يحتاج مفتاح LLM)

### 3.3 نقاط النهاية الأساسية
- `/api/chat` و `/api/chat/stream` (SSE)
- `/api/analysis/:id`
- `/api/sql/safe`
- `/api/meta/tables`, `/api/meta/schema_desc`
- `/export/table-excel`, `/export/table-pdf`, بالإضافة إلى مسارات التصدير الأساسية

## 4) الواجهة (Frontend — Next.js 14)
### 4.1 الإعداد والتشغيل
```bash
cd frontend
cp .env.example .env.local
# عرّف عنوان الـBackend:
# echo NEXT_PUBLIC_API_URL=http://localhost:5000 >> .env.local
npm i
npm run dev
# http://localhost:3000
```

### 4.2 الاختبارات
- **اختبارات الانحدار البصري**: `npm run test:vr`
  - أول مرة محليًا: حدّث الـbaseline إن لزم `npx playwright test --update-snapshots`

## 5) CI (فحوصات تلقائية على GitHub Actions)
- `.github/workflows/ci.yml`: اختبارات Backend + الاختبار البصري للواجهة
- `.github/workflows/lint_build.yml`: Lint + Build للواجهة والخلفية
- `.github/workflows/vercel_preview.yml`: نشر **Preview** للواجهة على كل PR
- `.github/workflows/vercel_production.yml`: نشر **Production** للواجهة عند الدفع إلى `main/master`
- `.github/workflows/backend_render_production.yml`: استدعاء **Render Deploy Hook** للخلفية عند الدفع إلى `main/master`

## 6) إعداد أسرار GitHub للـCI/CD
أضف الأسرار التالية في **Settings → Secrets → Actions** على مستودع GitHub:
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (فرونت)
- `RENDER_DEPLOY_HOOK` (باك، اختياري)

## 7) النشر (Production)
### 7.1 الواجهة — Vercel
- يشتغل تلقائيًا عند كل دفع لـ `main/master` عبر `vercel_production.yml`
- اضبط متغيرات بيئة المشروع في Vercel:
  - `NEXT_PUBLIC_API_URL` → عنوان الـBackend الإنتاجي (مثلاً: `https://api.mycompany.com`)

### 7.2 الخلفية — Render
- أضف `RENDER_DEPLOY_HOOK` في Secrets
- كل دفع لـ `main/master` سيستدعي الـhook ويُطلق نشرًا جديدًا

## 8) استكشاف الأخطاء وإصلاحها
- **SQL Guard** يمنع غير SELECT، يمنع `;`، ويتحقق من أسماء الجداول. عدّل صياغة السؤال.
- في حال أخطاء LLM: تظهر لافتة توضيحية في الواجهة (ErrorBanner)، وأحيانًا يتم عرض **عينة بيانات بديلة** تلقائيًا.
- راقب ترويسة `x-request-id` وصحيفة اللوغ JSON في الـBackend لتتبع أي خطأ.

## 9) هيكلة المشروع — مراجع سريعة
- `backend/src/ai/orchestration.ts` — منطق التوليد والتحليل + SSE + MOCK
- `backend/src/db/sql_guard.ts` — حراسة SQL
- `backend/src/routes/*.ts` — المسارات (chat/sql/meta/export/...)
- `frontend/app/components/AnalysisDetail.tsx` — شاشة التفاصيل (Tabs + Export)
- `frontend/app/error.tsx` — صفحة أخطاء موحّدة
- `python_analysis_service/main.py` — تنبؤ Prophet/ARIMA
- `.github/workflows/*.yml` — CI/CD

> **مبروك** — النسخة جاهزة إنتاجياً مع CI/CD واختبارات وتصدير متعدد الصيغ. تأكد من ضبط الأسرار وعناوين الخدمات قبل نشر الإنتاج.
