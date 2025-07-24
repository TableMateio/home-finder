"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Search, Train, Car, Building2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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

export default function CommutePage() {
  const [searchAddress, setSearchAddress] = useState("")
  const [commuteOptions, setCommuteOptions] = useState<CommuteOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hoveredOption, setHoveredOption] = useState<string | null>(null)
  const [showNicoleOffice, setShowNicoleOffice] = useState(false)
  const [map, setMap] = useState<any>(null)
  const [geocoder, setGeocoder] = useState<any>(null)
  const [directionsService, setDirectionsService] = useState<any>(null)
  const [directionsRenderers, setDirectionsRenderers] = useState<any[]>([])
  const [mapLoaded, setMapLoaded] = useState(false)
  const [searchCoordinates, setSearchCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [markers, setMarkers] = useState<any[]>([])
  const [mounted, setMounted] = useState(false)
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

  // Handle component mounting
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Initialize Google Maps
  useEffect(() => {
    if (!mounted) return

    const loadGoogleMaps = () => {
      // Check if API key is available
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        console.error("Google Maps API key is not configured")
        return
      }

      // Check if already loaded
      if (window.google) {
        // Add a small delay to ensure DOM is ready
        setTimeout(initializeMap, 100)
        return
      }

      // Create script element
      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`
      script.async = true
      script.defer = true

      script.onload = () => {
        console.log("Google Maps API loaded successfully")
        // Add a small delay to ensure DOM is ready
        setTimeout(initializeMap, 100)
      }

      script.onerror = (error) => {
        console.error("Failed to load Google Maps API:", error)
        console.error("API Key:", apiKey ? "Present" : "Missing")
        setMapLoaded(false)
      }

      document.head.appendChild(script)
    }

    const initializeMap = () => {
      if (!mapRef.current || !window.google) {
        console.log("Map ref or Google not available yet")
        return
      }

      try {
        console.log("Initializing Google Maps...")

        // Check if mapRef.current is still a valid DOM element
        if (!mapRef.current.isConnected) {
          console.error("Map container is not connected to DOM")
          return
        }

        const mapInstance = new window.google.maps.Map(mapRef.current, {
          center: { lat: 40.9176, lng: -73.7004 }, // Westchester County
          zoom: 10,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          styles: [
            {
              featureType: "transit.station.rail",
              elementType: "labels.icon",
              stylers: [{ visibility: "on" }],
            },
          ],
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
  }, [mounted])

  const clearMarkersAndDirections = () => {
    // Clear existing markers
    markers.forEach((marker) => marker.setMap(null))
    setMarkers([])

    // Clear existing directions
    directionsRenderers.forEach((renderer) => renderer.setMap(null))
    setDirectionsRenderers([])
  }

  const geocodeAddress = (address: string): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!geocoder) {
        reject(new Error("Geocoder not initialized"))
        return
      }

      geocoder.geocode({ address: address }, (results: any, status: any) => {
        if (status === "OK" && results[0]) {
          const location = results[0].geometry.location
          resolve({
            lat: location.lat(),
            lng: location.lng(),
          })
        } else {
          reject(new Error(`Geocoding failed: ${status}`))
        }
      })
    })
  }

  const calculateDrivingTime = (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<number> => {
    return new Promise((resolve) => {
      if (!directionsService) {
        resolve(15) // fallback time
        return
      }

      directionsService.route(
        {
          origin: origin,
          destination: destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
          unitSystem: window.google.maps.UnitSystem.IMPERIAL,
          avoidHighways: false,
          avoidTolls: false,
        },
        (result: any, status: any) => {
          if (status === "OK") {
            const duration = result.routes[0].legs[0].duration.value / 60 // Convert to minutes
            resolve(Math.round(duration))
          } else {
            resolve(15) // fallback time
          }
        },
      )
    })
  }

  const showRouteOnMap = (option: CommuteOption, searchCoords: { lat: number; lng: number }) => {
    if (!map || !directionsService) {
      console.warn("Map or directions service not available")
      return
    }

    try {
      // Clear previous directions but keep markers
      directionsRenderers.forEach((renderer) => renderer.setMap(null))
      setDirectionsRenderers([])

      // Create driving route to station
      const drivingRenderer = new window.google.maps.DirectionsRenderer({
        polylineOptions: {
          strokeColor: "#4285F4",
          strokeWeight: 4,
          strokeOpacity: 0.8,
        },
        suppressMarkers: false,
        markerOptions: {
          icon: {
            url:
              "data:image/svg+xml;charset=UTF-8," +
              encodeURIComponent(`
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="8" fill="#4285F4"/>
                <path d="M12 8v4l3 3" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(20, 20),
          },
        },
      })

      drivingRenderer.setMap(map)

      directionsService.route(
        {
          origin: searchCoords,
          destination: option.coordinates,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result: any, status: any) => {
          if (status === "OK") {
            drivingRenderer.setDirections(result)
          } else {
            console.error("Directions request failed:", status)
          }
        },
      )

      setDirectionsRenderers([drivingRenderer])
    } catch (error) {
      console.error("Error showing route on map:", error)
    }
  }

  const handleSearch = async () => {
    if (!searchAddress.trim()) return
    if (!mapLoaded || !geocoder) {
      console.warn("Maps not ready yet")
      return
    }

    setIsLoading(true)

    try {
      // Geocode the entered address
      const coordinates = await geocodeAddress(searchAddress)
      setSearchCoordinates(coordinates)

      // Clear previous markers and directions
      clearMarkersAndDirections()

      // Calculate real driving times to each station
      const updatedOptions = await Promise.all(
        mockCommuteData.map(async (option) => {
          try {
            const realDriveTime = await calculateDrivingTime(coordinates, option.coordinates)
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
        }),
      )

      setCommuteOptions(updatedOptions)

      // Add search location marker
      if (map) {
        try {
          const searchMarker = new window.google.maps.Marker({
            position: coordinates,
            map: map,
            title: searchAddress,
            icon: {
              url:
                "data:image/svg+xml;charset=UTF-8," +
                encodeURIComponent(`
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
                  <circle cx="12" cy="9" r="2.5" fill="white"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(32, 32),
            },
          })

          // Add station markers
          const stationMarkers = updatedOptions.map((option) => {
            return new window.google.maps.Marker({
              position: option.coordinates,
              map: map,
              title: `${option.station} Station - ${option.totalTime} min total`,
              icon: {
                url:
                  "data:image/svg+xml;charset=UTF-8," +
                  encodeURIComponent(`
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="#1976D2"/>
                    <path d="M12 6v6l4 2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(24, 24),
              },
            })
          })

          setMarkers([searchMarker, ...stationMarkers])

          // Center map on search location
          map.setCenter(coordinates)
          map.setZoom(12)
        } catch (mapError) {
          console.error("Error adding markers to map:", mapError)
        }
      }
    } catch (error) {
      console.error("Error during search:", error)
      // Fallback to mock data if geocoding fails
      const updatedOptions = mockCommuteData.map((option) => ({
        ...option,
        totalTime: showNicoleOffice
          ? option.driveTime + option.trainTime + (option.subwayTime || 0)
          : option.driveTime + option.trainTime,
      }))
      setCommuteOptions(updatedOptions)
    }

    setIsLoading(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const handleToggleDestination = (destination: "grandcentral" | "brookfield") => {
    const isNicoleOffice = destination === "brookfield"
    setShowNicoleOffice(isNicoleOffice)

    if (commuteOptions.length > 0) {
      const updatedOptions = commuteOptions.map((option) => ({
        ...option,
        totalTime: isNicoleOffice
          ? option.driveTime + option.trainTime + (option.subwayTime || 0)
          : option.driveTime + option.trainTime,
      }))
      setCommuteOptions(updatedOptions)
    }
  }

  const handleOptionHover = (option: CommuteOption) => {
    setHoveredOption(option.id)
    if (searchCoordinates) {
      showRouteOnMap(option, searchCoordinates)
    }
  }

  const handleOptionLeave = () => {
    setHoveredOption(null)
    // Clear directions but keep markers
    directionsRenderers.forEach((renderer) => renderer.setMap(null))
    setDirectionsRenderers([])
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
          <Button onClick={handleSearch} disabled={isLoading || !mapLoaded}>
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

              {/* Icon Toggle */}
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
                      {option.walkingDistance && <div className="text-xs">{option.walkingDistance}mi walk</div>}
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
        <div ref={mapRef} className="w-full h-full bg-gray-100">
          {!mapLoaded && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading Google Maps...</p>
                <p className="text-sm text-gray-400 mt-1">
                  API Key: {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Configured' : 'Missing'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
