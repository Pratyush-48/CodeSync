import React from 'react';

function Client({ username }) {
  // Generate a random but deterministic avatar based on the username
  const avatarUrl = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(username)}`;

  return (
    <div className="d-flex align-items-center mb-3">
      <img
        src={avatarUrl}
        alt={username}
        width={30}
        height={30}
        style={{ 
          //borderRadius: '14px', 
          marginRight: '16px',
          objectFit: 'cover', 
        }}
      />
      <span className="mx-2">{username}</span>
    </div>
  );
}

export default Client;