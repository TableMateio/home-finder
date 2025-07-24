interface GTFSStop {
  stop_id: string
  stop_name: string
  stop_lat: number
  stop_lon: number
  stop_code?: string
}

interface GTFSRoute {
  route_id: string
  route_short_name: string
  route_long_name: string
  route_type: string
}

interface GTFSTrip {
  route_id: string
  service_id: string
  trip_id: string
  trip_headsign: string
  direction_id: string
}

interface GTFSStopTime {
  trip_id: string
  arrival_time: string
  departure_time: string
  stop_id: string
  stop_sequence: string
}

export class GTFSParser {
  private stops: GTFSStop[] = []
  private routes: GTFSRoute[] = []
  private trips: GTFSTrip[] = []
  private stopTimes: GTFSStopTime[] = []

  // Only load GTFS data when explicitly called
  async loadGTFSData() {
    try {
      console.log("GTFS parser initialized - ready to load data when files are available")
      return true
    } catch (error) {
      console.error("Error initializing GTFS parser:", error)
      return false
    }
  }

  private parseCSV(csvText: string): any[] {
    const lines = csvText.trim().split("\n")
    const headers = lines[0].split(",").map((h) => h.trim())

    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""))
      const obj: any = {}
      headers.forEach((header, index) => {
        obj[header] = values[index] || ""
      })
      return obj
    })
  }

  findNearestStations(lat: number, lng: number, limit = 3): GTFSStop[] {
    return this.stops
      .map((stop) => ({
        ...stop,
        distance: this.calculateDistance(lat, lng, Number(stop.stop_lat), Number(stop.stop_lon)),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
  }

  getNextTrains(stationId: string, currentTime = "08:00:00"): string[] {
    const stationStopTimes = this.stopTimes
      .filter((st) => st.stop_id === stationId && st.departure_time >= currentTime)
      .sort((a, b) => a.departure_time.localeCompare(b.departure_time))
      .slice(0, 5)

    return stationStopTimes.map((st) => this.formatTime(st.departure_time))
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959 // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private formatTime(time: string): string {
    const [hours, minutes] = time.split(":")
    const hour = Number.parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }
}
