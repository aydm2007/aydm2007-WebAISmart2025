// Enhanced Home Page - Financial Analysis Platform
'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import FinancialExamples from './components/FinancialExamples';
import { getCompanies, getFinancialData, type Company, type FinancialData } from './lib/api';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, DollarSign, Activity, MessageSquare, PieChart, Settings, AlertTriangle, Brain } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const companiesData = await getCompanies();
      setCompanies(companiesData);

      if (companiesData.length > 0) {
        const firstCompany = companiesData[0];
        setSelectedCompany(firstCompany);

        // تحميل البيانات المالية للشركة الأولى
        const finData = await getFinancialData(firstCompany.id, { days: 30 });
        setFinancialData(finData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyData = async (company: Company) => {
    try {
      setSelectedCompany(company);
      const finData = await getFinancialData(company.id, { days: 30 });
      setFinancialData(finData);
    } catch (error) {
      console.error('Error loading company data:', error);
    }
  };

  const handleExampleSelect = (question: string) => {
    // توجيه المستخدم لصفحة Chat مع السؤال المحدد
    const chatUrl = `/chat?q=${encodeURIComponent(question)}`;
    window.open(chatUrl, '_blank');
  };

  const formatCurrency = (amount: number, currency = 'SAR') => {
    return new Intl.NumberFormat('ar-SA', { 
      style: 'currency', 
      currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getKPIs = () => {
    if (financialData.length === 0) return null;

    const latest = financialData[0];
    const previous = financialData[1];

    const priceChange = previous ? 
      ((latest.close_price || 0) - (previous.close_price || 0)) / (previous.close_price || 1) * 100 : 0;

    return {
      currentPrice: latest.close_price || 0,
      priceChange,
      volume: latest.volume || 0,
      revenue: latest.revenue || 0,
      profit: latest.profit || 0,
      profitMargin: latest.profit_margin || 0
    };
  };

  const chartData = financialData.slice().reverse().slice(-14).map(item => ({
    date: new Date(item.date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
    price: item.close_price || 0,
    volume: (item.volume || 0) / 1000 // تحويل إلى آلاف
  }));

  const kpis = getKPIs();

  if (loading) {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">جاري تحميل البيانات...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 overflow-auto" dir="rtl">
        {/* Header */}
        <div className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">منصة التحليل المالي الذكية</h1>
              <p className="text-gray-600 mt-1">تحليل متقدم وتنبؤات دقيقة للأسواق المالية</p>
            </div>
            <div className="flex gap-3">
              <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <BarChart3 className="w-4 h-4" />
                لوحة التحكم الكاملة
              </Link>
              <Link href="/settings" className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Settings className="w-4 h-4" />
                الإعدادات
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Link href="/dashboard" className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">لوحة التحكم</h3>
                  <p className="text-sm text-gray-600">عرض شامل للبيانات</p>
                </div>
              </div>
            </Link>

            <Link href="/sql" className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">تحليل البيانات</h3>
                  <p className="text-sm text-gray-600">استعلامات مخصصة</p>
                </div>
              </div>
            </Link>

            <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">المساعد الذكي</h3>
                  <p className="text-sm text-gray-600">أسئلة وأجوبة</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <PieChart className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">التقارير</h3>
                  <p className="text-sm text-gray-600">تصدير وتحليل</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Company Selector */}
        <div className="px-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">اختر الشركة للتحليل</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {companies.map(company => (
                <button
                  key={company.id}
                  onClick={() => loadCompanyData(company)}
                  className={`p-3 rounded-lg border text-right transition-all ${
                    selectedCompany?.id === company.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold text-sm">{company.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{company.code}</div>
                  <div className="text-xs text-gray-500">{company.industry}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPIs و Charts */}
        {selectedCompany && kpis && (
          <div className="px-6 pb-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className={`flex items-center text-sm ${kpis.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {kpis.priceChange >= 0 ? <TrendingUp className="w-4 h-4 ml-1" /> : <TrendingDown className="w-4 h-4 ml-1" />}
                    {Math.abs(kpis.priceChange).toFixed(2)}%
                  </div>
                </div>
                <h4 className="text-sm text-gray-600">سعر السهم</h4>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(kpis.currentPrice, selectedCompany.currency)}
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <h4 className="text-sm text-gray-600">حجم التداول</h4>
                <p className="text-xl font-bold text-gray-900">
                  {(kpis.volume / 1000000).toFixed(1)}M
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <h4 className="text-sm text-gray-600">الإيرادات</h4>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(kpis.revenue, selectedCompany.currency)}
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Activity className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
                <h4 className="text-sm text-gray-600">هامش الربح</h4>
                <p className="text-xl font-bold text-gray-900">{kpis.profitMargin.toFixed(1)}%</p>
              </div>

              {/* كشف الشذوذ المالي */}
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <Link href="/chat" className="text-xs text-blue-600 hover:text-blue-800">
                    اسأل عن الشذوذ
                  </Link>
                </div>
                <h4 className="text-sm text-gray-600">كشف الشذوذ</h4>
                <p className="text-xl font-bold text-gray-900">متاح</p>
                <p className="text-xs text-gray-500 mt-1">تحليل تلقائي للأنماط الغريبة</p>
              </div>

              {/* التوصيات الذكية */}
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Brain className="w-5 h-5 text-purple-600" />
                  </div>
                  <Link href="/chat" className="text-xs text-blue-600 hover:text-blue-800">
                    احصل على توصيات
                  </Link>
                </div>
                <h4 className="text-sm text-gray-600">ذكاء اصطناعي</h4>
                <p className="text-xl font-bold text-gray-900">نشط</p>
                <p className="text-xs text-gray-500 mt-1">توصيات مالية ذكية</p>
              </div>
            </div>

            {/* الأمثلة المالية */}
            <div className="mb-6">
              <FinancialExamples onSelectExample={handleExampleSelect} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">تطور سعر السهم (آخر 14 يوم)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={chartData}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="price" stroke="#3B82F6" fill="#93C5FD" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">حجم التداول (بالآلاف)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="volume" stroke="#10B981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {!selectedCompany && (
          <div className="px-6 pb-6">
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">اختر شركة لبدء التحليل</h3>
              <p className="text-gray-600">حدد شركة من القائمة أعلاه لعرض البيانات المالية والمؤشرات</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
