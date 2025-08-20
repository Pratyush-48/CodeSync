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
  const [socketConnected, setSocketConnected] = useState(false);

  const codeRef = useRef("");
  const outputRef = useRef("");
  
  const location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const socketRef = useRef(null);
  const usernameRef = useRef(location.state?.username);

  // Get backend URL based on environment
  const getBackendURL = () => {
    return process.env.REACT_APP_BACKEND_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://codesync-hmt6.onrender.com'
        : 'http://localhost:5000');
  };

  useEffect(() => {
    const init = async () => {
      try {
        socketRef.current = initSocket();
        setSocketConnected(true);

        const handleErrors = (err) => {
          console.log("Socket error", err);
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
            
            // Request code sync from the first client in the room
            if (clients.length > 1 && clients[0].socketId !== socketRef.current.id) {
              socketRef.current.emit(ACTIONS.SYNC_REQUEST, {
                roomId,
                targetSocketId: clients[0].socketId
              });
            }
          }
        );

        socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
          toast.success(`${username} left the room`);
          setClients((prev) => {
            return prev.filter((client) => client.socketId !== socketId);
          });
        });

        socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
          codeRef.current = code;
        });

        socketRef.current.on(ACTIONS.LANGUAGE_CHANGE, ({ language }) => {
          setSelectedLanguage(language);
        });

        socketRef.current.on(ACTIONS.OUTPUT_CHANGE, ({ output }) => {
          setOutput(output);
          outputRef.current = output;
        });

        socketRef.current.on(ACTIONS.SYNC_REQUEST, ({ targetSocketId }) => {
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId: targetSocketId,
            roomId
          });
        });

        socketRef.current.on(ACTIONS.SYNC_CODE, ({ code }) => {
          codeRef.current = code;
        });

        socketRef.current.on("disconnect", () => {
          setSocketConnected(false);
          toast.error("Connection lost. Trying to reconnect...");
        });

        socketRef.current.on("reconnect", () => {
          setSocketConnected(true);
          socketRef.current.emit(ACTIONS.JOIN, {
            roomId,
            username: usernameRef.current,
          });
          toast.success("Reconnected successfully!");
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
        socketRef.current.off(ACTIONS.CODE_CHANGE);
        socketRef.current.off(ACTIONS.LANGUAGE_CHANGE);
        socketRef.current.off(ACTIONS.OUTPUT_CHANGE);
        socketRef.current.off(ACTIONS.SYNC_REQUEST);
        socketRef.current.off(ACTIONS.SYNC_CODE);
        socketRef.current.off("connect_error");
        socketRef.current.off("connect_failed");
        socketRef.current.off("disconnect");
        socketRef.current.off("reconnect");
        socketRef.current.disconnect();
      }
    };
  }, [roomId, navigate]);

  if (!location.state) {
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
    setOutput("Compiling...");
    
    try {
      const backendURL = getBackendURL();
      const response = await axios.post(`${backendURL}/api/compile`, {
        code: codeRef.current,
        language: selectedLanguage,
        roomId
      });
      
      const result = response.data.output || JSON.stringify(response.data);
      setOutput(result);
      outputRef.current = result;
      
      // Broadcast output to all clients
      socketRef.current.emit(ACTIONS.OUTPUT_CHANGE, {
        roomId,
        output: result
      });
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || "An error occurred";
      setOutput(errorMessage);
      outputRef.current = errorMessage;
      
      // Broadcast error to all clients
      socketRef.current.emit(ACTIONS.OUTPUT_CHANGE, {
        roomId,
        output: errorMessage
      });
      
    } finally {
      setIsCompiling(false);
    }
  };

  const toggleCompileWindow = () => {
    setIsCompileWindowOpen(!isCompileWindowOpen);
  };

  const clearOutput = () => {
    setOutput("");
    outputRef.current = "";
    
    // Broadcast clear output to all clients
    socketRef.current.emit(ACTIONS.OUTPUT_CHANGE, {
      roomId,
      output: ""
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <img 
            src="/images/code.png" 
            alt="Logo" 
            style={styles.logo} 
          />
          <div style={styles.roomIndicator}>
            <span style={styles.roomLabel}>Room:</span>
            <span style={styles.roomId}>{roomId.substring(0, 8)}...</span>
          </div>
          <div style={styles.connectionStatus}>
            <div style={{
              ...styles.statusDot,
              backgroundColor: socketConnected ? '#4CAF50' : '#F44336'
            }}></div>
            <span>{socketConnected ? 'Connected' : 'Disconnected'}</span>
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
              <Client 
                key={client.socketId} 
                username={client.username} 
                isCurrentUser={client.username === usernameRef.current}
              />
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
          onCodeChange={(code) => { 
            codeRef.current = code;
            // Broadcast code change to all clients
            socketRef.current.emit(ACTIONS.CODE_CHANGE, {
              roomId,
              code
            });
          }}
          initialCode={codeRef.current}
        />
      </div>

      {/* Compiler Toggle Button */}
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
              style={styles.clearButton}
              onClick={clearOutput}
              disabled={isCompiling}
            >
              <i className="fas fa-trash" style={styles.actionIcon}></i>
              Clear
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
    backgroundColor: '#1e1e1e',
    color: '#fff',
    fontFamily: 'Arial, sans-serif',
    position: 'relative',
  },
  sidebar: {
    width: '250px',
    backgroundColor: '#252526',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid rgba(255,255,255,0.1)',
  },
  logoContainer: {
    padding: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  logo: {
    width: '40px',
    height: '40px',
    marginBottom: '12px',
  },
  roomIndicator: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '12px',
  },
  roomLabel: {
    fontSize: '12px',
    color: '#aaa',
    marginBottom: '4px',
  },
  roomId: {
    fontSize: '14px',
    fontWeight: 'bold',
  },
  connectionStatus: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '8px',
  },
  membersContainer: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionIcon: {
    marginRight: '8px',
    color: '#aaa',
  },
  sectionTitle: {
    margin: '0',
    fontSize: '14px',
    flex: 1,
  },
  memberCount: {
    backgroundColor: '#007acc',
    borderRadius: '8px',
    padding: '2px 6px',
    fontSize: '12px',
  },
  membersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sidebarButtons: {
    padding: '16px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  copyButton: {
    backgroundColor: '#007acc',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveButton: {
    backgroundColor: '#d32f2f',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: '8px',
  },
  editorArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  toolbar: {
    padding: '8px 16px',
    backgroundColor: '#2d2d30',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  languageSelector: {
    display: 'flex',
    alignItems: 'center',
  },
  selectorIcon: {
    marginRight: '8px',
    color: '#aaa',
  },
  languageSelect: {
    backgroundColor: '#3e3e42',
    color: 'white',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  option: {
    backgroundColor: '#3e3e42',
  },
  compilerToggle: {
    position: 'absolute',
    bottom: '0',
    right: '0',
    margin: '16px',
    backgroundColor: '#007acc',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    zIndex: 10,
  },
  toggleIcon: {
    marginRight: '8px',
  },
  compilerPanel: {
    position: 'absolute',
    bottom: '0',
    left: '0',
    right: '0',
    backgroundColor: '#1e1e1e',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
  },
  compilerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  outputHeader: {
    display: 'flex',
    alignItems: 'center',
  },
  outputIcon: {
    marginRight: '8px',
    color: '#4CAF50',
  },
  compilerTitle: {
    margin: '0',
    fontSize: '14px',
  },
  statusIndicator: {
    color: '#FFC107',
    fontSize: '12px',
  },
  compilerActions: {
    display: 'flex',
    gap: '8px',
  },
  runButton: {
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  runButtonDisabled: {
    backgroundColor: '#81C784',
    cursor: 'not-allowed',
  },
  clearButton: {
    backgroundColor: '#F44336',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: '#9E9E9E',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  actionIcon: {
    marginRight: '6px',
  },
  output: {
    flex: 1,
    backgroundColor: '#2d2d30',
    padding: '12px',
    borderRadius: '4px',
    overflow: 'auto',
    margin: '0',
    whiteSpace: 'pre-wrap',
    fontSize: '14px',
    fontFamily: 'monospace',
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#aaa',
  },
  placeholderIcon: {
    fontSize: '24px',
    marginBottom: '8px',
  },
};

export default EditorPage;
