"use client"

import type React from "react"
import dynamic from "next/dynamic"
import { useState, useEffect, useRef } from "react"
import { Search, Train, Car, Building2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Dynamically import the map component to prevent SSR issues
const DynamicMapComponent = dynamic(() => Promise.resolve(MapComponent), {
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

// Separate map component to isolate Google Maps logic
function MapComponent({
  searchAddress,
  commuteOptions,
  hoveredOption,
  onOptionHover,
  onOptionLeave,
  showNicoleOffice,
  onCommuteOptionsUpdate
}: {
  searchAddress: string
  commuteOptions: CommuteOption[]
  hoveredOption: string | null
  onOptionHover: (option: CommuteOption) => void
  onOptionLeave: () => void
  showNicoleOffice: boolean
  onCommuteOptionsUpdate: (options: CommuteOption[]) => void
}) {
  const [map, setMap] = useState<any>(null)
  const [geocoder, setGeocoder] = useState<any>(null)
  const [directionsService, setDirectionsService] = useState<any>(null)
  const [directionsRenderers, setDirectionsRenderers] = useState<any[]>([])
  const [mapLoaded, setMapLoaded] = useState(false)
  const [searchCoordinates, setSearchCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [markers, setMarkers] = useState<any[]>([])
  const [isClient, setIsClient] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)

  // Mock data with real Metro North stations
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

  // Ensure this only runs on client
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Initialize Google Maps only on client
  useEffect(() => {
    if (!isClient) return

    const loadGoogleMaps = () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        console.error("Google Maps API key is not configured")
        return
      }

      if (window.google) {
        setTimeout(initializeMap, 100)
        return
      }

      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`
      script.async = true
      script.defer = true

      script.onload = () => {
        console.log("Google Maps API loaded successfully")
        setTimeout(initializeMap, 100)
      }

      script.onerror = (error) => {
        console.error("Failed to load Google Maps API:", error)
        setMapLoaded(false)
      }

      document.head.appendChild(script)
    }

    const initializeMap = () => {
      if (!mapRef.current || !window.google) return

      try {
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
        setMapLoaded(true)

        console.log("Google Maps initialized successfully")
      } catch (error) {
        console.error("Error initializing Google Maps:", error)
        setMapLoaded(false)
      }
    }

    loadGoogleMaps()
  }, [isClient])

  // Handle search function
  const handleSearch = async () => {
    if (!searchAddress.trim() || !geocoder || !map) return

    try {
      const coordinates = await new Promise<{ lat: number, lng: number }>((resolve, reject) => {
        geocoder.geocode({ address: searchAddress }, (results: any, status: any) => {
          if (status === "OK" && results[0]) {
            const location = results[0].geometry.location
            resolve({ lat: location.lat(), lng: location.lng() })
          } else {
            reject(new Error(`Geocoding failed: ${status}`))
          }
        })
      })

      setSearchCoordinates(coordinates)

      // Clear previous markers
      markers.forEach((marker) => marker.setMap(null))
      setMarkers([])

      // Calculate real driving times
      const updatedOptions = await Promise.all(
        mockCommuteData.map(async (option) => {
          try {
            const realDriveTime = await new Promise<number>((resolve) => {
              if (!directionsService) {
                resolve(option.driveTime)
                return
              }

              directionsService.route(
                {
                  origin: coordinates,
                  destination: option.coordinates,
                  travelMode: window.google.maps.TravelMode.DRIVING,
                },
                (result: any, status: any) => {
                  if (status === "OK") {
                    const duration = result.routes[0].legs[0].duration.value / 60
                    resolve(Math.round(duration))
                  } else {
                    resolve(option.driveTime)
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

      // Add markers
      try {
        const searchMarker = new window.google.maps.Marker({
          position: coordinates,
          map: map,
          title: searchAddress,
        })

        const stationMarkers = updatedOptions.map((option) => {
          return new window.google.maps.Marker({
            position: option.coordinates,
            map: map,
            title: `${option.station} Station - ${option.totalTime} min total`,
          })
        })

        setMarkers([searchMarker, ...stationMarkers])
        map.setCenter(coordinates)
        map.setZoom(12)
      } catch (mapError) {
        console.error("Error adding markers:", mapError)
      }
    } catch (error) {
      console.error("Error during search:", error)
    }
  }

  // Auto-search when address changes
  useEffect(() => {
    if (searchAddress && mapLoaded) {
      handleSearch()
    }
  }, [searchAddress, mapLoaded, showNicoleOffice])

  // Handle route display
  useEffect(() => {
    if (!hoveredOption || !searchCoordinates || !map || !directionsService) return

    const option = commuteOptions.find(opt => opt.id === hoveredOption)
    if (!option) return

    try {
      directionsRenderers.forEach((renderer) => renderer.setMap(null))
      setDirectionsRenderers([])

      const drivingRenderer = new window.google.maps.DirectionsRenderer({
        polylineOptions: {
          strokeColor: "#4285F4",
          strokeWeight: 4,
          strokeOpacity: 0.8,
        },
      })

      drivingRenderer.setMap(map)

      directionsService.route(
        {
          origin: searchCoordinates,
          destination: option.coordinates,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result: any, status: any) => {
          if (status === "OK") {
            drivingRenderer.setDirections(result)
          }
        }
      )

      setDirectionsRenderers([drivingRenderer])
    } catch (error) {
      console.error("Error showing route:", error)
    }
  }, [hoveredOption, searchCoordinates, commuteOptions, map, directionsService])

  // Clear routes when not hovering
  useEffect(() => {
    if (!hoveredOption) {
      directionsRenderers.forEach((renderer) => renderer.setMap(null))
      setDirectionsRenderers([])
    }
  }, [hoveredOption])

  if (!isClient) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={mapRef} className="w-full h-full bg-gray-100">
      {!mapLoaded && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Google Maps...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CommutePage() {
  const [searchAddress, setSearchAddress] = useState("")
  const [commuteOptions, setCommuteOptions] = useState<CommuteOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hoveredOption, setHoveredOption] = useState<string | null>(null)
  const [showNicoleOffice, setShowNicoleOffice] = useState(false)

  const handleSearch = () => {
    setIsLoading(true)
    // The actual search is handled by the MapComponent
    setTimeout(() => setIsLoading(false), 1000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const handleToggleDestination = (destination: "grandcentral" | "brookfield") => {
    setShowNicoleOffice(destination === "brookfield")
  }

  const handleOptionHover = (option: CommuteOption) => {
    setHoveredOption(option.id)
  }

  const handleOptionLeave = () => {
    setHoveredOption(null)
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
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? "Searching..." : "Search"}
          </Button>
        </div>
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
                    onMouseEnter={() => handleOptionHover(option)}
                    onMouseLeave={handleOptionLeave}
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

        {/* Google Maps */}
        <DynamicMapComponent
          searchAddress={searchAddress}
          commuteOptions={commuteOptions}
          hoveredOption={hoveredOption}
          onOptionHover={handleOptionHover}
          onOptionLeave={handleOptionLeave}
          showNicoleOffice={showNicoleOffice}
          onCommuteOptionsUpdate={setCommuteOptions}
        />
      </div>
    </div>
  )
}
