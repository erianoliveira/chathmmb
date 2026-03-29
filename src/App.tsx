import React, { useState, useEffect, useRef } from "react";
import { 
  auth, db, signInAnonymously, onAuthStateChanged, 
  collection, addDoc, query, orderBy, limit, onSnapshot, User, getDocFromServer, doc 
} from "./firebase";
import { Send, User as UserIcon, Monitor, MessageSquare, Clock, LogOut, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  text: string;
  sender: string;
  timestamp: number;
  role: "user" | "it";
  sector?: string;
  uid: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"user" | "it" | null>(null);
  const [sector, setSector] = useState("");
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        isAnonymous: auth.currentUser?.isAnonymous,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    setError("Erro de permissão ou conexão com o banco de dados.");
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user || !isJoined) return;

    const q = query(
      collection(db, "messages"),
      orderBy("timestamp", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push(doc.data() as Message);
      });
      setMessages(msgs);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, "messages");
    });

    return () => unsubscribe();
  }, [isAuthReady, user, isJoined]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role || (role === "user" && !sector)) return;

    try {
      if (!user) {
        await signInAnonymously(auth);
      }
      setIsJoined(true);
    } catch (err) {
      console.error("Auth error:", err);
      setError("Falha ao entrar no chat.");
    }
  };

  const handleLogout = () => {
    auth.signOut();
    setIsJoined(false);
    setRole(null);
    setName("");
    setSector("");
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && user && role) {
      const messageData: Message = {
        text: inputText,
        sender: name,
        timestamp: Date.now(),
        role: role,
        sector: role === "user" ? sector : undefined,
        uid: user.uid,
      };
      
      try {
        await addDoc(collection(db, "messages"), messageData);
        setInputText("");
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "messages");
      }
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
                  <UserIcon size={20} />
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
          {error && <p className="text-red-500 text-xs text-center mt-4">{error}</p>}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F7]">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <MessageSquare className="text-white w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Suporte TI</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-xs text-gray-500">Conectado</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">{name}</p>
            <p className="text-xs text-gray-500 uppercase font-bold">
              {role === "it" ? "Técnico de TI" : sector}
            </p>
          </div>
          <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border-b border-red-100 p-3 flex items-center justify-center gap-2 text-red-600 text-sm">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)} className="ml-4 underline">Fechar</button>
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => {
              const isMe = msg.uid === user?.uid;
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
                        <span className="font-normal opacity-60">• {msg.role === 'it' ? 'TI' : msg.sector}</span>
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
