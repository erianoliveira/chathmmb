import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { Send, User, Monitor, MessageSquare, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  text: string;
  sender: string;
  timestamp: number;
  role: "user" | "it";
}

export default function App() {
  const [socket, setSocket] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"user" | "it" | null>(null);
  const [sector, setSector] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to the same host
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && role && (role === "it" || sector)) {
      socket?.emit("join", "global-support");
      setIsJoined(true);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && socket) {
      const messageData: Message = {
        text: inputText,
        sender: name,
        timestamp: Date.now(),
        role: role as "user" | "it",
      };
      socket.emit("message", { room: "global-support", ...messageData });
      setInputText("");
    }
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="bg-blue-600 p-4 rounded-full mb-4">
              <Monitor className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Suporte TI Instantâneo</h1>
            <p className="text-gray-500 text-center mt-2">Conecte-se para suporte em tempo real</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seu Nome</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Ex: João Silva"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Eu sou...</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole("user")}
                  className={`py-3 px-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    role === "user" ? "border-blue-600 bg-blue-50 text-blue-600" : "border-gray-100 hover:border-gray-200 text-gray-600"
                  }`}
                >
                  <User size={20} />
                  <span className="font-medium">Usuário</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("it")}
                  className={`py-3 px-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    role === "it" ? "border-blue-600 bg-blue-50 text-blue-600" : "border-gray-100 hover:border-gray-200 text-gray-600"
                  }`}
                >
                  <Monitor size={20} />
                  <span className="font-medium">Técnico TI</span>
                </button>
              </div>
            </div>

            {role === "user" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-1">Setor / Unidade</label>
                <input
                  required
                  type="text"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Ex: Financeiro / Bloco A"
                />
              </motion.div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              Entrar no Chat
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F7] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <MessageSquare className="text-white w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 leading-tight">Suporte TI</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-gray-500 font-medium">Online</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">{name}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">
            {role === "it" ? "Técnico de TI" : sector}
          </p>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        <div className="max-w-4xl mx-auto space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => {
              const isMe = msg.sender === name;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] ${isMe ? "order-2" : ""}`}>
                    {!isMe && (
                      <p className="text-xs font-bold text-gray-500 mb-1 ml-1 flex items-center gap-1">
                        {msg.sender} 
                        <span className="font-normal opacity-60">• {msg.role === 'it' ? 'TI' : 'Usuário'}</span>
                      </p>
                    )}
                    <div
                      className={`px-4 py-3 rounded-2xl shadow-sm ${
                        isMe
                          ? "bg-blue-600 text-white rounded-tr-none"
                          : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
                      }`}
                    >
                      <p className="text-[15px] leading-relaxed">{msg.text}</p>
                      <div className={`flex items-center gap-1 mt-1 text-[10px] opacity-70 ${isMe ? "justify-end" : "justify-start"}`}>
                        <Clock size={10} />
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-white p-4 border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-100"
          >
            <Send size={20} />
          </button>
        </form>
      </footer>
    </div>
  );
}
