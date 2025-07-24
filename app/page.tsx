"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ErrorBoundary } from "@/components/error-boundary"
import { ErrorReporter } from "@/lib/error-reporting"
import { DebugPanel } from "@/components/debug-panel"

// Commenting out dynamic import temporarily
// import dynamic from "next/dynamic"

declare global {
  interface Window {
    google: any
    ErrorReporter: typeof ErrorReporter
  }
}

interface CommuteOption {
  station: string
  drivingTime: string
  trainLine: string
  trainTime: string
  totalTime: string
  walkTime?: string
}

// COMMENTED OUT: All Google Maps functionality for debugging
/*
function GoogleMapWrapper({ children, onLoad, onError }: { children?: React.ReactNode; onLoad?: () => void; onError?: (error: any) => void }) {
  // ... (Google Maps wrapper code)
}

function SafeMapComponent({ searchAddress, onCommuteOptionsUpdate, showNicoleOffice, onMapReady }: { searchAddress: string; onCommuteOptionsUpdate: (options: CommuteOption[]) => void; showNicoleOffice: boolean; onMapReady: (ready: boolean) => void }) {
  // ... (Map component code)
}

const DynamicMapComponent = dynamic(() => Promise.resolve(SafeMapComponent), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading Map...</p>
      </div>
    </div>
  )
})
*/

// SIMPLIFIED: Minimal placeholder map component
function PlaceholderMap() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300">
      <div className="text-center text-gray-500">
        <div className="text-lg font-semibold mb-2">Map Placeholder</div>
        <p className="text-sm">Google Maps temporarily disabled for debugging</p>
      </div>
    </div>
  )
}

export default function CommutePage() {
  const [searchAddress, setSearchAddress] = useState("")
  const [commuteOptions, setCommuteOptions] = useState<CommuteOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hoveredOption, setHoveredOption] = useState<number | null>(null)
  const [showNicoleOffice, setShowNicoleOffice] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  // COMMENTED OUT: Error reporter initialization for debugging
  /*
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const errorReporter = ErrorReporter.getInstance()
      errorReporter.setupGlobalHandlers()
      window.ErrorReporter = ErrorReporter
    }
  }, [])
  */

  // SIMPLIFIED: Mock search handler
  const handleSearch = () => {
    console.log("Search triggered for:", searchAddress)
    setIsLoading(true)

    // Mock some data
    setTimeout(() => {
      setCommuteOptions([
        {
          station: "White Plains",
          drivingTime: "12 min",
          trainLine: "Harlem Line",
          trainTime: "45 min",
          totalTime: "57 min"
        },
        {
          station: "Harrison",
          drivingTime: "8 min",
          trainLine: "New Haven Line",
          trainTime: "52 min",
          totalTime: "60 min"
        }
      ])
      setIsLoading(false)
    }, 1000)
  }

  return (
    <ErrorBoundary name="MainPage">
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header with Search */}
        <div className="flex-none p-4 bg-white shadow-sm border-b">
          <div className="flex gap-4 items-center max-w-6xl mx-auto">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Enter an address..."
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading || !searchAddress.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Left Panel - Commute Options */}
          <div className="w-80 bg-white border-r overflow-hidden flex flex-col">
            {commuteOptions.length > 0 && (
              <div className="p-4 border-b bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Commute Options</h2>
                <p className="text-sm text-gray-600">to Grand Central Terminal</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {commuteOptions.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p>Enter an address to see commute options</p>
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {commuteOptions.map((option, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${hoveredOption === index
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }`}
                      onMouseEnter={() => setHoveredOption(index)}
                      onMouseLeave={() => setHoveredOption(null)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-gray-900">{option.station}</div>
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          {option.totalTime}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Drive to station:</span>
                          <span className="font-medium">{option.drivingTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{option.trainLine}:</span>
                          <span className="font-medium">{option.trainTime}</span>
                        </div>
                        {option.walkTime && (
                          <div className="flex justify-between">
                            <span>Walk to office:</span>
                            <span className="font-medium">{option.walkTime}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Map */}
          <div className="flex-1 relative">
            {/* SIMPLIFIED: Using placeholder instead of Google Maps */}
            <PlaceholderMap />

            {/* COMMENTED OUT: Real Google Maps component */}
            {/*
            <ErrorBoundary name="GoogleMaps">
              <SafeMapComponent 
                searchAddress={searchAddress}
                onCommuteOptionsUpdate={setCommuteOptions}
                showNicoleOffice={showNicoleOffice}
                onMapReady={setMapReady}
              />
            </ErrorBoundary>
            */}
          </div>
        </div>

        {/* Debug Panel */}
        <DebugPanel />
      </div>
    </ErrorBoundary>
  )
}
