import React, { useEffect, useRef, useState } from "react";
import Client from "./Client";
import Editor from "./Editor";
import { initSocket } from "../Socket";
import { ACTIONS } from "../Actions";
import {
  useNavigate,
  useLocation,
  Navigate,
  useParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";

const LANGUAGES = [
  "python3",
  "java",
  "cpp",
  "nodejs",
  "c",
  "ruby",
  "go",
  "scala",
  "bash",
  "sql",
  "pascal",
  "csharp",
  "php",
  "swift",
  "rust",
  "r",
];

function EditorPage() {
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [isCompileWindowOpen, setIsCompileWindowOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("cpp");
  const codeRef = useRef(null);
  const outputRef = useRef("");
  const [socketConnected, setSocketConnected] = useState(false);

  const Location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const socketRef = useRef(null);
  const usernameRef = useRef(Location.state?.username);

  useEffect(() => {
    const init = async () => {
      try {
        socketRef.current = await initSocket();
        setSocketConnected(true);

        const handleErrors = (err) => {
          console.log("Error", err);
          toast.error("Socket connection failed, Try again later");
          navigate("/");
        };

        socketRef.current.on("connect_error", (err) => handleErrors(err));
        socketRef.current.on("connect_failed", (err) => handleErrors(err));

        socketRef.current.emit(ACTIONS.JOIN, {
          roomId,
          username: usernameRef.current,
        });

        socketRef.current.on(
          ACTIONS.JOINED,
          ({ clients, username, socketId }) => {
            if (username !== usernameRef.current) {
              toast.success(`${username} joined the room.`);
            }
            setClients(clients);
            socketRef.current.emit(ACTIONS.SYNC_CODE, {
              code: codeRef.current,
              socketId,
            });
          }
        );

        socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
          toast.success(`${username} left the room`);
          setClients((prev) => {
            return prev.filter((client) => client.socketId !== socketId);
          });
        });

        socketRef.current.on(ACTIONS.LANGUAGE_CHANGE, ({ language }) => {
          setSelectedLanguage(language);
        });

        socketRef.current.on(ACTIONS.OUTPUT_CHANGE, ({ output }) => {
          setOutput(output);
          outputRef.current = output;
        });

        socketRef.current.on("disconnect", () => {
          setSocketConnected(false);
        });

        socketRef.current.on("reconnect", () => {
          setSocketConnected(true);
          socketRef.current.emit(ACTIONS.JOIN, {
            roomId,
            username: usernameRef.current,
          });
        });

      } catch (err) {
        console.log("Socket initialization error:", err);
        toast.error("Failed to initialize socket connection");
        navigate("/");
      }
    };

    init();

    return () => {
      if (socketRef.current) {
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.off(ACTIONS.LANGUAGE_CHANGE);
        socketRef.current.off(ACTIONS.OUTPUT_CHANGE);
        socketRef.current.off("connect_error");
        socketRef.current.off("connect_failed");
        socketRef.current.off("disconnect");
        socketRef.current.off("reconnect");
        socketRef.current.disconnect();
      }
    };
  }, [roomId, navigate]);

  if (!Location.state) {
    return <Navigate to="/" />;
  }

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success(`Room ID is copied`);
    } catch (error) {
      console.log(error);
      toast.error("Unable to copy the room ID");
    }
  };

  const leaveRoom = async () => {
    if (socketRef.current) {
      socketRef.current.emit(ACTIONS.LEAVE);
      socketRef.current.disconnect();
    }
    navigate("/");
  };

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    socketRef.current.emit(ACTIONS.LANGUAGE_CHANGE, {
      roomId,
      language
    });
  };

  const runCode = async () => {
    if (!socketConnected) {
      toast.error("Connection lost. Trying to reconnect...");
      return;
    }

    setIsCompiling(true);
    try {
      const response = await axios.post("https://codesync-hmt6.onrender.com", {
        code: codeRef.current,
        language: selectedLanguage,
        roomId
      });
      
      const result = response.data.output || JSON.stringify(response.data);
      setOutput(result);
      outputRef.current = result;
      
      // socketRef.current.emit(ACTIONS.OUTPUT_CHANGE, {
      //   roomId,
      //   output: result
      // });
    } catch (error) {
      const errorMessage = error.response?.data?.error || "An error occurred";
      setOutput(errorMessage);
      outputRef.current = errorMessage;
      
      // socketRef.current.emit(ACTIONS.OUTPUT_CHANGE, {
      //   roomId,
      //   output: errorMessage
      // });
    } finally {
      setIsCompiling(false);
    }
  };

  const toggleCompileWindow = () => {
    setIsCompileWindowOpen(!isCompileWindowOpen);
  };

  return (
    <div style={styles.container}>
      {/* Sidebar with Glass Morphism Effect */}
      <div style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <img 
            src="/images/codecast.png" 
            alt="Logo" 
            style={styles.logo} 
          />
          <div style={styles.roomIndicator}>
            <span style={styles.roomLabel}>Room:</span>
            <span style={styles.roomId}>{roomId.substring(0, 8)}...</span>
          </div>
        </div>
        
        <div style={styles.membersContainer}>
          <div style={styles.sectionHeader}>
            <i className="fas fa-users" style={styles.sectionIcon}></i>
            <h4 style={styles.sectionTitle}>Active Members</h4>
            <span style={styles.memberCount}>{clients.length}</span>
          </div>
          <div style={styles.membersList}>
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
        </div>
        
        <div style={styles.sidebarButtons}>
          <button 
            style={styles.copyButton} 
            onClick={copyRoomId}
          >
            <i className="fas fa-copy" style={styles.buttonIcon}></i>
            Copy Room ID
          </button>
          <button 
            style={styles.leaveButton} 
            onClick={leaveRoom}
          >
            <i className="fas fa-sign-out-alt" style={styles.buttonIcon}></i>
            Leave Room
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div style={styles.editorArea}>
        <div style={styles.toolbar}>
          <div style={styles.languageSelector}>
            <i className="fas fa-code" style={styles.selectorIcon}></i>
            <select
              style={styles.languageSelect}
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang} style={styles.option}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Editor
          socketRef={socketRef}
          roomId={roomId}
          onCodeChange={(code) => { codeRef.current = code; }}
        />
      </div>

      {/* Floating Action Button */}
      <button
        style={styles.compilerToggle}
        onClick={toggleCompileWindow}
      >
        <i className={`fas ${isCompileWindowOpen ? 'fa-times' : 'fa-terminal'}`} 
           style={styles.toggleIcon}></i>
        {isCompileWindowOpen ? "Close Console" : "Open Console"}
      </button>

      {/* Compiler Output Panel */}
      <div style={{
        ...styles.compilerPanel,
        height: isCompileWindowOpen ? "30vh" : "0",
        padding: isCompileWindowOpen ? "16px" : "0",
        borderTop: isCompileWindowOpen ? "1px solid rgba(255,255,255,0.1)" : "none"
      }}>
        <div style={styles.compilerHeader}>
          <div style={styles.outputHeader}>
            <i className="fas fa-play-circle" style={styles.outputIcon}></i>
            <h5 style={styles.compilerTitle}>
              {selectedLanguage.toUpperCase()} Output
              <span style={styles.statusIndicator}>
                {isCompiling ? " (Running)" : ""}
              </span>
            </h5>
          </div>
          <div style={styles.compilerActions}>
            <button
              style={{
                ...styles.runButton,
                ...(isCompiling ? styles.runButtonDisabled : {})
              }}
              onClick={runCode}
              disabled={isCompiling}
            >
              <i className="fas fa-play" style={styles.actionIcon}></i>
              {isCompiling ? "Running..." : "Run Code"}
            </button>
            <button 
              style={styles.closeButton}
              onClick={toggleCompileWindow}
            >
              <i className="fas fa-times" style={styles.actionIcon}></i>
              Close
            </button>
          </div>
        </div>
        <pre style={styles.output}>
          {output || (
            <div style={styles.placeholder}>
              <i className="fas fa-arrow-up" style={styles.placeholderIcon}></i>
              <p>Click "Run Code" to see your output here</p>
            </div>
          )}
        </pre>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    overflow: 'hidden',
    fontFamily: "'Inter', sans-serif"
  },
  sidebar: {
    width: '280px',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    borderRight: '1px solid rgba(255,255,255,0.05)',
    boxShadow: '4px 0 15px rgba(0,0,0,0.1)',
    zIndex: 2
  },
  logoContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  logo: {
    height: '50px',
    marginBottom: '15px',
    filter: 'drop-shadow(0 0 10px rgba(96, 165, 250, 0.5))'
  },
  roomIndicator: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px'
  },
  roomLabel: {
    color: '#94a3b8',
    marginRight: '6px'
  },
  roomId: {
    fontWeight: '600',
    color: '#e2e8f0'
  },
  membersContainer: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  sectionIcon: {
    color: '#60a5fa',
    marginRight: '10px',
    fontSize: '14px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#cbd5e0',
    margin: 0,
    flex: 1
  },
  memberCount: {
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    color: '#60a5fa',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: '600'
  },
  membersList: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '8px'
  },
  sidebarButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '20px'
  },
  buttonIcon: {
    marginRight: '8px'
  },
  copyButton: {
    backgroundColor: 'rgba(56, 161, 105, 0.2)',
    color: '#38a169',
    border: '1px solid rgba(56, 161, 105, 0.3)',
    padding: '10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'rgba(56, 161, 105, 0.3)'
    }
  },
  leaveButton: {
    backgroundColor: 'rgba(229, 62, 62, 0.2)',
    color: '#e53e3e',
    border: '1px solid rgba(229, 62, 62, 0.3)',
    padding: '10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'rgba(229, 62, 62, 0.3)'
    }
  },
  editorArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative'
  },
  toolbar: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'flex-end',
    backdropFilter: 'blur(5px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    zIndex: 1
  },
  languageSelector: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: '6px',
    padding: '4px 8px',
    border: '1px solid rgba(74, 85, 104, 0.5)'
  },
  selectorIcon: {
    color: '#60a5fa',
    marginRight: '8px',
    fontSize: '14px'
  },
  languageSelect: {
    backgroundColor: 'transparent',
    color: 'white',
    border: 'none',
    padding: '4px 8px',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    fontWeight: '500'
  },
  option: {
    backgroundColor: '#1e293b',
    padding: '8px'
  },
  compilerToggle: {
    position: 'fixed',
    bottom: '25px',
    right: '25px',
    backgroundColor: '#60a5fa',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '50px',
    cursor: 'pointer',
    fontWeight: '500',
    zIndex: 100,
    boxShadow: '0 4px 15px rgba(96, 165, 250, 0.3)',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#3b82f6',
      transform: 'translateY(-2px)'
    }
  },
  toggleIcon: {
    marginRight: '8px',
    fontSize: '14px'
  },
  compilerPanel: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    backdropFilter: 'blur(10px)',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 99,
    display: 'flex',
    flexDirection: 'column'
  },
  compilerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  outputHeader: {
    display: 'flex',
    alignItems: 'center'
  },
  outputIcon: {
    color: '#60a5fa',
    marginRight: '10px',
    fontSize: '18px'
  },
  compilerTitle: {
    fontSize: '15px',
    fontWeight: '600',
    margin: 0,
    color: '#e2e8f0',
    display: 'flex',
    alignItems: 'center'
  },
  statusIndicator: {
    color: '#94a3b8',
    fontSize: '13px',
    marginLeft: '8px',
    fontWeight: 'normal'
  },
  compilerActions: {
    display: 'flex',
    gap: '10px'
  },
  actionIcon: {
    marginRight: '6px',
    fontSize: '12px'
  },
  runButton: {
    backgroundColor: 'rgba(56, 161, 105, 0.2)',
    color: '#38a169',
    border: '1px solid rgba(56, 161, 105, 0.3)',
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'rgba(56, 161, 105, 0.3)'
    }
  },
  runButtonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed'
  },
  closeButton: {
    backgroundColor: 'rgba(74, 85, 104, 0.2)',
    color: '#cbd5e0',
    border: '1px solid rgba(74, 85, 104, 0.3)',
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'rgba(74, 85, 104, 0.3)'
    }
  },
  output: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    padding: '15px',
    borderRadius: '6px',
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowY: 'auto',
    fontFamily: "'Fira Code', monospace",
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#e2e8f0'
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#64748b',
    fontSize: '14px'
  },
  placeholderIcon: {
    fontSize: '24px',
    marginBottom: '10px',
    opacity: 0.5
  }
};

export default EditorPage;
