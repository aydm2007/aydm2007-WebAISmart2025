// Financial Dashboard - Main Analytics Interface
'use client';

import React, { useEffect, useState } from 'react';
import { getDashboardData, getCompanies, getFinancialData, type Company, type FinancialData, type Anomaly } from '../lib/api';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, BarChart3, Activity, Users, Building } from 'lucide-react';

interface DashboardData {
  companies: Company[];
  recent_data: FinancialData[];
  alerts: Anomaly[];
  market_summary: any;
}

interface KPICard {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      loadCompanyData(selectedCompany);
    }
  }, [selectedCompany, timeRange]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const companies = await getCompanies();
      setDashboardData({
        companies,
        recent_data: [],
        alerts: [],
        market_summary: {}
      });

      if (companies.length > 0) {
        setSelectedCompany(companies[0].id);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyData = async (companyId: number) => {
    try {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const data = await getFinancialData(companyId, { days });
      setFinancialData(data);
    } catch (error) {
      console.error('Error loading company data:', error);
    }
  };

  const calculateKPIs = (): KPICard[] => {
    if (financialData.length === 0) return [];

    const latest = financialData[0];
    const previous = financialData[1];

    const priceChange = previous ? 
      ((latest.close_price || 0) - (previous.close_price || 0)) / (previous.close_price || 1) * 100 : 0;

    const volumeChange = previous ? 
      ((latest.volume || 0) - (previous.volume || 0)) / (previous.volume || 1) * 100 : 0;

    const revenueChange = previous ? 
      ((latest.revenue || 0) - (previous.revenue || 0)) / (previous.revenue || 1) * 100 : 0;

    return [
      {
        title: 'سعر السهم',
        value: `${(latest.close_price || 0).toFixed(2)} ${getSelectedCompany()?.currency || 'SAR'}`,
        change: priceChange,
        icon: <DollarSign className="w-6 h-6" />,
        color: priceChange >= 0 ? 'text-green-600' : 'text-red-600'
      },
      {
        title: 'حجم التداول',
        value: formatNumber(latest.volume || 0),
        change: volumeChange,
        icon: <BarChart3 className="w-6 h-6" />,
        color: volumeChange >= 0 ? 'text-green-600' : 'text-red-600'
      },
      {
        title: 'الإيرادات',
        value: formatCurrency(latest.revenue || 0),
        change: revenueChange,
        icon: <TrendingUp className="w-6 h-6" />,
        color: revenueChange >= 0 ? 'text-green-600' : 'text-red-600'
      },
      {
        title: 'هامش الربح',
        value: `${(latest.profit_margin || 0).toFixed(1)}%`,
        change: 0,
        icon: <Activity className="w-6 h-6" />,
        color: 'text-blue-600'
      }
    ];
  };

  const getSelectedCompany = () => {
    return dashboardData?.companies.find(c => c.id === selectedCompany);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ar-SA', { 
      style: 'currency', 
      currency: getSelectedCompany()?.currency || 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const chartData = financialData.slice().reverse().map(item => ({
    date: new Date(item.date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
    price: item.close_price || 0,
    volume: item.volume || 0,
    revenue: item.revenue || 0,
    profit: item.profit || 0
  }));

  const industryData = dashboardData?.companies.reduce((acc, company) => {
    const industry = company.industry || 'غير محدد';
    acc[industry] = (acc[industry] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = industryData ? Object.entries(industryData).map(([industry, count]) => ({
    name: industry,
    value: count,
    percentage: ((count / (dashboardData?.companies.length || 1)) * 100).toFixed(1)
  })) : [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  const kpis = calculateKPIs();

  return (
    <div className="p-6 bg-gray-50 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">لوحة التحكم المالية</h1>
        <p className="text-gray-600">تحليل شامل للأداء المالي والاستثماري</p>
      </div>

      {/* Company Selector */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Building className="w-5 h-5 text-gray-600" />
          <select
            value={selectedCompany || ''}
            onChange={(e) => setSelectedCompany(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {dashboardData?.companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.name} ({company.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">الفترة الزمنية:</span>
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            {(['7d', '30d', '90d'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm font-medium transition-colors $'{
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {range === '7d' ? '7 أيام' : range === '30d' ? '30 يوم' : '90 يوم'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg bg-gray-50 ${kpi.color}`}>
                {kpi.icon}
              </div>
              <div className={`flex items-center text-sm font-medium ${kpi.color}`}>
                {kpi.change >= 0 ? (
                  <TrendingUp className="w-4 h-4 ml-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 ml-1" />
                )}
                {Math.abs(kpi.change).toFixed(1)}%
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">{kpi.title}</h3>
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Price Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">تطور سعر السهم</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="price" stroke="#3B82F6" fill="#93C5FD" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Volume Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">حجم التداول</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="volume" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue vs Profit */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">الإيرادات مقابل الأرباح</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} name="الإيرادات" />
              <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} name="الأرباح" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Industry Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">توزيع الشركات حسب القطاع</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} (${percentage}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">الشركات المتاحة</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الشركة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الرمز
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  القطاع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  العملة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dashboardData?.companies.map((company) => (
                <tr 
                  key={company.id} 
                  className={`hover:bg-gray-50 cursor-pointer ${
                    selectedCompany === company.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => setSelectedCompany(company.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{company.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{company.code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{company.industry || 'غير محدد'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{company.currency}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      company.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {company.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}