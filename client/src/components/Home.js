import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");

  const navigate = useNavigate();

  const generateRoomId = (e) => {
    e.preventDefault();
    const Id = uuid();
    setRoomId(Id);
    toast.success("Room ID generated");
  };

  const joinRoom = () => {
    if (!roomId || !username) {
      toast.error("Both fields are required");
      return;
    }
    navigate(`/editor/${roomId}`, { state: { username } });
    toast.success("Room created successfully");
  };

  const handleInputEnter = (e) => {
    if (e.code === "Enter") joinRoom();
  };

  return (
    <div style={styles.container}>
      <div style={styles.glassCard}>
        <div style={styles.logoContainer}>
          <img 
            src="/images/codecast.png" 
            alt="CodeCast Logo" 
            style={styles.logo} 
          />
        </div>
        
        <h2 style={styles.title}>CodeSync</h2>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Room ID</label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            style={styles.input}
            placeholder="Enter Room ID"
            onKeyUp={handleInputEnter}
          />
        </div>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            placeholder="Your Name"
            onKeyUp={handleInputEnter}
          />
        </div>
        
        <button onClick={joinRoom} style={styles.primaryButton}>
          Join Room
        </button>
        
        <div style={styles.footer}>
          <span style={styles.footerText}>No room ID? </span>
          <button onClick={generateRoomId} style={styles.linkButton}>
            Create New Room
          </button>
        </div>
      </div>
      
      {/* Animated background elements */}
      <div style={styles.circle1}></div>
      <div style={styles.circle2}></div>
      <div style={styles.circle3}></div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    position: 'relative',
    overflow: 'hidden',
    padding: '20px',
  },
  glassCard: {
    width: '100%',
    maxWidth: '420px',
    padding: '40px',
    borderRadius: '16px',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.2)',
    zIndex: '1',
  },
  logoContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  logo: {
    height: '80px',
    filter: 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.4))',
  },
  title: {
    color: '#e2e8f0',
    fontSize: '24px',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: '32px',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    color: '#94a3b8',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    color: '#f8fafc',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.3s ease',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
  },
  inputFocus: {
    borderColor: '#60a5fa',
    boxShadow: '0 0 0 3px rgba(96, 165, 250, 0.3)',
  },
  primaryButton: {
    width: '100%',
    padding: '14px',
    borderRadius: '8px',
    backgroundColor: '#3b82f6',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '8px',
    boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3), 0 2px 4px -1px rgba(59, 130, 246, 0.2)',
  },
  primaryButtonHover: {
    backgroundColor: '#2563eb',
    transform: 'translateY(-1px)',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '14px',
  },
  footerText: {
    opacity: '0.8',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#60a5fa',
    cursor: 'pointer',
    fontWeight: '600',
    padding: '0',
    marginLeft: '4px',
    transition: 'all 0.2s ease',
  },
  linkButtonHover: {
    color: '#93c5fd',
    textDecoration: 'underline',
  },
  circle1: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(96, 165, 250, 0.15) 0%, rgba(96, 165, 250, 0) 70%)',
    top: '-100px',
    left: '-100px',
    zIndex: '0',
  },
  circle2: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0) 70%)',
    bottom: '-150px',
    right: '-100px',
    zIndex: '0',
  },
  circle3: {
    position: 'absolute',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0) 70%)',
    top: '50%',
    left: '20%',
    zIndex: '0',
  },
};

export default Home;