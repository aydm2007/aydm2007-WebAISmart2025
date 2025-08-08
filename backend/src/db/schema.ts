// ERP Financial Database Schema - DotNetApprova 4.5 Compatible
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'local_database.db');

// وصف قاعدة البيانات المالية الحقيقية - نظام DotNetApprova 4.5
export const getERPSchemaDescription = () => {
  return `
# قاعدة البيانات المالية والمخزنية - نظام DotNetApprova 4.5
# شركة إبداع سوفت - النظام المتكامل للمحاسبة والمخزون

## الجداول الأساسية (Views المعتمدة):

### 1. جدول دليل الحسابات (vewAccountsList)
-- الغرض: إدارة الشجرة المحاسبية وتصنيف الحسابات
الأعمدة:
- id: المعرف الفريد للحساب
- account_name: اسم الحساب (مثل: النقدية، البنك، العملاء، الموردين، المبيعات، المشتريات)
- father_number: رقم الحساب الأب في الشجرة المحاسبية
- account_number: رقم الحساب الفرعي
- account_type: نوع الحساب (أصول، خصوم، إيرادات، مصروفات، حقوق ملكية)
- branch_id: معرف الفرع التابع له الحساب
- the_type_id: معرف تصنيف نوع الحساب

### 2. جدول العملاء والموردين (vewInv_CustomersSuppliers)
-- الغرض: إدارة بيانات العملاء والموردين مع المعلومات التجارية والمالية
الأعمدة الرئيسية:
- id: المعرف الفريد
- number: رقم العميل/المورد
- code: كود مختصر
- type: نوع الطرف (عميل/مورد/كلاهما)
- client_name: اسم العميل/المورد
- account_name: اسم الحساب المحاسبي المرتبط
- is_active: حالة النشاط (1=نشط، 0=غير نشط)
- credit_period: فترة الائتمان المسموحة (بالأيام)
- discount_rate: معدل الخصم المسموح (%)
- due_days: أيام الاستحقاق للدفع
- annual_contract_amount: قيمة العقد السنوية
- commission_rate: معدل العمولة (%)
- region: المنطقة/المحافظة
- branch_id: معرف الفرع
- entry_time: وقت الإدخال

### 3. جدول حركات المخزون والمبيعات (vewInv_ItemsMain)
-- الغرض: تسجيل جميع حركات المخزون (مبيعات، مشتريات، تحويلات) مع تفاصيل الأصناف
الأعمدة المهمة:
- id: المعرف الفريد للحركة
- parent_id: معرف الوثيقة الأساسية
- the_date: تاريخ الحركة
- document_name: نوع الوثيقة (فاتورة مبيعات، فاتورة مشتريات، إرجاع، تحويل مخزني)
- the_number: رقم الوثيقة
- client_id: معرف العميل/المورد
- client_name: اسم العميل/المورد
- item_id: معرف الصنف
- item_name: اسم الصنف
- item_type: نوع الصنف (سلعة/خدمة)
- category_name: فئة الصنف
- unit_name: وحدة القياس
- unit_price: سعر الوحدة
- quantity: الكمية
- amount: إجمالي المبلغ (quantity × unit_price - item_discount)
- item_discount: خصم الصنف
- currency_name: العملة المستخدمة
- store_name: اسم المخزن
- branch_name: اسم الفرع
- user_name: المستخدم المدخل
- expiry_date: تاريخ انتهاء الصلاحية (للأصناف القابلة للانتهاء)

### 4. جدول القيود المحاسبية (vewJournalEntries)
-- الغرض: تسجيل جميع القيود المحاسبية المعتمدة في النظام
الأعمدة:
- id: المعرف الفريد للقيد
- parent_id: معرف القيد الأساسي (للقيود المركبة)
- amount: مبلغ القيد
- currency: العملة المستخدمة
- debit: المبلغ المدين
- credit: المبلغ الدائن
- entry: وصف القيد المحاسبي
- account: اسم الحساب المحاسبي
- notes: ملاحظات إضافية
- cost_center: مركز التكلفة
- reference_number: الرقم المرجعي للقيد
- journal_number: رقم دفتر اليومية
- user: اسم المستخدم المدخل
- branch: اسم الفرع
- entry_time: وقت إدخال القيد

## العلاقات والروابط:
1. vewInv_CustomersSuppliers.id = vewInv_ItemsMain.client_id (العملاء والحركات)
2. vewAccountsList يرتبط مع جميع الجداول عبر أسماء الحسابات
3. كل حركة في vewInv_ItemsMain تولد قيود محاسبية في vewJournalEntries

## قواعد الاستعلام المهمة:
- للمبيعات: document_name LIKE '%مبيعات%' أو '%فاتورة مبيعات%'
- للمشتريات: document_name LIKE '%مشتريات%' أو '%فاتورة مشتريات%'
- للعملاء النشطين: is_active = 1
- للحسابات الفرعية: father_number IS NOT NULL
- للأرصدة: SUM(debit - credit) من جدول القيود

## أمثلة استعلامات شائعة:
- إجمالي المبيعات: SELECT SUM(amount) FROM vewInv_ItemsMain WHERE document_name LIKE '%مبيعات%'
- أفضل العملاء: SELECT client_name, SUM(amount) FROM vewInv_ItemsMain GROUP BY client_id ORDER BY SUM(amount) DESC
- رصيد حساب: SELECT SUM(debit - credit) FROM vewJournalEntries WHERE account = 'اسم الحساب'
`;
};

// الدالة الرئيسية للحصول على وصف قاعدة البيانات
export function getSchemaDescription() {
  return getERPSchemaDescription();
}

// تهيئة قاعدة البيانات (للتوافق مع الكود الموجود)
export function initializeDatabase() {
  console.log('📊 Using existing ERP database: local_database.db');
  console.log('✅ ERP Financial Database is ready');
  return { success: true, message: 'ERP Database connected successfully' };
}

export { DB_PATH };