'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '../lib/api';

const ApexCharts = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function ForecastChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchForecast() {
      // Mock sample data, in real case fetch from backend API
      const res = await api.post('/python/forecast', {
        ds: ['2024-07-01', '2024-07-02', '2024-07-03', '2024-07-04', '2024-07-05'],
        y: [100, 120, 130, 125, 140],
      });
      setData(res.data);
      setLoading(false);
    }
    fetchForecast();
  }, []);

  if (loading) return <p>جاري تحميل التنبؤ...</p>;

  const series = [{
    name: 'القيمة المتوقعة',
    data: data.map(d => d.yhat)
  }];

  const options = {
    chart: { id: 'forecast', toolbar: { show: true } },
    xaxis: { categories: data.map(d => d.ds) },
    tooltip: { enabled: true },
  };

  return <ApexCharts options={options} series={series} type="line" height={320} />;
}
