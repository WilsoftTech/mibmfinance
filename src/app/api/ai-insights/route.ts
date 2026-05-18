import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  let requestBody: { type?: string } = {}

  try {
    requestBody = await request.json()
    const { type = 'general' } = requestBody

    // Fetch financial data for AI analysis
    const totalStudents = await db.student.count({ where: { status: 'active' } })
    const totalPayments = await db.payment.aggregate({ _sum: { amount: true } })
    const totalExpenses = await db.expense.aggregate({ _sum: { amount: true }, where: { status: 'approved' } })

    const totalRevenue = totalPayments._sum.amount || 0
    const totalExpenseAmount = totalExpenses._sum.amount || 0
    const netBalance = totalRevenue - totalExpenseAmount

    const now = new Date()
    const paymentsThisMonth = await db.payment.aggregate({
      _sum: { amount: true },
      where: { receivedAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
    })

    const expensesThisMonth = await db.expense.aggregate({
      _sum: { amount: true },
      where: { date: { gte: new Date(now.getFullYear(), now.getMonth(), 1) }, status: 'approved' },
    })

    const expenseByCategory = await db.expense.groupBy({
      by: ['category'],
      _sum: { amount: true },
      _count: true,
      where: { status: 'approved' },
    })

    const paymentsByMethod = await db.payment.groupBy({
      by: ['paymentMethod'],
      _sum: { amount: true },
      _count: true,
    })

    const students = await db.student.findMany({
      where: { status: 'active' },
      include: { course: true, payments: true },
    })

    const outstandingBalances = students.map(s => ({
      name: `${s.firstName} ${s.lastName}`,
      course: s.course?.name || 'Unknown',
      totalFees: s.course?.tuitionFee || 0,
      totalPaid: s.payments.reduce((sum, p) => sum + p.amount, 0),
      balance: (s.course?.tuitionFee || 0) - s.payments.reduce((sum, p) => sum + p.amount, 0),
    })).filter(s => s.balance > 0)

    const totalOutstanding = outstandingBalances.reduce((sum, s) => sum + s.balance, 0)
    const collectionRate = totalRevenue / (totalRevenue + totalOutstanding) * 100

    const financialSummary = {
      institution: 'Mitooma Institute of Business and Management (MIBAM)',
      location: 'Western Uganda',
      period: 'Academic Year 2024/2025',
      totalActiveStudents: totalStudents,
      totalRevenue,
      totalExpenses: totalExpenseAmount,
      netBalance,
      revenueThisMonth: paymentsThisMonth._sum.amount || 0,
      expensesThisMonth: expensesThisMonth._sum.amount || 0,
      collectionRate: Math.round(collectionRate * 10) / 10,
      totalOutstanding,
      studentsWithBalances: outstandingBalances.length,
      expenseCategories: expenseByCategory.map(e => ({
        category: e.category,
        total: e._sum.amount,
        count: e._count,
      })),
      paymentMethods: paymentsByMethod.map(p => ({
        method: p.paymentMethod,
        total: p._sum.amount,
        count: p._count,
      })),
      topOutstanding: outstandingBalances.sort((a, b) => b.balance - a.balance).slice(0, 5),
    }

    const prompts: Record<string, string> = {
      general: `Analyze the financial data for this Ugandan educational institution and provide:
1. A brief financial health assessment (2-3 sentences)
2. Three key observations about their financial situation
3. Two specific recommendations for improving financial management
4. One risk factor they should monitor

Format your response clearly with headers and bullet points. Keep it concise and actionable.`,
      expenses: `Analyze the expense patterns for this Ugandan educational institution:
1. Which expense categories are consuming the most resources?
2. Are there any concerning trends in expense distribution?
3. Suggest 2-3 specific ways to optimize expenses without compromising quality
4. How does their expense structure compare to typical Ugandan educational institutions?

Format with clear headers and bullet points. Be specific with UGX amounts.`,
      revenue: `Analyze the revenue and collection patterns:
1. What is the collection rate telling us about fee compliance?
2. What payment method trends do you observe?
3. How can they improve fee collection rates?
4. Suggest strategies for reducing outstanding balances

Be specific and actionable. Reference UGX amounts.`,
      forecast: `Based on the current financial data, provide a brief forecast:
1. Revenue projection for next quarter
2. Key financial risks ahead
3. Recommended cash reserve levels
4. Budget priorities for the next academic term

Be specific and reference the data provided. Use UGX currency.`,
    }

    const prompt = prompts[type] || prompts.general

    // Use z-ai-web-dev-sdk for AI insights
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: 'You are a financial analyst specializing in East African educational institutions. You provide concise, actionable insights based on financial data. Use Ugandan Shillings (UGX) for all monetary references. Be specific and practical in your recommendations. Keep responses under 500 words.',
        },
        {
          role: 'user',
          content: `${prompt}\n\nFinancial Data:\n${JSON.stringify(financialSummary, null, 2)}`,
        },
      ],
      thinking: { type: 'disabled' },
    })

    const insights = completion.choices[0]?.message?.content

    if (!insights) {
      throw new Error('No response from AI')
    }

    return NextResponse.json({
      success: true,
      data: {
        insights,
        type,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('AI Insights error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate AI insights',
        data: {
          insights: 'Unable to generate AI insights at this time. Please try again later.',
          type: requestBody.type || 'general',
          generatedAt: new Date().toISOString(),
        },
      },
      { status: 500 }
    )
  }
}
