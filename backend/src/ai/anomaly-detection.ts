// نظام كشف الشذوذ المالي - Financial Anomaly Detection
import { executeQuery } from '../db/database';

export interface FinancialAnomaly {
  type: 'sales_spike' | 'sales_drop' | 'unusual_transaction' | 'customer_behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  value: number;
  expectedValue: number;
  deviation: number;
  date: string;
  suggestions: string[];
}

export async function detectFinancialAnomalies(): Promise<FinancialAnomaly[]> {
  const anomalies: FinancialAnomaly[] = [];

  try {
    // 1. كشف الزيادة غير المعتادة في المبيعات
    const salesSpikes = await detectSalesSpikes();
    anomalies.push(...salesSpikes);

    // 2. كشف انخفاض المبيعات المفاجئ
    const salesDrops = await detectSalesDrops();
    anomalies.push(...salesDrops);

    // 3. كشف المعاملات غير المعتادة
    const unusualTransactions = await detectUnusualTransactions();
    anomalies.push(...unusualTransactions);

    // 4. كشف سلوك العملاء الغريب
    const customerBehavior = await detectUnusualCustomerBehavior();
    anomalies.push(...customerBehavior);

  } catch (error) {
    console.error('Error in anomaly detection:', error);
  }

  return anomalies.sort((a, b) => {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}

async function detectSalesSpikes(): Promise<FinancialAnomaly[]> {
  try {
    const result = executeQuery(`
      SELECT 
        DATE(the_date) as sale_date,
        SUM(amount) as daily_sales
      FROM vewInv_ItemsMain 
      WHERE document_name LIKE '%مبيعات%'
        AND the_date >= date('now', '-30 days')
      GROUP BY DATE(the_date)
      ORDER BY sale_date DESC
      LIMIT 30
    `);

    if (result.length < 7) return [];

    const sales = result.map(r => r.daily_sales || 0);
    const avgSales = sales.reduce((a, b) => a + b, 0) / sales.length;
    const stdDev = Math.sqrt(sales.reduce((sq, n) => sq + Math.pow(n - avgSales, 2), 0) / sales.length);

    const anomalies: FinancialAnomaly[] = [];

    result.forEach(row => {
      const dailySales = row.daily_sales || 0;
      const deviation = Math.abs(dailySales - avgSales) / stdDev;

      if (deviation > 2 && dailySales > avgSales) {
        anomalies.push({
          type: 'sales_spike',
          severity: deviation > 3 ? 'critical' : 'high',
          description: `ارتفاع غير معتاد في المبيعات اليومية`,
          value: dailySales,
          expectedValue: avgSales,
          deviation: ((dailySales - avgSales) / avgSales) * 100,
          date: row.sale_date,
          suggestions: [
            'تحقق من أسباب الارتفاع المفاجئ',
            'راجع العروض والحملات التسويقية',
            'تأكد من صحة البيانات المدخلة'
          ]
        });
      }
    });

    return anomalies;
  } catch (error) {
    console.error('Error detecting sales spikes:', error);
    return [];
  }
}

async function detectSalesDrops(): Promise<FinancialAnomaly[]> {
  try {
    const result = executeQuery(`
      SELECT 
        DATE(the_date) as sale_date,
        SUM(amount) as daily_sales
      FROM vewInv_ItemsMain 
      WHERE document_name LIKE '%مبيعات%'
        AND the_date >= date('now', '-14 days')
      GROUP BY DATE(the_date)
      ORDER BY sale_date DESC
      LIMIT 14
    `);

    if (result.length < 5) return [];

    const recentSales = result.slice(0, 3).map(r => r.daily_sales || 0);
    const previousSales = result.slice(3).map(r => r.daily_sales || 0);

    const recentAvg = recentSales.reduce((a, b) => a + b, 0) / recentSales.length;
    const previousAvg = previousSales.reduce((a, b) => a + b, 0) / previousSales.length;

    const dropPercentage = ((previousAvg - recentAvg) / previousAvg) * 100;

    if (dropPercentage > 20) {
      return [{
        type: 'sales_drop',
        severity: dropPercentage > 50 ? 'critical' : dropPercentage > 35 ? 'high' : 'medium',
        description: `انخفاض كبير في المبيعات خلال الأيام الأخيرة`,
        value: recentAvg,
        expectedValue: previousAvg,
        deviation: -dropPercentage,
        date: result[0].sale_date,
        suggestions: [
          'راجع استراتيجية التسويق',
          'تحقق من توفر الأصناف المطلوبة',
          'تواصل مع العملاء الرئيسيين',
          'راجع أسعار المنافسين'
        ]
      }];
    }

    return [];
  } catch (error) {
    console.error('Error detecting sales drops:', error);
    return [];
  }
}

async function detectUnusualTransactions(): Promise<FinancialAnomaly[]> {
  try {
    const result = executeQuery(`
      SELECT 
        amount,
        client_name,
        item_name,
        the_date
      FROM vewInv_ItemsMain 
      WHERE document_name LIKE '%مبيعات%'
        AND the_date >= date('now', '-7 days')
      ORDER BY amount DESC
      LIMIT 100
    `);

    if (result.length < 10) return [];

    const amounts = result.map(r => r.amount || 0);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sq, n) => sq + Math.pow(n - avgAmount, 2), 0) / amounts.length);

    const anomalies: FinancialAnomaly[] = [];

    result.forEach(row => {
      const amount = row.amount || 0;
      const deviation = Math.abs(amount - avgAmount) / stdDev;

      if (deviation > 2.5 && amount > avgAmount) {
        anomalies.push({
          type: 'unusual_transaction',
          severity: deviation > 4 ? 'high' : 'medium',
          description: `معاملة مالية غير اعتيادية - ${row.client_name}`,
          value: amount,
          expectedValue: avgAmount,
          deviation: ((amount - avgAmount) / avgAmount) * 100,
          date: row.the_date,
          suggestions: [
            'تحقق من صحة المعاملة',
            'راجع تفاصيل الصفقة مع العميل',
            'تأكد من عدم وجود أخطاء في الفاتورة'
          ]
        });
      }
    });

    return anomalies.slice(0, 5); // أهم 5 معاملات فقط
  } catch (error) {
    console.error('Error detecting unusual transactions:', error);
    return [];
  }
}

async function detectUnusualCustomerBehavior(): Promise<FinancialAnomaly[]> {
  try {
    const result = executeQuery(`
      SELECT 
        client_name,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount,
        MAX(the_date) as last_transaction
      FROM vewInv_ItemsMain 
      WHERE document_name LIKE '%مبيعات%'
        AND the_date >= date('now', '-30 days')
      GROUP BY client_id, client_name
      HAVING transaction_count > 1
      ORDER BY total_amount DESC
      LIMIT 50
    `);

    if (result.length < 5) return [];

    const totalAmounts = result.map(r => r.total_amount || 0);
    const avgTotalAmount = totalAmounts.reduce((a, b) => a + b, 0) / totalAmounts.length;

    const anomalies: FinancialAnomaly[] = [];

    result.forEach(row => {
      const clientTotal = row.total_amount || 0;
      const transactionCount = row.transaction_count || 0;

      // عميل ينفق أكثر من المعتاد
      if (clientTotal > avgTotalAmount * 3) {
        anomalies.push({
          type: 'customer_behavior',
          severity: clientTotal > avgTotalAmount * 5 ? 'high' : 'medium',
          description: `نشاط شراء مكثف من العميل: ${row.client_name}`,
          value: clientTotal,
          expectedValue: avgTotalAmount,
          deviation: ((clientTotal - avgTotalAmount) / avgTotalAmount) * 100,
          date: row.last_transaction,
          suggestions: [
            'تواصل مع العميل لتقديم عروض خاصة',
            'راجع إمكانية تقديم خصومات الجملة',
            'تأكد من رضا العميل واستمرارية التعامل'
          ]
        });
      }

      // عميل لديه معاملات متكررة جداً
      if (transactionCount > 15) {
        anomalies.push({
          type: 'customer_behavior',
          severity: 'low',
          description: `عميل بمعاملات متكررة: ${row.client_name}`,
          value: transactionCount,
          expectedValue: 5,
          deviation: ((transactionCount - 5) / 5) * 100,
          date: row.last_transaction,
          suggestions: [
            'اعتبر العميل من الفئة VIP',
            'قدم برنامج ولاء خاص',
            'راجع إمكانية عقد شراكة طويلة المدى'
          ]
        });
      }
    });

    return anomalies.slice(0, 3);
  } catch (error) {
    console.error('Error detecting customer behavior:', error);
    return [];
  }
}

// دالة لإنشاء تقرير شذوذ شامل
export async function generateAnomalyReport(): Promise<string> {
  const anomalies = await detectFinancialAnomalies();

  if (anomalies.length === 0) {
    return '✅ لا توجد شذوذات مالية مكتشفة. النظام يعمل ضمن المعدلات الطبيعية.';
  }

  let report = `🚨 **تقرير كشف الشذوذ المالي**

`;
  report += `تم اكتشاف ${anomalies.length} حالة شذوذ:

`;

  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
  const highCount = anomalies.filter(a => a.severity === 'high').length;

  if (criticalCount > 0) {
    report += `🔴 **${criticalCount} حالة حرجة**
`;
  }
  if (highCount > 0) {
    report += `🟠 **${highCount} حالة عالية الأهمية**
`;
  }

  report += `
### التفاصيل:

`;

  anomalies.slice(0, 5).forEach((anomaly, index) => {
    const severityIcon = {
      critical: '🔴',
      high: '🟠', 
      medium: '🟡',
      low: '🔵'
    }[anomaly.severity];

    report += `${index + 1}. ${severityIcon} **${anomaly.description}**
`;
    report += `   - القيمة: ${anomaly.value.toLocaleString('ar-SA')}
`;
    report += `   - المتوقع: ${anomaly.expectedValue.toLocaleString('ar-SA')}
`;
    report += `   - الانحراف: ${anomaly.deviation.toFixed(1)}%
`;
    report += `   - التاريخ: ${anomaly.date}
`;

    if (anomaly.suggestions.length > 0) {
      report += `   - **التوصيات:**
`;
      anomaly.suggestions.forEach(suggestion => {
        report += `     • ${suggestion}
`;
      });
    }
    report += `
`;
  });

  return report;
}
