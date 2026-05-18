'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, TrendingUp, Receipt, BarChart3, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const insightTypes = [
  { id: 'general', label: 'Overview', icon: Sparkles, color: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'expenses', label: 'Expenses', icon: Receipt, color: 'text-rose-600 dark:text-rose-400' },
  { id: 'revenue', label: 'Revenue', icon: TrendingUp, color: 'text-teal-600 dark:text-teal-400' },
  { id: 'forecast', label: 'Forecast', icon: BarChart3, color: 'text-amber-600 dark:text-amber-400' },
]

export function AIInsightsWidget() {
  const [insights, setInsights] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState('general')
  const [isExpanded, setIsExpanded] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  const fetchInsights = async (type: string) => {
    setLoading(true)
    setSelectedType(type)
    try {
      const response = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      const data = await response.json()
      if (data.success && data.data) {
        setInsights(data.data.insights)
        setGeneratedAt(data.data.generatedAt)
      } else {
        setInsights('Failed to generate insights. Please try again.')
      }
    } catch {
      setInsights('Unable to connect to AI service. Please try again later.')
    } finally {
      setLoading(false)
      setIsExpanded(true)
    }
  }

  const currentType = insightTypes.find(t => t.id === selectedType)

  return (
    <Card className="premium-card border-emerald-200/50 dark:border-emerald-800/30 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">AI Financial Insights</CardTitle>
              <CardDescription className="text-xs">Powered by AI</CardDescription>
            </div>
          </div>
          {insights && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 w-7 p-0"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Insight Type Buttons */}
        <div className="flex flex-wrap gap-1.5">
          {insightTypes.map((type) => {
            const Icon = type.icon
            return (
              <Button
                key={type.id}
                variant={selectedType === type.id && insights ? 'default' : 'outline'}
                size="sm"
                onClick={() => fetchInsights(type.id)}
                disabled={loading}
                className={`h-7 text-xs gap-1 ${
                  selectedType === type.id && insights
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                }`}
              >
                <Icon className="h-3 w-3" />
                {type.label}
                {loading && selectedType === type.id && <Loader2 className="h-3 w-3 animate-spin" />}
              </Button>
            )
          })}
        </div>

        {/* Insights Content */}
        <AnimatePresence>
          {isExpanded && (insights || loading) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {loading ? (
                <div className="space-y-3 p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    <span className="text-sm text-muted-foreground">Analyzing financial data...</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded animate-pulse w-full" />
                    <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
                    <div className="h-3 bg-muted rounded animate-pulse w-3/5" />
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-100/50 dark:border-emerald-900/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      {currentType?.label || 'Overview'}
                    </Badge>
                    {generatedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(generatedAt).toLocaleTimeString()}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchInsights(selectedType)}
                      className="h-5 w-5 p-0 ml-auto"
                      disabled={loading}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
                    <div className="whitespace-pre-wrap text-muted-foreground text-[13px] leading-relaxed">
                      {insights}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed preview */}
        {!isExpanded && insights && (
          <div
            className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors line-clamp-2"
            onClick={() => setIsExpanded(true)}
          >
            {insights.substring(0, 120)}...
          </div>
        )}
      </CardContent>
    </Card>
  )
}
