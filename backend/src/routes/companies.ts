// Companies API Routes - Financial Data Management
import express from 'express';
import { executeQuery } from '../db/database';

const router = express.Router();

// GET /api/companies - Get all companies
router.get('/', async (req, res) => {
  try {
    const companies = executeQuery(`
      SELECT id, name, code, industry, currency, market_cap, is_active, created_at
      FROM companies 
      WHERE is_active = 1
      ORDER BY name
    `);
    res.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// GET /api/companies/:id - Get specific company
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companies = executeQuery(`
      SELECT * FROM companies WHERE id = ? AND is_active = 1
    `, [id]);

    if (companies.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(companies[0]);
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// GET /api/financial-data/:companyId - Get financial data for company
router.get('/financial-data/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { days = 30, period = 'daily', start, end } = req.query;

    let query = `
      SELECT 
        id, company_id, date, period_type,
        open_price, high_price, low_price, close_price, volume,
        revenue, profit, expenses, assets, liabilities, equity,
        roi_percentage, profit_margin, debt_ratio, created_at
      FROM financial_data 
      WHERE company_id = ?
    `;

    const params: any[] = [companyId];

    if (start && end) {
      query += ` AND date BETWEEN ? AND ?`;
      params.push(start, end);
    } else if (days) {
      query += ` AND date >= date('now', '-${days} days')`;
    }

    if (period && period !== 'daily') {
      query += ` AND period_type = ?`;
      params.push(period);
    }

    query += ` ORDER BY date DESC LIMIT 200`;

    const data = executeQuery(query, params);
    res.json(data);
  } catch (error) {
    console.error('Error fetching financial data:', error);
    res.status(500).json({ error: 'Failed to fetch financial data' });
  }
});

// POST /api/financial-data/multi - Get data for multiple companies
router.post('/financial-data/multi', async (req, res) => {
  try {
    const { company_ids, days = 30 } = req.body;

    if (!company_ids || !Array.isArray(company_ids)) {
      return res.status(400).json({ error: 'company_ids array is required' });
    }

    const placeholders = company_ids.map(() => '?').join(',');
    const data = executeQuery(`
      SELECT 
        company_id, date, close_price, volume, revenue, profit
      FROM financial_data 
      WHERE company_id IN (${placeholders})
        AND date >= date('now', '-${days} days')
      ORDER BY company_id, date DESC
    `, company_ids);

    // Group by company_id
    const grouped = data.reduce((acc: any, row: any) => {
      if (!acc[row.company_id]) acc[row.company_id] = [];
      acc[row.company_id].push(row);
      return acc;
    }, {});

    res.json(grouped);
  } catch (error) {
    console.error('Error fetching multi-company data:', error);
    res.status(500).json({ error: 'Failed to fetch multi-company data' });
  }
});

// GET /api/kpis/:companyId - Get KPIs for company
router.get('/kpis/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    const latestData = executeQuery(`
      SELECT * FROM financial_data 
      WHERE company_id = ? 
      ORDER BY date DESC 
      LIMIT 2
    `, [companyId]);

    if (latestData.length === 0) {
      return res.status(404).json({ error: 'No financial data found' });
    }

    const latest = latestData[0];
    const previous = latestData[1];

    const kpis = {
      current_price: latest.close_price || 0,
      price_change: previous ? 
        ((latest.close_price - previous.close_price) / previous.close_price * 100) : 0,
      volume: latest.volume || 0,
      revenue: latest.revenue || 0,
      profit: latest.profit || 0,
      profit_margin: latest.profit_margin || 0,
      roi: latest.roi_percentage || 0,
      debt_ratio: latest.debt_ratio || 0,
      market_cap: 0, // يمكن حسابه: price * shares_outstanding
    };

    res.json(kpis);
  } catch (error) {
    console.error('Error calculating KPIs:', error);
    res.status(500).json({ error: 'Failed to calculate KPIs' });
  }
});

// GET /api/dashboard - Dashboard summary data
router.get('/dashboard', async (req, res) => {
  try {
    // Get companies
    const companies = executeQuery(`
      SELECT id, name, code, industry, currency, is_active
      FROM companies 
      WHERE is_active = 1 
      ORDER BY name
      LIMIT 10
    `);

    // Get recent data (last 7 days)
    const recent_data = executeQuery(`
      SELECT 
        fd.*, c.name as company_name, c.code as company_code
      FROM financial_data fd
      JOIN companies c ON fd.company_id = c.id
      WHERE fd.date >= date('now', '-7 days')
        AND c.is_active = 1
      ORDER BY fd.date DESC, c.name
      LIMIT 50
    `);

    // Get alerts (anomalies from last 30 days)
    const alerts = executeQuery(`
      SELECT 
        a.*, c.name as company_name, c.code as company_code
      FROM anomalies a
      JOIN companies c ON a.company_id = c.id
      WHERE a.detection_date >= date('now', '-30 days')
        AND a.is_resolved = 0
        AND c.is_active = 1
      ORDER BY a.severity DESC, a.detection_date DESC
      LIMIT 20
    `);

    // Market summary
    const market_summary = {
      total_companies: companies.length,
      active_alerts: alerts.length,
      data_points: recent_data.length,
      last_update: new Date().toISOString()
    };

    res.json({
      companies,
      recent_data,
      alerts,
      market_summary
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
