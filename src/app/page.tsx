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
        reply: `Thanks for your message about: "${currentInput.substring(0, 30)}...". Our team is on it.`,
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
        text: 'Sorry, an error occurred. Please try again later.',
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
    setLinkStatus(`Linking to ${type}...`);

    // Prompt for identifier (basic implementation)
    const identifier = prompt(`Please enter your ${type} to link ticket ${ticketId}:`);
    if (!identifier) {
      setIsLinking(false);
      setLinkStatus(null);
      return;
    }

    try {
      // TODO: Replace with actual API call to a backend endpoint like /api/link-ticket
      console.log(`Mock API: Link ${ticketId} to ${type}: ${identifier}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      // Assume success for mock
      setLinkStatus(`${type.charAt(0).toUpperCase() + type.slice(1)} linked successfully!`);

    } catch (error) {
      console.error(`Failed to link ${type}:`, error);
      setLinkStatus(`Failed to link ${type}.`);
    } finally {
      setIsLinking(false);
      // Optionally clear status message after a few seconds
      setTimeout(() => setLinkStatus(null), 5000);
    }
  }
  // --- End Linking Functionality ---

  return (
    // Adjusted main container: darker bg, center alignment
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-zinc-50 text-zinc-900 font-sans">
      {/* Chat window styling */}
      <div className="w-full max-w-2xl lg:max-w-3xl flex flex-col h-[calc(100vh-2rem)] bg-white rounded-xl shadow-2xl overflow-hidden border border-zinc-200">
        {/* Header: Darker background */}
        <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-white">
          <h1 className="text-lg md:text-xl font-semibold text-zinc-800">
            <span className="text-orange-500">🔥</span> FireCrawl Support
          </h1>
          <div className="text-xs text-zinc-500">
            Ticket ID: <span className="font-mono px-2 py-1 bg-zinc-100 rounded text-orange-600">{ticketId || 'N/A'}</span>
          </div>
        </div>

        {/* Agent Status: Orange text */}
        <div className="p-1.5 text-center text-xs bg-zinc-50 text-zinc-600 border-b border-zinc-200">
          Agent: <span className="font-semibold text-orange-600">{currentAgent || '...'}</span>
        </div>

        {/* Chat Messages Area: Darker bg */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-white scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-zinc-100">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                 className={`max-w-[80%] md:max-w-[70%] px-3.5 py-2.5 rounded-xl shadow-sm ${msg.sender === 'user' ? 'bg-orange-500 text-white rounded-br-none' : 'bg-zinc-100 text-zinc-800 rounded-bl-none'}`}
              >
                {msg.sender === 'agent' && msg.agentName && (
                  <p className="text-xs text-orange-600 mb-1 font-medium">{msg.agentName}</p>
                )}
                <p className="text-sm leading-snug whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className="flex items-center space-x-2 max-w-xs md:max-w-md lg:max-w-lg px-3.5 py-2.5 rounded-xl shadow-sm bg-zinc-100 text-zinc-500 rounded-bl-none">
                  <LoadingDots />
                  <span className="text-xs italic">{currentAgent || 'Agent'} is typing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Area: Darker bg, adjusted input/button styles */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
              placeholder={isLoading ? 'Waiting for agent...' : 'Type your question...'}
              // Input style inspired by reference: dark bg, light text, orange focus
              className="flex-1 p-3 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-zinc-900 placeholder-zinc-400 disabled:opacity-60 text-sm shadow-sm"
              disabled={isLoading}
            />
            {/* Button style inspired by reference: black bg, white text, uppercase, orange focus */}
            <button
              onClick={handleSendMessage}
              disabled={isLoading || inputValue.trim() === ''}
              className="px-6 py-3 bg-zinc-800 hover:bg-black disabled:bg-zinc-300 rounded-lg font-semibold text-white uppercase text-xs tracking-wider transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-zinc-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[90px] h-[48px] shadow-sm" // Fixed height
            >
              {isLoading ? (
                 <LoadingDots />
              ) : (
                'Send'
              )}
            </button>
          </div>
          {/* Linking Section */}
           <div className="mt-3 pt-3 border-t border-zinc-200 flex items-center justify-center space-x-2">
            {ticketId ? (
              <>
                 <span className="text-xs text-zinc-500">Link <span className="font-mono text-orange-600">{ticketId}</span>:</span>
                <button
                  onClick={() => handleLinkTicket('email')}
                  disabled={isLinking}
                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-300 rounded-md text-white text-xs font-medium disabled:cursor-not-allowed shadow-sm"
                >
                  {isLinking ? '...' : 'Email'}
                </button>
                <button
                  onClick={() => handleLinkTicket('telegram')}
                  disabled={isLinking}
                  className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 disabled:bg-zinc-300 rounded-md text-white text-xs font-medium disabled:cursor-not-allowed shadow-sm"
                >
                   {isLinking ? '...' : 'Telegram'}
                </button>
              </>
            ) : (
              <span className="text-xs text-zinc-400 italic">Send a message to get a Ticket ID for linking.</span>
            )}
          </div>
           {linkStatus && (
              <p className={`mt-2 text-center text-xs animate-pulse ${linkStatus.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>{linkStatus}</p>
            )}
        </div>
      </div>
    </main>
  );
} 