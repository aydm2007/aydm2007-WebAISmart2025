# SmartFinanceProject — Patch Notes (One-Batch Fix, no Docker Compose)

## How to Run (3 terminals)
1) **Python analysis service**
   ```bash
   cd python_analysis_service
   python -m venv .venv && . .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```
2) **Backend (Node/TypeScript)**
   ```bash
   cd backend
   cp .env.example .env
   npm i
   npm run dev
   ```
3) **Frontend (Next.js)**
   ```bash
   cd frontend
   cp .env.example .env.local
   npm i
   npm run dev
   # open http://localhost:3000
   ```

## Changes in this patch
- Frontend: added `app/components/ui/button.tsx`, unified API helper and SSE in `app/lib/api.ts`, wrapped app with `ToastProvider`.
- Frontend: completed `package.json` with all required deps and scripts.
- Backend: completed `package.json`, added `helmet`, `express-rate-limit`, `dotenv`, `healthz`, controlled CORS, and safer JSON body limit.
- Added `.env.example` for **frontend** and **backend**.
- No Docker/Compose as requested.

## Round-2 Additions (No Compose)
- تبويبات تفاصيل النتائج: ملخص/بيانات/SQL + بطاقات إحصائية.
- Structured Logging في الـBackend مع requestId.
- Fallback ARIMA في خدمة Python إذا فشل Prophet.

## Round-4 Additions (SQL Guard + Tests)
- **SQL Guard** قبل التنفيذ (منع DDL/DML، منع `;`، التحقق من وجود الجداول، السماح بـ `SELECT` فقط).
- دمج الحراسة في: `/api/sql/safe` وفي مسار توليد SQL داخل `orchestration.ts`.
- **Jest Tests** أساسية: `npm run test` في مجلد backend.

## Round-5 Additions (Toward 95+)
- **App Factory** (`src/app.ts`) لتسهيل اختبارات التكامل دون الاستماع على منفذ.
- تحسين **prompts** لتوليد SQL آمن (SQLite) وتلخيص منظم.
- **اختبارات تكامل** عبر `supertest`: `/api/meta/tables` و`/api/sql/safe`.
- **صفحة أخطاء موحدة** في الواجهة (`app/error.tsx`) مع خيارات إعادة التحميل/المحاولة.
- إضافة ترويسة `x-request-id` في جميع الاستجابات لسهولة تتبع الأخطاء.

## Round-6 Additions (E2E + Export Excel + LLM fallback)
- **/export/table-excel**: تصدير البيانات الجدولية إلى Excel مباشرًا.
- زر **تصدير Excel** في تبويب "عرض البيانات".
- **OPENAI_MOCK=1** لتشغيل المشروع/الاختبارات دون مفاتيح LLM (SQL/ملخص/أنماط/توصيات تجريبية).
- **safeLLM**: تغليف استدعاءات LLM بفولباك صامت يضمن الاستمرارية.
- **اختبارات تكامل إضافية** لمسار التصدير.

## Round-7 Additions (Toward 99+)
- **/export/table-pdf**: تصدير البيانات الجدولية إلى PDF (تجزئة تلقائية للسطور وصفحات عند الحاجة).
- زر **تصدير PDF** في تبويب "عرض البيانات".
- **ErrorBanner** في الواجهة لشرح أسباب الحجب (SQL Guard) واقتراحات صياغة السؤال.
- **اختبار SSE E2E** يضمن وصول أحداث token/done.

## Round-8 Additions (E2E Full Flow)
- **اختبار E2E كامل** يبدأ من بث SSE (`/api/chat/stream`) للحصول على `analysisId` ثم:
  1) **جلب التحليل** عبر `GET /api/analysis/:id`
  2) **تصدير Excel** للصفوف `POST /export/table-excel`
  3) **تصدير PDF** للصفوف `POST /export/table-pdf`
- التشغيل: `cd backend && npm run test`

## Round-9 Additions (Visual Regression + CI)
- **Playwright Visual Tests** على صفحة ثابتة `/visual-test` لضمان الاستقرار البصري (لقطات قياسية).
- **أوامر**: `cd frontend && npm run test:vr`
- **تكامل GitHub Actions** (`.github/workflows/ci.yml`):
  - Job: `backend-tests` (OPENAI_MOCK=1) لتشغيل اختبارات الـJest والتكامل.
  - Job: `frontend-visual` لتشغيل Playwright (تنصيب المتصفحات وتشغيل اللقطات).

## Round-10 Additions (Lint/Build CI + Vercel Preview)
- **Lint & Build CI**: Workflow مستقل (`.github/workflows/lint_build.yml`) يُشغّل:
  - `backend`: ESLint + build (tsc)
  - `frontend`: next lint + build
- **Vercel Preview**: Workflow (`.github/workflows/vercel_preview.yml`) ينشر تلقائيًا نسخة Preview للواجهة على كل Pull Request.
  - تحتاج إضافة الأسرار في GitHub repo:  
    - `VERCEL_TOKEN` — من حساب Vercel  
    - `VERCEL_ORG_ID` — معرّف المؤسسة  
    - `VERCEL_PROJECT_ID` — معرّف المشروع
  - بعد ضبط الأسرار، سيظهر لك رابط الـPreview في تبويب الـActions لكل PR.

## Round-11 Additions (Production Deploy)
- **Frontend — Vercel Production** (`.github/workflows/vercel_production.yml`):
  - يعمل تلقائيًا عند الدفع إلى `main/master`.
  - المتطلبات (Secrets):
    - `VERCEL_TOKEN`، `VERCEL_ORG_ID`، `VERCEL_PROJECT_ID`
  - **مهم**: اضبط المتغير `NEXT_PUBLIC_API_URL` في إعدادات مشروع Vercel ليشير إلى عنوان الـBackend الإنتاجي.

- **Backend — Render Deploy Hook** (`.github/workflows/backend_render_production.yml`):
  - يرسل طلب POST إلى Hook خدمة Render عند الدفع إلى `main/master`.
  - المتطلبات (Secrets):
    - `RENDER_DEPLOY_HOOK` — رابط الـDeploy Hook لخدمة الـBackend على Render.
  - إذا لم يتم تعريف السر، يتجاوز خطوة النشر بدون فشل الـWorkflow.

> ملاحظة: لم نستخدم Docker هنا احتراما لطلبك السابق (بدون Compose). إذا رغبت لاحقًا بالنشر على Fly.io أو Kubernetes، أضيف لك قوالب جاهزة مع خطوات مفصلة.
