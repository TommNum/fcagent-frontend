'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  agentName?: string;
}

// Simple loading dots component inspired by the reference CSS
const LoadingDots = () => (
  <div className="flex space-x-1 items-center">
    <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
    <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
    <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce"></span>
  </div>
);

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [currentAgent, setCurrentAgent] = useState<string | null>('Connecting...');
  const [isLoading, setIsLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false); // State for linking process
  const [linkStatus, setLinkStatus] = useState<string | null>(null); // State for linking feedback

  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial welcome message & agent
  useEffect(() => {
    setMessages([
      {
        id: crypto.randomUUID(),
        sender: 'agent',
        text: 'Welcome to FireCrawl Support! How can I help you today?',
        agentName: 'TriageAgent'
      }
    ]);
    setCurrentAgent('TriageAgent');
  }, []);

  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: inputValue.trim(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    const currentInput = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    setLinkStatus(null); // Clear link status on new message

    try {
      // TODO: Replace MOCKED RESPONSE with actual API call
      // const response = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/chat', { ... });
      // const data = await response.json();

      // --- MOCKED RESPONSE ---
      await new Promise(resolve => setTimeout(resolve, 1500));
      const data = {
        reply: `Thanks for your message about: "${currentInput.substring(0, 30)}...". I'm processing this.`, // Changed reply for clarity
        agentName: Math.random() > 0.5 ? 'APIImplementationAgent' : 'SDKIntegrationAgent',
        newTicketId: ticketId || crypto.randomUUID().substring(0, 8).toUpperCase(),
      };
      // --- END MOCKED RESPONSE ---

      const agentMessage: Message = {
        id: crypto.randomUUID(),
        sender: 'agent',
        text: data.reply,
        agentName: data.agentName,
      };
      setMessages((prevMessages) => [...prevMessages, agentMessage]);
      if (data.agentName) {
        setCurrentAgent(data.agentName);
      }
      if (data.newTicketId && !ticketId) {
        setTicketId(data.newTicketId);
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        sender: 'agent',
        text: 'Sorry, I encountered an error connecting to the support agent. Please try again.',
        agentName: 'System Error',
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
       setCurrentAgent('System Error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Linking Functionality (Mocked) ---
  const handleLinkTicket = async (type: 'email' | 'telegram') => {
    if (!ticketId || isLinking) return;

    setIsLinking(true);
    setLinkStatus(`Linking ${type}...`);

    // Prompt for identifier (basic implementation)
    const identifier = prompt(`Please enter your ${type} address/ID:`);
    if (!identifier) {
      setIsLinking(false);
      setLinkStatus(null);
      return;
    }

    try {
      // TODO: Replace with actual API call to a backend endpoint like /api/link-ticket
      console.log(`Mock API Call: Link Ticket ${ticketId} to ${type}: ${identifier}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      // Assume success for mock
      setLinkStatus(`${type.charAt(0).toUpperCase() + type.slice(1)} linked successfully!`);

    } catch (error) {
      console.error(`Failed to link ${type}:`, error);
      setLinkStatus(`Failed to link ${type}. Please try again.`);
    } finally {
      setIsLinking(false);
      // Optionally clear status message after a few seconds
      setTimeout(() => setLinkStatus(null), 5000);
    }
  }
  // --- End Linking Functionality ---

  return (
    // Adjusted main container: darker bg, center alignment
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black text-gray-100 font-sans">
      {/* Chat window styling */}
      <div className="w-full max-w-2xl lg:max-w-3xl flex flex-col h-[calc(100vh-2rem)] bg-zinc-900 rounded-lg shadow-xl overflow-hidden border border-zinc-700">
        {/* Header: Darker background */}
        <div className="p-3 border-b border-zinc-700 flex justify-between items-center bg-zinc-800">
          <h1 className="text-base md:text-lg font-semibold text-gray-50">FireCrawl Support</h1>
          <div className="text-xs text-gray-400">
            Ticket ID: <span className="font-mono px-2 py-0.5 bg-zinc-700 rounded text-orange-400">{ticketId || 'Pending...'}</span>
          </div>
        </div>

        {/* Agent Status: Orange text */}
        <div className="p-1.5 text-center text-xs bg-zinc-800 text-gray-300 border-b border-zinc-700">
          Agent: <span className="font-semibold text-orange-400">{currentAgent || '...'}</span>
        </div>

        {/* Chat Messages Area: Darker bg */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-zinc-900 scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-zinc-800">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                 className={`max-w-[80%] md:max-w-[70%] px-3.5 py-2.5 rounded-xl shadow ${msg.sender === 'user' ? 'bg-orange-700 text-white rounded-br-none' : 'bg-zinc-700 text-gray-100 rounded-bl-none'}`}
              >
                {msg.sender === 'agent' && msg.agentName && (
                  <p className="text-xs text-orange-300 mb-1 font-medium">{msg.agentName}</p>
                )}
                <p className="text-sm leading-snug whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className="flex items-center space-x-2 max-w-xs md:max-w-md lg:max-w-lg px-3.5 py-2.5 rounded-xl shadow bg-zinc-700 text-gray-400 rounded-bl-none">
                  <LoadingDots />
                  <span className="text-xs italic">{currentAgent || 'Agent'} is typing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Area: Darker bg, adjusted input/button styles */}
        <div className="p-4 border-t border-zinc-700 bg-zinc-800">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
              placeholder={isLoading ? 'Waiting for agent...' : 'Ask FireCrawl support...'}
              // Input style inspired by reference: dark bg, light text, orange focus
              className="flex-1 p-3 bg-zinc-700 border border-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-100 placeholder-gray-400 disabled:opacity-60 text-sm"
              disabled={isLoading}
            />
            {/* Button style inspired by reference: black bg, white text, uppercase, orange focus */}
            <button
              onClick={handleSendMessage}
              disabled={isLoading || inputValue.trim() === ''}
              className="px-5 py-3 bg-black hover:bg-zinc-800 border border-zinc-600 hover:border-orange-500 disabled:bg-zinc-700 disabled:text-gray-400 disabled:border-zinc-600 rounded-md font-semibold text-white uppercase text-sm tracking-wide transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px] h-[46px]" // Fixed height
            >
              {isLoading ? (
                 <LoadingDots />
              ) : (
                'Send'
              )}
            </button>
          </div>
          {/* Linking Section */}
           <div className="mt-3 pt-2 border-t border-zinc-700/50 flex items-center justify-center space-x-3">
            {ticketId ? (
              <>
                 <span className="text-xs text-gray-400">Link ticket <span className="font-mono text-orange-400">{ticketId}</span> to:</span>
                <button
                  onClick={() => handleLinkTicket('email')}
                  disabled={isLinking}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 rounded text-white text-xs font-medium disabled:cursor-not-allowed"
                >
                  {isLinking ? 'Linking...' : 'Email'}
                </button>
                <button
                  onClick={() => handleLinkTicket('telegram')}
                  disabled={isLinking}
                  className="px-3 py-1 bg-sky-500 hover:bg-sky-600 disabled:bg-gray-500 rounded text-white text-xs font-medium disabled:cursor-not-allowed"
                >
                   {isLinking ? 'Linking...' : 'Telegram'}
                </button>
              </>
            ) : (
              <span className="text-xs text-gray-500 italic">Send a message to get a Ticket ID for linking.</span>
            )}
          </div>
           {linkStatus && (
              <p className="mt-2 text-center text-xs text-green-400 animate-pulse">{linkStatus}</p>
            )}
        </div>
      </div>
    </main>
  );
} 