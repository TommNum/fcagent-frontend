import React from 'react';

export default function Home() {
  // Placeholder state for chat messages, input, ticket ID, agent status
  // We will implement the actual logic later

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 bg-gray-900 text-white">
      <div className="w-full max-w-4xl flex flex-col h-[calc(100vh-3rem)] bg-gray-800 rounded-lg shadow-xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h1 className="text-xl font-semibold">FireCrawl Support Agent</h1>
          {/* Placeholder for Ticket ID */}
          <div className="text-sm text-gray-400">Ticket ID: <span className="font-mono">[Fetching...]</span></div>
        </div>

        {/* Agent Status Placeholder */}
        <div className="p-2 text-center text-xs bg-gray-700 text-gray-300">
          Current Agent: <span className="font-semibold">[Connecting...]</span>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {/* Placeholder Message */}
          <div className="flex items-start space-x-3">
            <div className="bg-blue-600 p-3 rounded-lg max-w-xs lg:max-w-md">
              <p className="text-sm">Welcome to FireCrawl Support! How can I help you today?</p>
            </div>
          </div>
          {/* More messages will appear here */}
        </div>

        {/* Chat Input Area */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              placeholder="Type your message here..."
              className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
              // Add state and onChange handler later
            />
            <button
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors duration-200"
              // Add onClick handler later
            >
              Send
            </button>
          </div>
          {/* Placeholder for Account Linking */}
          <div className="mt-2 text-xs text-gray-500 text-center">
            {/* We'll add functionality to link ticket to email/Telegram later */}
          </div>
        </div>
      </div>
    </main>
  );
} 