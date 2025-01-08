"use client";

import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { TranslateBox } from "@/components/TranslateBox";

interface ChatUser {
  id: string;
  first_name: string;
  last_name: string;
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [otherUser, setOtherUser] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { id } = use(params);
  useEffect(() => {
    const fetchChatDetails = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch chat and connection details
        const { data: chat, error: chatError } = await supabase
          .from("chats")
          .select(
            `
            connection_id,
            connections (
              user1_id,
              user2_id,
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
            )
          `
          )
          .eq("id", id)
          .single();

        if (chatError) throw chatError;

        // Determine which user is the other user
        const connection = chat.connections[0];
        const otherUser =
          connection.user1_id === user.id
            ? connection.user2[0]
            : connection.user1[0];

        setOtherUser(otherUser);
      } catch (error) {
        console.error("Error fetching chat details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChatDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto">
          <p className="text-center text-gray-500">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!otherUser) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto">
          <p className="text-center text-gray-500">Chat not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-lg shadow-sm mb-4">
          <div className="p-4 border-b">
            <h1 className="text-xl font-semibold text-gray-900">
              {otherUser.first_name} {otherUser.last_name}
            </h1>
          </div>
        </div>

        <div className="space-y-4">
          <TranslateBox isSource={true} placeholder="Type your message..." />
          <TranslateBox isSource={false} placeholder="" />
        </div>
      </div>
    </div>
  );
}
