// تكامل Google Gemini مع النظام المالي
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiFinancialAI {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    }
  }

  async generateFinancialSQL(question: string, schema: string): Promise<string> {
    if (!this.model) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `أنت خبير مالي ومحاسبي متخصص في تحويل الأسئلة العربية إلى استعلامات SQL دقيقة.

قاعدة البيانات المالية:
${schema}

قواعد مهمة:
1. استخدم فقط الجداول والحقول المذكورة أعلاه
2. المبيعات = document_name LIKE '%مبيعات%' 
3. المشتريات = document_name LIKE '%مشتريات%'
4. أضف LIMIT 100 دائماً
5. استخدم DATE functions للتواريخ
6. ارجع SQL فقط بدون شرح

السؤال: ${question}

SQL:`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error('فشل في الاتصال بـ Gemini API');
    }
  }

  async analyzeFinancialResults(question: string, sql: string, results: any[]): Promise<string> {
    if (!this.model) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `أنت محلل مالي خبير. حلل النتائج التالية وقدم رؤى مفيدة.

السؤال الأصلي: ${question}
الاستعلام المنفذ: ${sql}
عدد النتائج: ${results.length}

النتائج:
${JSON.stringify(results.slice(0, 5), null, 2)}

قدم تحليلاً مالياً شاملاً يتضمن:
1. ملخص النتائج
2. الاتجاهات المالية
3. التوصيات العملية
4. المؤشرات المهمة

التحليل:`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini analysis error:', error);
      return 'فشل في تحليل النتائج باستخدام Gemini';
    }
  }

  isConfigured(): boolean {
    return !!this.model;
  }
}

// إنشاء instance مشترك
export const geminiAI = new GeminiFinancialAI(process.env.GEMINI_API_KEY);
