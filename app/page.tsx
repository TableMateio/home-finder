"use client"

import React, { useState } from "react"

export default function MinimalTestPage() {
  const [message, setMessage] = useState("Click me!")

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Minimal Test Page
        </h1>
        <button
          onClick={() => setMessage("Button clicked!")}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg"
        >
          {message}
        </button>
        <p className="mt-4 text-gray-600">
          If you see this and can click the button, React hydration is working.
        </p>
      </div>
    </div>
  )
}
