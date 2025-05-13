'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  agentName?: string;
  timestamp?: string; // Added for sorting
}

// Simple loading dots component inspired by the reference CSS
const LoadingDots = () => (
  <div className="flex space-x-1 items-center">
    <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
    <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
    <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce"></span>
  </div>
);

// Temporary unique guest ID generator
const getGuestUserId = () => {
  if (typeof window !== 'undefined') {
    let guestId = localStorage.getItem('fcGuestId');
    if (!guestId) {
      guestId = `guest_${crypto.randomUUID()}`;
      localStorage.setItem('fcGuestId', guestId);
    }
    return guestId;
  }
  return 'guest_fallback'; // Fallback for SSR or non-browser env
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [currentAgent, setCurrentAgent] = useState<string | null>('Connecting...');
  const [isLoading, setIsLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false); // State for linking process
  const [linkStatus, setLinkStatus] = useState<string | null>(null); // State for linking feedback
  const [guestUserId] = useState(getGuestUserId());

  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

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
        agentName: 'TriageAgent',
        timestamp: new Date().toISOString(),
      }
    ]);
    setCurrentAgent('TriageAgent');
  }, []);

  const fetchAgentReply = async (currentTicketId: string) => {
    try {
      // Wait a brief moment for the backend to process and respond
      await new Promise(resolve => setTimeout(resolve, 2000)); // Adjust delay as needed

      const response = await fetch(`${API_BASE_URL}/requests/${currentTicketId}/messages?limit=50`); // Fetch last 50 messages
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }
      const fetchedMessages: any[] = await response.json();
      
      const newAgentMessages: Message[] = fetchedMessages
        .filter(m => m.sender_type === 'agent' && !messages.some(existing => existing.id === m.id))
        .map(m => ({
          id: m.id,
          sender: 'agent',
          text: m.content,
          agentName: "Agent", // Placeholder, need to get actual agent name if available in message or from request
          timestamp: m.timestamp,
        }));

      if (newAgentMessages.length > 0) {
        setMessages(prev => [...prev, ...newAgentMessages].sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime()));
      }

      // Fetch request details to update agent name
      const requestDetailsResponse = await fetch(`${API_BASE_URL}/requests/${currentTicketId}`);
      if (requestDetailsResponse.ok) {
        const requestDetails = await requestDetailsResponse.json();
        if (requestDetails.assigned_agent) {
            setCurrentAgent(requestDetails.assigned_agent);
        }
      }

    } catch (error) {
      console.error("Error fetching agent reply:", error);
      // Optionally add an error message to the chat for the user
    }
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isLoading || !API_BASE_URL) return;

    const userMessageText = inputValue.trim();
    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: userMessageText,
      timestamp: new Date().toISOString(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setLinkStatus(null);

    let currentTicketId = ticketId;

    try {
      if (!currentTicketId) {
        // First message, create a new support request
        const createRequestPayload = {
          content: userMessageText,
          source: "web_chat",
          user_id: 0, // Using 0 as a placeholder for guest user_id as per model
          metadata: { client_user_id: guestUserId } 
        };
        const response = await fetch(`${API_BASE_URL}/requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createRequestPayload),
        });
        if (!response.ok) throw new Error(`API Error (create request): ${response.status}`);
        const newRequest = await response.json();
        currentTicketId = newRequest.id;
        setTicketId(currentTicketId);
        setCurrentAgent(newRequest.assigned_agent || 'TriageAgent'); // Update agent from new request
         // Agent processing is background, so fetch reply after a delay
        await fetchAgentReply(currentTicketId!);

      } else {
        // Subsequent message, add to existing request
        const createMessagePayload = {
          request_id: currentTicketId,
          sender_type: "user",
          sender_id: guestUserId, 
          content: userMessageText,
          metadata: {}
        };
        const response = await fetch(`${API_BASE_URL}/requests/${currentTicketId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createMessagePayload),
        });
        if (!response.ok) throw new Error(`API Error (create message): ${response.status}`);
        // Agent processing is background, so fetch reply after a delay
        await fetchAgentReply(currentTicketId);
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        sender: 'agent',
        text: 'Sorry, an error occurred while sending your message. Please try again.',
        agentName: 'System Error',
        timestamp: new Date().toISOString(),
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
    const identifier = prompt(`Please enter your ${type} to link ticket ${ticketId}:`);
    if (!identifier) {
      setIsLinking(false);
      setLinkStatus(null);
      return;
    }
    
    // Backend modification needed here. For now, this is a mock.
    console.warn("Backend Update Required: No direct API endpoint to update support request with email/telegram after creation through orchestrator.");
    try {
      // MOCK: Simulating an attempt and providing feedback
      // In a real scenario, you might PUT to /requests/{ticketId} if backend model SupportRequestUpdate is extended
      // or call a new dedicated endpoint like /requests/{ticketId}/link-contact
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      // Example: Assume for now we can't actually link it via a direct orchestrator call shown so far.
      // If we could, it would be an API call here.
      setLinkStatus(`Mock: Linking ${type}: ${identifier} to ${ticketId}. (Backend endpoint TBD)`);
      console.log(`Mock API: Link ${ticketId} to ${type}: ${identifier}`);
      // setLinkStatus(`${type.charAt(0).toUpperCase() + type.slice(1)} linked successfully!`); // If it were real
    } catch (error) {
      console.error(`Failed to link ${type}:`, error);
      setLinkStatus(`Mock: Failed to link ${type}.`);
    } finally {
      setIsLinking(false);
      setTimeout(() => setLinkStatus(null), 7000); // Increased timeout for the mock status
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
          {/* Combined isLoading and agent typing indicator */}
          {isLoading && messages[messages.length -1]?.sender === 'user' && (
            <div className="flex justify-start">
               <div className="flex items-center space-x-2 max-w-xs md:max-w-md lg:max-w-lg px-3.5 py-2.5 rounded-xl shadow-sm bg-zinc-100 text-zinc-500 rounded-bl-none">
                  <LoadingDots />
                  <span className="text-xs italic">{(currentAgent && currentAgent !== 'System Error' ) ? currentAgent : 'Agent'} is typing...</span>
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
              {isLoading && messages[messages.length -1]?.sender === 'user' ? (
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
              <p className={`mt-2 text-center text-xs animate-pulse ${linkStatus.includes('successfully') || linkStatus.includes('TBD') ? 'text-green-600' : 'text-red-600'}`}>{linkStatus}</p>
            )}
        </div>
      </div>
    </main>
  );
} 