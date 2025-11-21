export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash?: string; // Not returned to client
  name: string;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
}

export interface FriendRequestWithUser extends FriendRequest {
  senderUsername?: string;
  senderName?: string;
  senderImageUrl?: string | null;
  receiverUsername?: string;
  receiverName?: string;
  receiverImageUrl?: string | null;
}

export interface Friend {
  userId: string;
  friendId: string;
  friendUsername: string;
  friendName: string;
  friendImageUrl: string | null;
  friendEmail: string;
  becameFriendsAt: Date;
}
