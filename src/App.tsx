import React, { useState, useEffect, useRef } from "react";
import { 
  auth, db, googleProvider, signInWithPopup, onAuthStateChanged, 
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
  const [role, setRole] = useState<"user" | "it" | null>(null);
  const [sector, setSector] = useState("");
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
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
    if (!isAuthReady || !user) return;

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
  }, [isAuthReady, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login error:", err);
      setError("Falha ao entrar com Google.");
    }
  };

  const handleLogout = () => {
    auth.signOut();
    setIsAuthReady(false);
    setRole(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && user && role) {
      const messageData: Message = {
        text: inputText,
        sender: user.displayName || "Usuário",
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

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center"
        >
          <Monitor className="text-blue-600 w-12 h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Suporte TI</h1>
          <p className="text-gray-500 mb-8">Entre com sua conta para acessar o chat de suporte.</p>
          <button
            onClick={handleLogin}
            className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-medium flex items-center justify-center gap-3 hover:bg-gray-50 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar com Google
          </button>
        </motion.div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Escolha seu Perfil</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setRole("user")}
              className="p-4 rounded-xl border-2 border-gray-100 hover:border-blue-600 hover:bg-blue-50 transition-all flex flex-col items-center gap-2"
            >
              <UserIcon className="text-blue-600" />
              <span className="font-medium">Usuário</span>
            </button>
            <button
              onClick={() => setRole("it")}
              className="p-4 rounded-xl border-2 border-gray-100 hover:border-blue-600 hover:bg-blue-50 transition-all flex flex-col items-center gap-2"
            >
              <Monitor className="text-blue-600" />
              <span className="font-medium">Técnico TI</span>
            </button>
          </div>
          {role === "user" && (
            <input
              type="text"
              placeholder="Seu Setor (Ex: Financeiro)"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 mb-4 outline-none focus:ring-2 focus:ring-blue-500"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
            />
          )}
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
            <p className="text-sm font-semibold text-gray-900">{user.displayName}</p>
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
              const isMe = msg.uid === user.uid;
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
