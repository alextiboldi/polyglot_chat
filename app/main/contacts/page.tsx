"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface ChatUser {
  id: string;
  first_name: string;
  last_name: string;
}

interface Chat {
  id: string;
  connection_id: string;
  last_message: string | null;
  last_message_at: string | null;
  user: ChatUser;
}

export default function Contacts() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch all connections and their associated chats
        const { data: connections, error: connectionsError } = await supabase
          .from("connections")
          .select(
            `
            id,
            user1_id,
            user2_id,
            chats (
              id,
              last_message,
              last_message_at
            ),
            user1:profiles!connections_user1_id_fkey (
              id,
              first_name,
              last_name
            ),
            user2:profiles!connections_user2_id_fkey (
              id,
              first_name,
              last_name
            )
          `
          )
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

        if (connectionsError) throw connectionsError;

        // Transform the data to get a flat list of chats with user info
        const formattedChats =
          connections?.map((conn) => {
            const otherUser =
              conn.user1_id === user.id ? conn.user2[0] : conn.user1[0];
            const chat = conn.chats[0]; // We know there's only one chat per connection

            return {
              id: chat.id,
              connection_id: conn.id,
              last_message: chat.last_message,
              last_message_at: chat.last_message_at,
              user: otherUser,
            };
          }) || [];

        setChats(formattedChats);
      } catch (error) {
        console.error("Error fetching chats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto">
          <p className="text-center text-gray-500">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Contacts</h1>

        <div className="space-y-2">
          {chats.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              No contacts yet. Connect with others by scanning their QR code!
            </p>
          ) : (
            chats.map((chat) => (
              <Link
                key={chat.id}
                href={`/chat/${chat.id}`}
                className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {chat.user.first_name} {chat.user.last_name}
                    </h2>
                    {chat.last_message_at && (
                      <span className="text-sm text-gray-500">
                        {new Date(chat.last_message_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {chat.last_message && (
                    <p className="text-gray-600 text-sm mt-1 truncate">
                      {chat.last_message}
                    </p>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
