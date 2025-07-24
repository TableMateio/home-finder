"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Search, Train, Car, Building2, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ErrorBoundary } from "@/components/error-boundary"
import { ErrorReporter } from "@/lib/error-reporting"

declare global {
  interface Window {
    google: any
  }
}

interface CommuteOption {
  id: string
  station: string
  driveTime: number
  trainTime: number
  subwayTime?: number
  totalTime: number
  trainLine: string
  nextTrains: string[]
  walkingDistance?: number
  coordinates: { lat: number; lng: number }
}

// Simple Google Maps wrapper that doesn't rely on external libraries
function GoogleMapWrapper({
  children,
  onLoad,
  onError
}: {
  children?: React.ReactNode
  onLoad?: () => void
  onError?: (error: any) => void
}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const errorReporter = ErrorReporter.getInstance()

  useEffect(() => {
    const loadGoogleMaps = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        if (!apiKey) {
          throw new Error("Google Maps API key not found")
        }

        // Check if already loaded
        if (window.google?.maps) {
          setIsLoaded(true)
          onLoad?.()
          return
        }

        // Create and load script
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&loading=async`
        script.async = true
        script.defer = true

        script.onload = () => {
          console.log('Google Maps loaded successfully')
          setIsLoaded(true)
          onLoad?.()
        }

        script.onerror = (error) => {
          const errorMsg = 'Failed to load Google Maps'
          console.error(errorMsg, error)
          setLoadError(errorMsg)
          errorReporter.reportMapError('Script Loading', error)
          onError?.(error)
        }

        document.head.appendChild(script)
      } catch (error) {
        const errorMsg = `Google Maps initialization error: ${error}`
        console.error(errorMsg)
        setLoadError(errorMsg)
        errorReporter.reportMapError('Initialization', error)
        onError?.(error)
      }
    }

    loadGoogleMaps()
  }, [onLoad, onError])

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="text-center p-6">
          <AlertCircle className="w-12 h-12 mx-auto text-yellow-600 mb-4" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Map Loading Error</h3>
          <p className="text-yellow-600 text-sm">{loadError}</p>
          <p className="text-xs text-yellow-500 mt-2">Using fallback mode</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Google Maps...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Safer map component with extensive error handling
function SafeMapComponent({
  searchAddress,
  onCommuteOptionsUpdate,
  showNicoleOffice,
  onMapReady
}: {
  searchAddress: string
  onCommuteOptionsUpdate: (options: CommuteOption[]) => void
  showNicoleOffice: boolean
  onMapReady: (ready: boolean) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [geocoder, setGeocoder] = useState<any>(null)
  const [directionsService, setDirectionsService] = useState<any>(null)
  const [isMapReady, setIsMapReady] = useState(false)
  const errorReporter = ErrorReporter.getInstance()

  // Mock data
  const mockCommuteData: CommuteOption[] = [
    {
      id: "1",
      station: "White Plains",
      driveTime: 12,
      trainTime: 35,
      subwayTime: 40,
      totalTime: 47,
      trainLine: "Harlem Line",
      nextTrains: ["7:15 AM", "7:45 AM", "8:15 AM"],
      walkingDistance: 0.3,
      coordinates: { lat: 41.0339, lng: -73.7629 },
    },
    {
      id: "2",
      station: "Scarsdale",
      driveTime: 8,
      trainTime: 42,
      subwayTime: 40,
      totalTime: 50,
      trainLine: "Harlem Line",
      nextTrains: ["7:22 AM", "7:52 AM", "8:22 AM"],
      coordinates: { lat: 40.9889, lng: -73.8087 },
    },
    {
      id: "3",
      station: "Mount Vernon East",
      driveTime: 15,
      trainTime: 28,
      subwayTime: 40,
      totalTime: 43,
      trainLine: "New Haven Line",
      nextTrains: ["7:18 AM", "7:48 AM", "8:18 AM"],
      coordinates: { lat: 40.9126, lng: -73.837 },
    },
  ]

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) {
      errorReporter.reportMapError('Map Initialization', 'Map ref or Google Maps not available')
      return
    }

    try {
      console.log('Initializing map...')

      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: { lat: 40.9176, lng: -73.7004 },
        zoom: 10,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      })

      const geocoderInstance = new window.google.maps.Geocoder()
      const directionsServiceInstance = new window.google.maps.DirectionsService()

      setMap(mapInstance)
      setGeocoder(geocoderInstance)
      setDirectionsService(directionsServiceInstance)
      setIsMapReady(true)
      onMapReady(true)

      console.log('Map initialized successfully')
    } catch (error) {
      console.error('Map initialization failed:', error)
      errorReporter.reportMapError('Map Creation', error)
      onMapReady(false)
    }
  }, [onMapReady])

  const handleSearch = useCallback(async () => {
    if (!searchAddress.trim() || !geocoder || !map || !directionsService) {
      console.warn('Search conditions not met')
      return
    }

    try {
      console.log('Starting search for:', searchAddress)

      // Geocode address
      const coordinates = await new Promise<{ lat: number, lng: number }>((resolve, reject) => {
        geocoder.geocode({ address: searchAddress }, (results: any, status: any) => {
          if (status === "OK" && results?.[0]) {
            const location = results[0].geometry.location
            resolve({ lat: location.lat(), lng: location.lng() })
          } else {
            reject(new Error(`Geocoding failed: ${status}`))
          }
        })
      })

      console.log('Geocoded coordinates:', coordinates)

      // Calculate driving times with better error handling
      const updatedOptions = await Promise.all(
        mockCommuteData.map(async (option) => {
          try {
            const realDriveTime = await new Promise<number>((resolve) => {
              directionsService.route(
                {
                  origin: coordinates,
                  destination: option.coordinates,
                  travelMode: window.google.maps.TravelMode.DRIVING,
                },
                (result: any, status: any) => {
                  if (status === "OK" && result?.routes?.[0]?.legs?.[0]?.duration) {
                    const duration = result.routes[0].legs[0].duration.value / 60
                    resolve(Math.round(duration))
                  } else {
                    console.warn(`Directions failed for ${option.station}:`, status)
                    resolve(option.driveTime) // fallback
                  }
                }
              )
            })

            return {
              ...option,
              driveTime: realDriveTime,
              totalTime: showNicoleOffice
                ? realDriveTime + option.trainTime + (option.subwayTime || 0)
                : realDriveTime + option.trainTime,
            }
          } catch (error) {
            console.error(`Error calculating drive time for ${option.station}:`, error)
            return {
              ...option,
              totalTime: showNicoleOffice
                ? option.driveTime + option.trainTime + (option.subwayTime || 0)
                : option.driveTime + option.trainTime,
            }
          }
        })
      )

      onCommuteOptionsUpdate(updatedOptions)

      // Add markers safely
      try {
        new window.google.maps.Marker({
          position: coordinates,
          map: map,
          title: searchAddress,
        })

        updatedOptions.forEach((option) => {
          new window.google.maps.Marker({
            position: option.coordinates,
            map: map,
            title: `${option.station} Station`,
          })
        })

        map.setCenter(coordinates)
        map.setZoom(12)
      } catch (markerError) {
        console.error('Error adding markers:', markerError)
        errorReporter.reportMapError('Marker Creation', markerError)
      }

    } catch (error) {
      console.error('Search failed:', error)
      errorReporter.reportMapError('Search Operation', error)

      // Fallback to mock data
      const fallbackOptions = mockCommuteData.map((option) => ({
        ...option,
        totalTime: showNicoleOffice
          ? option.driveTime + option.trainTime + (option.subwayTime || 0)
          : option.driveTime + option.trainTime,
      }))
      onCommuteOptionsUpdate(fallbackOptions)
    }
  }, [searchAddress, geocoder, map, directionsService, showNicoleOffice, onCommuteOptionsUpdate])

  // Auto-search when conditions are met
  useEffect(() => {
    if (searchAddress && isMapReady) {
      handleSearch()
    }
  }, [searchAddress, isMapReady, showNicoleOffice, handleSearch])

  return (
    <GoogleMapWrapper onLoad={initializeMap} onError={(error) => errorReporter.reportMapError('Wrapper', error)}>
      <div ref={mapRef} className="w-full h-full bg-gray-100" />
    </GoogleMapWrapper>
  )
}

export default function CommutePage() {
  const [searchAddress, setSearchAddress] = useState("")
  const [commuteOptions, setCommuteOptions] = useState<CommuteOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hoveredOption, setHoveredOption] = useState<string | null>(null)
  const [showNicoleOffice, setShowNicoleOffice] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  // Initialize error reporting
  useEffect(() => {
    ErrorReporter.getInstance()
  }, [])

  const handleSearch = () => {
    if (!searchAddress.trim()) return
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 2000) // UI feedback
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const handleToggleDestination = (destination: "grandcentral" | "brookfield") => {
    setShowNicoleOffice(destination === "brookfield")
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b bg-white z-10">
        <div className="max-w-md mx-auto flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Enter address (e.g., 123 Main St, Scarsdale, NY)"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={isLoading || !mapReady}>
            {isLoading ? "Searching..." : "Search"}
          </Button>
        </div>
        {!mapReady && (
          <p className="text-center text-sm text-gray-500 mt-2">
            Initializing map...
          </p>
        )}
      </div>

      <div className="flex-1 relative">
        {/* Commute Results Overlay */}
        {commuteOptions.length > 0 && (
          <Card className="absolute top-4 left-4 w-80 z-20 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  {showNicoleOffice ? (
                    <>
                      <Building2 className="h-5 w-5" />
                      Commute to Brookfield Place
                    </>
                  ) : (
                    <>
                      <Train className="h-5 w-5" />
                      Commute to Grand Central
                    </>
                  )}
                </CardTitle>
              </div>

              <div className="flex items-center gap-1 mb-2 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={!showNicoleOffice ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleToggleDestination("grandcentral")}
                  className="flex items-center gap-1 h-8 px-2"
                >
                  <Train className="h-3 w-3" />
                  <span className="text-xs">GCT</span>
                </Button>
                <Button
                  variant={showNicoleOffice ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleToggleDestination("brookfield")}
                  className="flex items-center gap-1 h-8 px-2"
                >
                  <Building2 className="h-3 w-3" />
                  <span className="text-xs">Nicole</span>
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">From: {searchAddress}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {commuteOptions
                .sort((a, b) => a.totalTime - b.totalTime)
                .map((option) => (
                  <div
                    key={option.id}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${hoveredOption === option.id ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"
                      }`}
                    onMouseEnter={() => setHoveredOption(option.id)}
                    onMouseLeave={() => setHoveredOption(null)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Train className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{option.station}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {option.totalTime} min
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        {option.driveTime}m
                      </div>
                      <div className="flex items-center gap-1">
                        <Train className="h-3 w-3" />
                        {option.trainTime}m
                      </div>
                      {showNicoleOffice && option.subwayTime && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />+{option.subwayTime}m subway
                        </div>
                      )}
                    </div>

                    <div className="text-xs">
                      <div className="text-muted-foreground mb-1">{option.trainLine}</div>
                      <div className="flex gap-2">
                        {option.nextTrains.slice(0, 3).map((time, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs px-1 py-0">
                            {time}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Google Maps with Error Boundary */}
        <ErrorBoundary name="GoogleMaps">
          <SafeMapComponent
            searchAddress={searchAddress}
            onCommuteOptionsUpdate={setCommuteOptions}
            showNicoleOffice={showNicoleOffice}
            onMapReady={setMapReady}
          />
        </ErrorBoundary>
      </div>
    </div>
  )
}
