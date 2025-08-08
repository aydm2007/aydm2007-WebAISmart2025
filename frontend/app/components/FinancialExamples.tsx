// مكون أمثلة الاستعلامات المالية
'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, Users, Package, DollarSign, BarChart3 } from 'lucide-react';

interface FinancialExample {
  category: string;
  questions: string[];
}

interface FinancialExamplesProps {
  onSelectExample: (question: string) => void;
}

export default function FinancialExamples({ onSelectExample }: FinancialExamplesProps) {
  const [examples, setExamples] = useState<FinancialExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadExamples();
  }, []);

  const loadExamples = async () => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_BASE}/api/chat/financial-examples`);
      if (response.ok) {
        const data = await response.json();
        setExamples(data);
      }
    } catch (error) {
      console.error('Error loading examples:', error);
      // أمثلة افتراضية في حالة الخطأ
      setExamples([
        {
          category: "📊 تقارير المبيعات",
          questions: [
            "كم إجمالي المبيعات لهذا الشهر؟",
            "من هم أفضل 10 عملاء من ناحية المبيعات؟",
            "ما هي أكثر الأصناف مبيعاً؟"
          ]
        },
        {
          category: "💰 التحليل المالي",
          questions: [
            "ما هو رصيد حساب البنك؟",
            "كم إجمالي الذمم المدينة؟",
            "كم إجمالي المصروفات لهذا الشهر؟"
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes('مبيعات')) return <TrendingUp className="w-5 h-5" />;
    if (category.includes('مالي')) return <DollarSign className="w-5 h-5" />;
    if (category.includes('مخزون')) return <Package className="w-5 h-5" />;
    if (category.includes('عملاء')) return <Users className="w-5 h-5" />;
    return <BarChart3 className="w-5 h-5" />;
  };

  const getCategoryColor = (category: string) => {
    if (category.includes('مبيعات')) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (category.includes('مالي')) return 'text-green-600 bg-green-50 border-green-200';
    if (category.includes('مخزون')) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (category.includes('عملاء')) return 'text-purple-600 bg-purple-50 border-purple-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">جاري تحميل الأمثلة...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4" dir="rtl">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">أمثلة استعلامات مالية</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        اختر من الأمثلة التالية أو اكتب استعلامك الخاص:
      </p>

      <div className="space-y-3">
        {examples.map((example, index) => {
          const isExpanded = expandedCategory === example.category;
          const colorClasses = getCategoryColor(example.category);

          return (
            <div key={index} className={`border rounded-lg ${colorClasses}`}>
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : example.category)}
                className="w-full p-3 text-right flex items-center justify-between hover:bg-opacity-80 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {getCategoryIcon(example.category)}
                  <span className="font-medium">{example.category}</span>
                </div>
                <span className="text-sm">
                  {isExpanded ? '▼' : '▶'}
                </span>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  {example.questions.map((question, qIndex) => (
                    <button
                      key={qIndex}
                      onClick={() => onSelectExample(question)}
                      className="w-full p-2 text-right text-sm bg-white rounded border hover:bg-gray-50 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2">
          <div className="text-blue-600 mt-0.5">💡</div>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">نصائح للاستعلام:</p>
            <ul className="text-xs space-y-1">
              <li>• استخدم أسماء واضحة للأصناف والعملاء</li>
              <li>• يمكنك السؤال عن فترات زمنية محددة</li>
              <li>• جرب الاستفسار عن التقارير والإحصائيات</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
