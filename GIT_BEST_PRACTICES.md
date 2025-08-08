# أفضل الممارسات لإدارة مستودع SmartFinance

## 📋 نظرة عامة
هذا الدليل يوضح أفضل الممارسات للحفاظ على حجم مستودع Git صغير وإدارة فعالة للملفات.

## 🚫 الملفات التي يجب تجنب رفعها إلى Git

### 1. ملفات البناء والتجميع
- `frontend/.next/` - ملفات Next.js المجمعة
- `node_modules/` - حزم Node.js
- `dist/` و `build/` - مجلدات البناء
- `*.log` - ملفات السجلات

### 2. البيئات الافتراضية والتبعيات
- `python_analysis_service/.venv/` - البيئة الافتراضية لـ Python
- `venv/` و `.venv/` - بيئات Python الافتراضية
- `__pycache__/` - ملفات Python المخزنة مؤقتاً

### 3. قواعد البيانات والملفات الحساسة
- `backend/local_database.db` - قاعدة البيانات المحلية
- `.env` و `.env.local` - متغيرات البيئة
- ملفات المفاتيح والشهادات

### 4. ملفات النماذج والذكاء الاصطناعي
- `*.h5`, `*.pkl`, `*.model` - نماذج ML
- `*.bin`, `*.weights` - أوزان النماذج
- `models/` و `checkpoints/` - مجلدات النماذج

## ✅ الحلول المقترحة

### 1. تنظيف المستودع الحالي
```bash
# إزالة ملفات .next من التتبع
git rm -r --cached frontend/.next/

# إزالة قاعدة البيانات المحلية
git rm --cached backend/local_database.db

# تحديث .gitignore وحفظ التغييرات
git add .gitignore
git commit -m "تحديث .gitignore وإزالة الملفات غير الضرورية"
```

### 2. إعداد البيئة المحلية
```bash
# إعداد البيئة الافتراضية لـ Python
cd python_analysis_service
python -m venv .venv
source .venv/bin/activate  # على Linux/Mac
# أو
.venv\Scripts\activate  # على Windows

# تثبيت التبعيات
pip install -r requirements.txt

# إعداد Frontend
cd ../frontend
npm install
npm run build
```

### 3. استخدام Git LFS للملفات الكبيرة
```bash
# تثبيت Git LFS
git lfs install

# تتبع أنواع الملفات الكبيرة
git lfs track "*.model"
git lfs track "*.h5"
git lfs track "*.bin"

# إضافة ملف .gitattributes
git add .gitattributes
```

## 🔧 أوامر التنظيف المفيدة

### تنظيف ملفات غير المتتبعة
```bash
# عرض الملفات التي ستحذف
git clean -n

# حذف الملفات غير المتتبعة
git clean -f

# حذف المجلدات أيضاً
git clean -fd
```

### تحسين حجم المستودع
```bash
# ضغط المستودع
git gc --aggressive

# تنظيف المراجع
git prune

# فحص حجم المستودع
git count-objects -vH
```

## 📊 مراقبة حجم المستودع

### فحص الملفات الكبيرة
```bash
# عرض أكبر 10 ملفات في المستودع
git ls-files | xargs ls -la | sort -k5 -rn | head -10

# فحص حجم المجلدات
du -sh * | sort -rh
```

### تتبع التغييرات في الحجم
```bash
# عرض إحصائيات المستودع
git log --oneline --stat | head -20
```

## 🚀 التوصيات للمستقبل

1. **استخدم pre-commit hooks** لفحص الملفات قبل الالتزام
2. **راجع .gitignore بانتظام** وحدّثه حسب الحاجة
3. **استخدم CI/CD** لأتمتة عمليات البناء
4. **فصل البيانات الكبيرة** إلى مستودعات منفصلة
5. **استخدم Docker** لتوحيد البيئات بدلاً من رفع التبعيات

## 📝 ملاحظات مهمة

- **لا ترفع أبداً** ملفات تحتوي على كلمات مرور أو مفاتيح API
- **استخدم متغيرات البيئة** للإعدادات الحساسة
- **وثّق التبعيات** في ملفات requirements.txt و package.json
- **اختبر .gitignore** قبل الالتزام بتغييرات كبيرة

---

بتطبيق هذه الممارسات، ستحافظ على مستودع نظيف وسريع التحميل! 🎯
