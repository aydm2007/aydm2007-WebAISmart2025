// Enhanced API Library for Smart Finance Platform
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type TokenCb = (t: string) => void;
type DoneCb = (data: any) => void;
type ErrorCb = (msg: string) => void;

// === Chat & Streaming APIs ===
export async function submitQueryStream(question: string) {
  const url = `${API}/api/chat/stream?q=${encodeURIComponent(question)}`;
  const es = new EventSource(url, { withCredentials: false });

  let tokenCb: TokenCb | null = null;
  let doneCb: DoneCb | null = null;
  let errorCb: ErrorCb | null = null;

  es.onmessage = (ev) => {
    try {
      const payload = JSON.parse(ev.data);
      if (payload?.type === 'token') {
        tokenCb?.(String(payload.data ?? ''));
      } else if (payload?.type === 'done') {
        doneCb?.(payload.data);
        es.close();
      } else if (payload?.type === 'error') {
        const msg = String(payload?.data?.message || 'Stream error');
        errorCb?.(msg);
        es.close();
      }
    } catch {
      // تجاهل الأسطر غير القابلة للتحليل
    }
  };

  es.onerror = () => {
    errorCb?.('SSE connection error');
    try { es.close(); } catch {}
  };

  return {
    onToken(cb: TokenCb) { tokenCb = cb; },
    onDone(cb: DoneCb) { doneCb = cb; },
    onError(cb: ErrorCb) { errorCb = cb; },
    cancel() { try { es.close(); } catch {} },
  };
}

// === Financial Data Types ===
export interface Company {
  id: number;
  name: string;
  code: string;
  industry: string;
  currency: string;
  market_cap?: number;
  is_active: boolean;
}

export interface FinancialData {
  id: number;
  company_id: number;
  date: string;
  period_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  open_price?: number;
  high_price?: number;
  low_price?: number;
  close_price?: number;
  volume?: number;
  revenue?: number;
  profit?: number;
  expenses?: number;
  assets?: number;
  liabilities?: number;
  equity?: number;
  roi_percentage?: number;
  profit_margin?: number;
  debt_ratio?: number;
}

export interface Forecast {
  id: number;
  company_id: number;
  forecast_date: string;
  target_date: string;
  model_type: string;
  predicted_value: number;
  confidence_lower?: number;
  confidence_upper?: number;
  accuracy_score?: number;
}

export interface Anomaly {
  id: number;
  company_id: number;
  detection_date: string;
  data_point_date: string;
  anomaly_type: 'price_spike' | 'volume_spike' | 'trend_break' | 'seasonal_deviation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  original_value: number;
  expected_value: number;
  deviation_percentage: number;
  description?: string;
  is_resolved: boolean;
}

export interface SavedAnalysis {
  id: number;
  title: string;
  query_text: string;
  results?: any;
  chart_config?: any;
  analysis_type: string;
  company_ids?: number[];
  date_range_start?: string;
  date_range_end?: string;
  created_by: string;
  is_favorite: boolean;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

// === Core Financial APIs ===

export async function getCompanies(): Promise<Company[]> {
  const response = await fetch(`${API}/api/companies`);
  if (!response.ok) throw new Error('Failed to fetch companies');
  return response.json();
}

export async function getCompany(id: number): Promise<Company> {
  const response = await fetch(`${API}/api/companies/${id}`);
  if (!response.ok) throw new Error('Failed to fetch company');
  return response.json();
}

export async function getFinancialData(
  companyId: number, 
  options: {
    days?: number;
    period?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<FinancialData[]> {
  const params = new URLSearchParams();
  if (options.days) params.set('days', options.days.toString());
  if (options.period) params.set('period', options.period);
  if (options.startDate) params.set('start', options.startDate);
  if (options.endDate) params.set('end', options.endDate);

  const response = await fetch(`${API}/api/financial-data/${companyId}?${params}`);
  if (!response.ok) throw new Error('Failed to fetch financial data');
  return response.json();
}

export async function getMultiCompanyData(companyIds: number[]): Promise<Record<number, FinancialData[]>> {
  const response = await fetch(`${API}/api/financial-data/multi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_ids: companyIds }),
  });
  if (!response.ok) throw new Error('Failed to fetch multi-company data');
  return response.json();
}

// === Analysis APIs ===

export async function generateForecast(companyId: number, options: {
  days?: number;
  model?: 'prophet' | 'arima';
}): Promise<Forecast[]> {
  const response = await fetch(`${API}/api/forecast/${companyId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!response.ok) throw new Error('Failed to generate forecast');
  return response.json();
}

export async function detectAnomalies(companyId: number): Promise<Anomaly[]> {
  const response = await fetch(`${API}/api/anomalies/${companyId}`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to detect anomalies');
  return response.json();
}

export async function getKPIs(companyId: number): Promise<any> {
  const response = await fetch(`${API}/api/kpis/${companyId}`);
  if (!response.ok) throw new Error('Failed to fetch KPIs');
  return response.json();
}

// === Saved Analyses APIs ===

export async function saveAnalysis(analysis: {
  title: string;
  query_text: string;
  results?: any;
  chart_config?: any;
  analysis_type?: string;
  company_ids?: number[];
  date_range_start?: string;
  date_range_end?: string;
  tags?: string[];
}): Promise<SavedAnalysis> {
  const response = await fetch(`${API}/api/analyses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(analysis),
  });
  if (!response.ok) throw new Error('Failed to save analysis');
  return response.json();
}

export async function getSavedAnalyses(): Promise<SavedAnalysis[]> {
  const response = await fetch(`${API}/api/analyses`);
  if (!response.ok) throw new Error('Failed to fetch saved analyses');
  return response.json();
}

export async function deleteAnalysis(id: number): Promise<void> {
  const response = await fetch(`${API}/api/analyses/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete analysis');
}

export async function toggleFavoriteAnalysis(id: number): Promise<SavedAnalysis> {
  const response = await fetch(`${API}/api/analyses/${id}/favorite`, {
    method: 'PUT',
  });
  if (!response.ok) throw new Error('Failed to toggle favorite');
  return response.json();
}

// === Dashboard APIs ===

export async function getDashboardData(): Promise<{
  companies: Company[];
  recent_data: FinancialData[];
  alerts: Anomaly[];
  market_summary: any;
}> {
  const response = await fetch(`${API}/api/dashboard`);
  if (!response.ok) throw new Error('Failed to fetch dashboard data');
  return response.json();
}

// === Export APIs ===

export async function exportToExcel(data: any, filename: string): Promise<Blob> {
  const response = await fetch(`${API}/api/export/excel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, filename }),
  });
  if (!response.ok) throw new Error('Failed to export to Excel');
  return response.blob();
}

export async function exportToPDF(data: any, filename: string): Promise<Blob> {
  const response = await fetch(`${API}/api/export/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, filename }),
  });
  if (!response.ok) throw new Error('Failed to export to PDF');
  return response.blob();
}
