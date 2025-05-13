'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Interfaces
interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  agentName?: string;
  timestamp?: string;
}

interface ChatState {
  clientId: string;         // Unique client-side ID
  ticketId: string | null;  // Backend request_id
  messages: Message[];
  currentAgent: string | null;
  isLoading: boolean;
  linkStatus: string | null;
  isLinking: boolean;
  title: string; // Title for the chat (e.g., from first message)
}

// Helper Components
const LoadingDots = () => (
  <div className="flex space-x-1 items-center">
    <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
    <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
    <span className="h-1.5 w-1.5 bg-current rounded-full animate-bounce"></span>
  </div>
);

// Helper Functions
const getGuestUserId = () => {
  if (typeof window !== 'undefined') {
    let guestId = localStorage.getItem('fcGuestId');
    if (!guestId) {
      guestId = `guest_${crypto.randomUUID()}`;
      localStorage.setItem('fcGuestId', guestId);
    }
    return guestId;
  }
  return 'guest_fallback';
};

const createNewChatState = (clientId: string): ChatState => ({
  clientId,
  ticketId: null,
  messages: [
    {
      id: crypto.randomUUID(),
      sender: 'agent',
      text: 'Welcome to FireCrawl Support! How can I help you today?',
      agentName: 'TriageAgent',
      timestamp: new Date().toISOString(),
    }
  ],
  currentAgent: 'TriageAgent',
  isLoading: false,
  linkStatus: null,
  isLinking: false,
  title: `Chat ${clientId.substring(0, 4)}...` // Default title
});

const truncateText = (text: string, length: number) => {
  return text.length > length ? text.substring(0, length) + '...' : text;
}

// Main Component
export default function Home() {
  // Core State
  const [chats, setChats] = useState<Record<string, ChatState>>({});
  const [chatOrder, setChatOrder] = useState<string[]>([]);
  const [activeChatClientId, setActiveChatClientId] = useState<string | null>(null);
  const [guestUserId] = useState(getGuestUserId());
  const [isLoaded, setIsLoaded] = useState(false); // Track initial load from localStorage

  // Derived State (for the active chat)
  const activeChat = activeChatClientId ? chats[activeChatClientId] : null;
  const setInputValue = (value: string) => {
      // Need a way to store input per-chat or clear on switch - simple clear for now
      // This might require storing input state within each ChatState or a separate state object
  };
  const inputValue = ""; // Placeholder - needs proper handling for multi-chat

  // Refs
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

  // Effects
  // --- Load state from localStorage on initial mount ---
  useEffect(() => {
    const savedChats = localStorage.getItem('fcChats');
    const savedOrder = localStorage.getItem('fcChatOrder');
    const savedActiveId = localStorage.getItem('fcActiveChatId');

    if (savedChats && savedOrder) {
      try {
        const parsedChats = JSON.parse(savedChats);
        const parsedOrder = JSON.parse(savedOrder);
        setChats(parsedChats);
        setChatOrder(parsedOrder);
        if (savedActiveId && parsedChats[savedActiveId]) {
          setActiveChatClientId(savedActiveId);
        } else if (parsedOrder.length > 0) {
          setActiveChatClientId(parsedOrder[0]); // Fallback to first chat
        }
      } catch (e) {
        console.error("Failed to load chat state from localStorage", e);
        // Initialize with one new chat if loading fails
        const newClientId = crypto.randomUUID();
        setChats({ [newClientId]: createNewChatState(newClientId) });
        setChatOrder([newClientId]);
        setActiveChatClientId(newClientId);
      }
    } else {
      // No saved state, initialize with one new chat
      const newClientId = crypto.randomUUID();
      setChats({ [newClientId]: createNewChatState(newClientId) });
      setChatOrder([newClientId]);
      setActiveChatClientId(newClientId);
    }
    setIsLoaded(true);
  }, []);

  // --- Save state to localStorage whenever it changes ---
  useEffect(() => {
    if (!isLoaded) return; // Don't save until initial load is complete
    localStorage.setItem('fcChats', JSON.stringify(chats));
    localStorage.setItem('fcChatOrder', JSON.stringify(chatOrder));
    if (activeChatClientId) {
      localStorage.setItem('fcActiveChatId', activeChatClientId);
    }
  }, [chats, chatOrder, activeChatClientId, isLoaded]);

  // --- Scroll to bottom on message change in active chat ---
  useEffect(() => {
    if (activeChat) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeChat?.messages]); // Depend on active chat's messages

  // API Interaction Functions (operate on active chat)
  const updateActiveChatState = useCallback((newState: Partial<ChatState>) => {
    if (!activeChatClientId) return;
    setChats(prev => ({
      ...prev,
      [activeChatClientId]: { ...prev[activeChatClientId], ...newState }
    }));
  }, [activeChatClientId]);

  const addMessageToActiveChat = useCallback((message: Message) => {
    if (!activeChatClientId) return;
    setChats(prev => {
      const currentMessages = prev[activeChatClientId]?.messages || [];
      const updatedMessages = [...currentMessages, message].sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime());
      return {
        ...prev,
        [activeChatClientId]: { ...prev[activeChatClientId], messages: updatedMessages }
      };
    });
  }, [activeChatClientId]);

  const fetchAgentReply = useCallback(async (currentTicketId: string, clientId: string) => {
     if (!API_BASE_URL || !clientId) return;
     try {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const response = await fetch(`${API_BASE_URL}/requests/${currentTicketId}/messages?limit=50`);
        if (!response.ok) throw new Error(`Failed to fetch messages: ${response.status}`);
        const fetchedMessages: any[] = await response.json();

        // Get current messages for *this specific chat* to check for duplicates
        const currentChatMessages = chats[clientId]?.messages || [];

        const newAgentMessages: Message[] = fetchedMessages
          .filter(m => m.sender_type === 'agent' && !currentChatMessages.some(existing => existing.id === m.id))
          .map(m => ({ id: m.id, sender: 'agent', text: m.content, agentName: "Agent", timestamp: m.timestamp }));

        if (newAgentMessages.length > 0) {
             setChats(prev => {
                const targetChat = prev[clientId];
                if (!targetChat) return prev; // Safety check
                const allMessages = [...targetChat.messages, ...newAgentMessages].sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime());
                 return {
                    ...prev,
                    [clientId]: { ...targetChat, messages: allMessages }
                 };
            });
        }

        const requestDetailsResponse = await fetch(`${API_BASE_URL}/requests/${currentTicketId}`);
        if (requestDetailsResponse.ok) {
            const requestDetails = await requestDetailsResponse.json();
             setChats(prev => {
                const targetChat = prev[clientId];
                if (!targetChat) return prev;
                return {
                   ...prev,
                   [clientId]: { ...targetChat, currentAgent: requestDetails.assigned_agent || targetChat.currentAgent }
                };
            });
        }
     } catch (error) {
        console.error("Error fetching agent reply:", error);
        addMessageToActiveChat({ id: crypto.randomUUID(), sender: 'agent', text: 'Error fetching reply.', agentName: 'System Error', timestamp: new Date().toISOString() });
     }
   }, [API_BASE_URL, chats, addMessageToActiveChat]); // Include chats in dependency array

  const handleSendMessage = async (messageContent: string) => {
     if (messageContent.trim() === '' || !activeChat || !API_BASE_URL) return;

     const userMessage: Message = {
        id: crypto.randomUUID(),
        sender: 'user',
        text: messageContent.trim(),
        timestamp: new Date().toISOString(),
     };
     addMessageToActiveChat(userMessage);
     updateActiveChatState({ isLoading: true, linkStatus: null });

     let currentTicketId = activeChat.ticketId;
     const clientId = activeChat.clientId;
     let chatTitle = activeChat.title;

     try {
        if (!currentTicketId) {
            // Create new request
            const createRequestPayload = { content: userMessage.text, source: "web_chat", user_id: 0, metadata: { client_user_id: guestUserId, chat_client_id: clientId } };
            const response = await fetch(`${API_BASE_URL}/requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createRequestPayload) });
            if (!response.ok) throw new Error(`API Error (create request): ${response.status}`);
            const newRequest = await response.json();
            currentTicketId = newRequest.id;
            // Update state for the specific chat
            chatTitle = truncateText(userMessage.text, 25); // Set title from first message
            setChats(prev => ({
                ...prev,
                [clientId]: { ...prev[clientId], ticketId: currentTicketId, currentAgent: newRequest.assigned_agent || 'TriageAgent', title: chatTitle }
            }));
            await fetchAgentReply(currentTicketId!, clientId);
        } else {
            // Add message to existing request
            const createMessagePayload = { request_id: currentTicketId, sender_type: "user", sender_id: guestUserId, content: userMessage.text, metadata: {} };
            const response = await fetch(`${API_BASE_URL}/requests/${currentTicketId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createMessagePayload) });
            if (!response.ok) throw new Error(`API Error (create message): ${response.status}`);
            await fetchAgentReply(currentTicketId, clientId);
        }
     } catch (error) {
        console.error('Failed to send message:', error);
        addMessageToActiveChat({ id: crypto.randomUUID(), sender: 'agent', text: 'Error sending message.', agentName: 'System Error', timestamp: new Date().toISOString() });
        updateActiveChatState({ currentAgent: 'System Error' });
     } finally {
        updateActiveChatState({ isLoading: false });
     }
   };

  const handleLinkTicket = async (type: 'email' | 'telegram') => {
    if (!activeChat || !activeChat.ticketId || activeChat.isLinking) return;
    updateActiveChatState({ isLinking: true, linkStatus: `Linking to ${type}...` });

    const identifier = prompt(`Please enter your ${type} to link ticket ${activeChat.ticketId}:`);
    if (!identifier) {
      updateActiveChatState({ isLinking: false, linkStatus: null });
      return;
    }

    console.warn("Backend Update Required: No direct API endpoint to link contact after creation.");
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateActiveChatState({ linkStatus: `Mock: Linking ${type}: ${identifier} to ${activeChat.ticketId}. (Backend endpoint TBD)` });
      console.log(`Mock API: Link ${activeChat.ticketId} to ${type}: ${identifier}`);
    } catch (error) {
      console.error(`Failed to link ${type}:`, error);
      updateActiveChatState({ linkStatus: `Mock: Failed to link ${type}.` });
    } finally {
      updateActiveChatState({ isLinking: false });
      setTimeout(() => updateActiveChatState({ linkStatus: null }), 7000);
    }
  }

  // UI Event Handlers
  const handleCreateNewChat = () => {
    const newClientId = crypto.randomUUID();
    const newChat = createNewChatState(newClientId);
    setChats(prev => ({ ...prev, [newClientId]: newChat }));
    setChatOrder(prev => [...prev, newClientId]);
    setActiveChatClientId(newClientId);
  };

  const handleSelectChat = (clientId: string) => {
    setActiveChatClientId(clientId);
  };

  const handleDeleteChat = (clientIdToDelete: string) => {
     // Prevent deleting the last chat? Or handle it gracefully?
     if (chatOrder.length <= 1) {
        alert("Cannot delete the last chat.");
        return;
     }
     setChats(prev => {
        const { [clientIdToDelete]: _, ...rest } = prev;
        return rest;
     });
     setChatOrder(prev => prev.filter(id => id !== clientIdToDelete));
     // Set active chat to the first remaining one if the active one was deleted
     if (activeChatClientId === clientIdToDelete) {
        setActiveChatClientId(chatOrder.find(id => id !== clientIdToDelete) || null);
     }
  };

  // Input state needs careful handling for multi-chat
  // Using a temporary local state within ChatInput component itself
  const ChatInput = ({ onSendMessage, isLoading }: { onSendMessage: (msg: string) => void, isLoading: boolean }) => {
     const [localInputValue, setLocalInputValue] = useState("");

     const handleSend = () => {
        if (localInputValue.trim() !== "") {
           onSendMessage(localInputValue);
           setLocalInputValue("");
        }
     };

     return (
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={localInputValue}
            onChange={(e) => setLocalInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
            placeholder={isLoading ? 'Waiting for agent...' : 'Type your question...'}
            className="flex-1 p-3 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-zinc-900 placeholder-zinc-400 disabled:opacity-60 text-sm shadow-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || localInputValue.trim() === ''}
            className="px-6 py-3 bg-zinc-800 hover:bg-black disabled:bg-zinc-300 rounded-lg font-semibold text-white uppercase text-xs tracking-wider transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-zinc-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[90px] h-[48px] shadow-sm"
          >
            {isLoading ? <LoadingDots /> : 'Send'}
          </button>
        </div>
     );
  };


  if (!isLoaded || !activeChatClientId) {
    // Show loading state or minimal UI until state is loaded
    return (
       <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-zinc-50 text-zinc-900 font-sans">
          Loading chats...
       </main>
    );
  }

  // Render UI
  return (
    <main className="flex h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-200 bg-zinc-100 flex flex-col h-full">
        <div className="p-4 border-b border-zinc-200">
          <button
            onClick={handleCreateNewChat}
            className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm font-medium shadow-sm"
          >
            + New Chat
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {chatOrder.map(clientId => {
            const chat = chats[clientId];
            const isActive = clientId === activeChatClientId;
            return (
              <a
                key={clientId}
                href="#"
                onClick={(e) => { e.preventDefault(); handleSelectChat(clientId); }}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium group ${isActive ? 'bg-orange-100 text-orange-700' : 'text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'}`}
              >
                <span className="flex-1 truncate">{chat?.title || `Chat ${clientId.substring(0,4)}...`}</span>
                 <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteChat(clientId); }}
                    className={`ml-2 p-0.5 rounded text-zinc-400 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 ${isActive ? 'opacity-100' : ''}`}
                    aria-label="Delete chat"
                 >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                     </svg>
                 </button>
              </a>
            );
          })}
        </nav>
      </div>

      {/* Main Chat Area */}
      {activeChat ? (
        <div className="flex-1 flex flex-col h-full">
          {/* Chat Header (now uses activeChat state) */}
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-white">
            <h1 className="text-lg md:text-xl font-semibold text-zinc-800">
              <span className="text-orange-500">🔥</span> FireCrawl Support
            </h1>
            <div className="text-xs text-zinc-500">
              Ticket ID: <span className="font-mono px-2 py-1 bg-zinc-100 rounded text-orange-600">{activeChat.ticketId || 'N/A'}</span>
            </div>
          </div>

          {/* Agent Status (now uses activeChat state) */}
          <div className="p-1.5 text-center text-xs bg-zinc-50 text-zinc-600 border-b border-zinc-200">
            Agent: <span className="font-semibold text-orange-600">{activeChat.currentAgent || '...'}</span>
          </div>

          {/* Chat Messages (now uses activeChat state) */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-white scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-zinc-100">
            {activeChat.messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] md:max-w-[70%] px-3.5 py-2.5 rounded-xl shadow-sm ${msg.sender === 'user' ? 'bg-orange-500 text-white rounded-br-none' : 'bg-zinc-100 text-zinc-800 rounded-bl-none'}`}>
                  {msg.sender === 'agent' && msg.agentName && (
                    <p className="text-xs text-orange-600 mb-1 font-medium">{msg.agentName}</p>
                  )}
                  <p className="text-sm leading-snug whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            {activeChat.isLoading && activeChat.messages[activeChat.messages.length -1]?.sender === 'user' && (
                <div className="flex justify-start">
                  <div className="flex items-center space-x-2 max-w-xs md:max-w-md lg:max-w-lg px-3.5 py-2.5 rounded-xl shadow-sm bg-zinc-100 text-zinc-500 rounded-bl-none">
                      <LoadingDots />
                      <span className="text-xs italic">{(activeChat.currentAgent && activeChat.currentAgent !== 'System Error' ) ? activeChat.currentAgent : 'Agent'} is typing...</span>
                  </div>
                </div>
             )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area (now uses activeChat state) */}
          <div className="p-4 border-t border-zinc-200 bg-zinc-50">
            <ChatInput 
                onSendMessage={handleSendMessage} 
                isLoading={activeChat.isLoading}
            />
            {/* Linking Section (now uses activeChat state) */}
            <div className="mt-3 pt-3 border-t border-zinc-200 flex items-center justify-center space-x-2">
              {activeChat.ticketId ? (
                <>
                  <span className="text-xs text-zinc-500">Link <span className="font-mono text-orange-600">{activeChat.ticketId}</span>:</span>
                  <button onClick={() => handleLinkTicket('email')} disabled={activeChat.isLinking} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-300 rounded-md text-white text-xs font-medium disabled:cursor-not-allowed shadow-sm">{activeChat.isLinking ? '...' : 'Email'}</button>
                  <button onClick={() => handleLinkTicket('telegram')} disabled={activeChat.isLinking} className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 disabled:bg-zinc-300 rounded-md text-white text-xs font-medium disabled:cursor-not-allowed shadow-sm">{activeChat.isLinking ? '...' : 'Telegram'}</button>
                </>
              ) : (
                <span className="text-xs text-zinc-400 italic">Send a message to get a Ticket ID for linking.</span>
              )}
            </div>
            {activeChat.linkStatus && (
              <p className={`mt-2 text-center text-xs animate-pulse ${activeChat.linkStatus.includes('successfully') || activeChat.linkStatus.includes('TBD') ? 'text-green-600' : 'text-red-600'}`}>{activeChat.linkStatus}</p>
            )}
          </div>
        </div>
      ) : (
         <div className="flex-1 flex items-center justify-center text-zinc-500">Select a chat or create a new one</div>
      )}
    </main>
  );
} 