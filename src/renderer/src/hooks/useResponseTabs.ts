import { useState, useCallback } from 'react'
import { ApiResponse } from '@/types/types'
import { useTabStore } from '@renderer/stores/tabStore'
import { generateRawContent } from '@renderer/utils/httpFormatters'
import { getPropertyValue } from '@renderer/utils/propertyUtils'
import { formatJson, separateResponseData, formatMetadata } from '@renderer/utils/responseUtils'

export type ResponseTabType = 'body' | 'headers' | 'cookies' | 'preview' | 'metadata' | 'raw'

interface UseResponseTabsProps {
  tabId: string
  response: ApiResponse
}

export const useResponseTabs = ({ tabId, response }: UseResponseTabsProps) => {
  const { getTab } = useTabStore()
  const [activeTab, setActiveTab] = useState<ResponseTabType>('body')
  const [selectedPreviewProperty, setSelectedPreviewProperty] = useState<string>('data')
  const [showPropertySelector, setShowPropertySelector] = useState(false)

  const tab = getTab(tabId)

  const getCurrentContent = useCallback((): string => {
    const separatedData = separateResponseData(response.data)

    if (activeTab === 'body') {
      return formatJson(separatedData.actualData)
    } else if (activeTab === 'headers') {
      return Object.entries(response.headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n')
    } else if (activeTab === 'cookies') {
      return 'No cookies found in response'
    } else if (activeTab === 'preview') {
      const previewValue = getPropertyValue(response, selectedPreviewProperty)
      return typeof previewValue === 'string' ? previewValue : formatJson(previewValue)
    } else if (activeTab === 'metadata') {
      return formatMetadata(separatedData.metadata)
    } else if (activeTab === 'raw') {
      if (!tab) return ''
      return generateRawContent(tab.request, response)
    }
    return ''
  }, [activeTab, response, selectedPreviewProperty, tab])

  const handleTabChange = useCallback((newTab: ResponseTabType) => {
    setActiveTab(newTab)
  }, [])

  const handlePreviewPropertyChange = useCallback((property: string) => {
    setSelectedPreviewProperty(property)
  }, [])

  const togglePropertySelector = useCallback(() => {
    setShowPropertySelector((prev) => !prev)
  }, [])

  return {
    activeTab,
    selectedPreviewProperty,
    showPropertySelector,
    getCurrentContent,
    handleTabChange,
    handlePreviewPropertyChange,
    togglePropertySelector,
    setShowPropertySelector
  }
}
